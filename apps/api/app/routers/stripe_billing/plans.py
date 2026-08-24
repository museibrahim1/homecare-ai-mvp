import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.internal_auth import require_internal_key
from app.models.subscription import Plan

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get("/plans")
async def get_public_plans(db: Session = Depends(get_db)):
    """Get all active plans (public endpoint for pricing page)."""
    try:
        plans = (
            db.query(Plan)
            .filter(Plan.is_active.is_(True))
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

    # Two active plans: Mobile ($80, iPhone assessments) and Platform ($199,
    # full web + mobile). Apple IAP product IDs must match apple_iap.py.
    MOBILE_FEATURES = json.dumps([
        "Unlimited AI assessments on iPhone", "AI voice to contract",
        "Smart SOAP notes and billables", "50 state compliance engine",
        "HIPAA BAA included", "iPhone app access", "30 day free trial",
    ])
    UNLIMITED_FEATURES = json.dumps([
        "Unlimited AI assessments", "Unlimited team members",
        "AI voice to contract", "Smart SOAP notes",
        "Advanced analytics and reporting", "Custom contract templates",
        "50 state compliance engine", "HIPAA BAA included",
        "Priority support", "250 GB storage", "30 day free trial",
    ])
    PLANS = [
        {
            "name": "PalmCare Mobile",
            "tier": PlanTier.MOBILE,
            "description": (
                "Assessments on iPhone. Record the visit and PALM writes the "
                "notes, billables, and a state compliant service agreement."
            ),
            "monthly_price": 80,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 1,
            "max_clients": 50,
            "max_visits_per_month": 99999,
            "max_storage_gb": 50,
            "is_contact_sales": False,
            "is_active": True,
            "features": MOBILE_FEATURES,
        },
        {
            "name": "PalmCare Platform",
            "tier": PlanTier.STARTER,
            "description": (
                "Full platform: web CRM, team seats, analytics, and unlimited "
                "assessments on iPhone and web. Includes a 30 day free trial."
            ),
            "monthly_price": 199,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": True,
            "features": UNLIMITED_FEATURES,
        },
        {
            # Legacy tier kept inactive for existing rows.
            "name": "Growth",
            "tier": PlanTier.GROWTH,
            "description": "Legacy plan, replaced by the single PalmCare AI plan.",
            "monthly_price": 199,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": False,
            "features": UNLIMITED_FEATURES,
        },
        {
            # Legacy tier kept inactive for existing rows.
            "name": "Professional",
            "tier": PlanTier.PROFESSIONAL,
            "description": "Legacy plan, replaced by the single PalmCare AI plan.",
            "monthly_price": 199,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": False,
            "features": UNLIMITED_FEATURES,
        },
        {
            # Legacy tier kept inactive for existing rows.
            "name": "Enterprise",
            "tier": PlanTier.ENTERPRISE,
            "description": "Legacy plan, replaced by the single PalmCare AI plan.",
            "monthly_price": 199,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": False,
            "features": UNLIMITED_FEATURES,
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

