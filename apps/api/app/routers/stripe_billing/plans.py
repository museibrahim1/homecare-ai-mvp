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

    # Prices match Apple's App Store price points exactly. Annual = at least
    # 20% off monthly (Enterprise Annual is capped at Apple's $10,000 max,
    # which works out to ~30% off). All paid tiers except Enterprise include
    # a 14 day free trial (granted through Apple IAP introductory offers).
    PLANS = [
        {
            "name": "Starter",
            "tier": PlanTier.STARTER,
            "description": (
                "For solo owners and small agencies signing their first contracts "
                "with AI. Record the visit and PALM writes the notes, the billables, "
                "and a state compliant service agreement in minutes. Includes a "
                "14 day free trial."
            ),
            "monthly_price": 199,
            "annual_price": 1899.99,
            "setup_fee": 0,
            "max_users": 5,
            "max_clients": 50,
            "max_visits_per_month": 20,
            "max_storage_gb": 10,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "20 AI assessments a month", "5 team members",
                "AI voice to contract", "Smart SOAP notes",
                "Basic reporting", "Email support", "10 GB storage",
                "14 day free trial",
            ]),
        },
        {
            "name": "Growth",
            "tier": PlanTier.GROWTH,
            "description": (
                "For agencies building a steady client pipeline. Everything in "
                "Starter plus advanced analytics, custom contract templates, and "
                "priority support so your team closes contracts faster. Includes "
                "a 14 day free trial."
            ),
            "monthly_price": 699,
            "annual_price": 6699.99,
            "setup_fee": 0,
            "max_users": 20,
            "max_clients": 200,
            "max_visits_per_month": 75,
            "max_storage_gb": 50,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "75 AI assessments a month", "20 team members",
                "Advanced analytics and reporting", "Custom contract templates",
                "Team management", "Priority support", "50 GB storage",
                "14 day free trial",
            ]),
        },
        {
            # Legacy tier kept for existing rows; superseded by Enterprise.
            "name": "Professional",
            "tier": PlanTier.PROFESSIONAL,
            "description": "Legacy plan, replaced by Enterprise.",
            "monthly_price": 999.99,
            "annual_price": 9599,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 500,
            "max_visits_per_month": 75,
            "max_storage_gb": 50,
            "is_contact_sales": False,
            "is_active": False,
            "features": json.dumps([]),
        },
        {
            "name": "Enterprise",
            "tier": PlanTier.ENTERPRISE,
            "description": (
                "For established agencies running at scale. Unlimited assessments, "
                "unlimited team members, a dedicated account manager, and the full "
                "50 state compliance engine."
            ),
            "monthly_price": 1199.99,
            "annual_price": 10000,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 250,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "Unlimited AI assessments", "Unlimited team members",
                "Dedicated account manager", "50 state compliance engine",
                "Custom analytics and dashboards", "HIPAA BAA included",
                "SLA guarantee", "250 GB storage",
            ]),
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

