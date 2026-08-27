import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.internal_auth import require_internal_key
from app.models.subscription import Plan, PlanTier

from .common import STRIPE_PRICE_MAP

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get("/plans")
async def get_public_plans(db: Session = Depends(get_db)):
    """Get all active plans (public endpoint for pricing page)."""
    try:
        from app.models.subscription import PlanTier

        plans = (
            db.query(Plan)
            .filter(
                Plan.is_active.is_(True),
                Plan.tier.in_([PlanTier.MOBILE, PlanTier.STARTER, PlanTier.ENTERPRISE]),
            )
            .order_by(Plan.monthly_price)
            .all()
        )
    except Exception as e:
        logger.error(f"Plans query error: {type(e).__name__}: {e}")
        return []

    result = []
    for p in plans:
        try:
            result.append({
                "id": str(p.id),
                "name": p.name,
                "tier": p.tier.value if hasattr(p.tier, "value") else str(p.tier),
                "description": p.description,
                "monthly_price": float(p.monthly_price) if p.monthly_price else 0,
                "annual_price": float(p.annual_price) if p.annual_price else 0,
                "setup_fee": float(p.setup_fee) if p.setup_fee else 0,
                "max_users": p.max_users,
                "is_contact_sales": p.is_contact_sales or False,
                "features": p.features,
            })
        except Exception as e:
            logger.error(f"Plan serialization error for {getattr(p, 'name', '?')}: {e}")

    return result




@router.post("/plans/seed")
async def seed_plans(request: Request, db: Session = Depends(get_db)):
    """Seed default pricing plans if they don't exist. Idempotent.

    Internal/ops only — overwrites platform pricing, so it must never be
    callable anonymously.
    """
    require_internal_key(request)
    from app.models.subscription import PlanTier
    import json

    # Two self-serve plans + Enterprise quote:
    # Mobile ($89.99, lite CRM) and Platform ($199.99, higher caps).
    # Apple IAP product IDs must match apple_iap.py.
    MOBILE_FEATURES = json.dumps([
        "15 AI assessments per month", "Lite web CRM (30 clients)",
        "AI voice to contract", "Smart SOAP notes and billables",
        "50 state compliance engine", "HIPAA BAA included",
        "iPhone app access", "30 day free trial",
    ])
    PLATFORM_FEATURES = json.dumps([
        "30 AI assessments per month", "Web CRM (150 clients)",
        "Everything in Mobile", "Team seats and pipeline",
        "Custom contract templates", "Priority support", "250 GB storage",
        "30 day free trial",
    ])
    ENTERPRISE_FEATURES = json.dumps([
        "Everything in Platform", "Custom assessment and client caps",
        "SSO and advanced admin controls", "Dedicated success manager",
        "Volume and formula pricing",
    ])
    PLANS = [
        {
            "name": "PalmCare Mobile",
            "tier": PlanTier.MOBILE,
            "description": (
                "Assessments plus lite web CRM. 15 assessments and 30 clients "
                "per month."
            ),
            "monthly_price": 89.99,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 1,
            "max_clients": 30,
            "max_visits_per_month": 15,
            "max_storage_gb": 50,
            "is_contact_sales": False,
            "is_active": True,
            "features": MOBILE_FEATURES,
        },
        {
            "name": "PalmCare Platform",
            "tier": PlanTier.STARTER,
            "description": (
                "Full platform CRM with team seats. 30 assessments and 150 "
                "clients per month. Includes a 30 day free trial."
            ),
            "monthly_price": 199.99,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 150,
            "max_visits_per_month": 30,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": True,
            "stripe_product_id": STRIPE_PRICE_MAP["starter"]["product_id"],
            "stripe_price_id_monthly": STRIPE_PRICE_MAP["starter"]["monthly"],
            "stripe_price_id_annual": STRIPE_PRICE_MAP["starter"]["annual"],
            "features": PLATFORM_FEATURES,
        },
        {
            "name": "Growth",
            "tier": PlanTier.GROWTH,
            "description": "Legacy plan. Replaced by PalmCare Platform.",
            "monthly_price": 199,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": False,
            "features": PLATFORM_FEATURES,
        },
        {
            "name": "Professional",
            "tier": PlanTier.PROFESSIONAL,
            "description": "Legacy plan. Replaced by Enterprise quote.",
            "monthly_price": 0,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": True,
            "is_active": False,
            "features": ENTERPRISE_FEATURES,
        },
        {
            "name": "Enterprise",
            "tier": PlanTier.ENTERPRISE,
            "description": "Custom formula pricing and features. Request a quote.",
            "monthly_price": 0,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 9999,
            "max_clients": 99999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 1000,
            "is_contact_sales": True,
            "is_active": True,
            "features": ENTERPRISE_FEATURES,
        },
    ]

    created = 0
    for plan_data in PLANS:
        existing = db.query(Plan).filter(Plan.tier == plan_data["tier"]).first()
        if existing:
            for k, v in plan_data.items():
                setattr(existing, k, v)
        else:
            plan = Plan(**plan_data)
            db.add(plan)
            created += 1

    db.commit()
    return {"created": created, "updated": len(PLANS) - created}

