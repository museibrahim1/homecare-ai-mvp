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
        plans = db.query(Plan).order_by(Plan.monthly_price).all()
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

    PLANS = [
        {
            "name": "Starter",
            "tier": PlanTier.STARTER,
            "description": "For small agencies getting started with AI-powered documentation",
            "monthly_price": 89.99,
            "annual_price": 899,
            "setup_fee": 0,
            "max_users": 5,
            "max_clients": 25,
            "max_visits_per_month": 5,
            "max_storage_gb": 5,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "5 assessments/month", "5 team members",
                "AI voice-to-contract", "Smart SOAP notes",
                "Basic reporting", "Email support", "5 GB storage",
                "$13/extra assessment",
            ]),
        },
        {
            "name": "Growth",
            "tier": PlanTier.GROWTH,
            "description": "For growing agencies scaling their documentation workflow",
            "monthly_price": 179.99,
            "annual_price": 1799,
            "setup_fee": 0,
            "max_users": 15,
            "max_clients": 100,
            "max_visits_per_month": 25,
            "max_storage_gb": 15,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "25 assessments/month", "15 team members",
                "AI voice-to-contract", "Smart SOAP notes",
                "Advanced analytics & reporting", "Priority support",
                "15 GB storage", "Custom contract templates",
                "Team management", "$13/extra assessment",
            ]),
        },
        {
            "name": "Professional",
            "tier": PlanTier.PROFESSIONAL,
            "description": "For established agencies that need maximum capacity",
            "monthly_price": 299.99,
            "annual_price": 2999,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 500,
            "max_visits_per_month": 75,
            "max_storage_gb": 50,
            "is_contact_sales": False,
            "is_active": True,
            "features": json.dumps([
                "75 assessments/month", "Unlimited team members",
                "AI voice-to-contract", "Smart SOAP notes",
                "Advanced analytics & dashboards", "Priority support",
                "50 GB storage", "Custom contract templates",
                "Team management", "50-state compliance engine",
                "$13/extra assessment",
            ]),
        },
        {
            "name": "Enterprise",
            "tier": PlanTier.ENTERPRISE,
            "description": "For large agencies with custom requirements and dedicated support",
            "monthly_price": 0,
            "annual_price": 0,
            "setup_fee": 0,
            "max_users": 999,
            "max_clients": 9999,
            "max_visits_per_month": 99999,
            "max_storage_gb": 999,
            "is_contact_sales": True,
            "is_active": True,
            "features": json.dumps([
                "Unlimited assessments", "Unlimited team members",
                "AI voice-to-contract", "Smart SOAP notes",
                "Custom analytics & dashboards", "Dedicated account manager",
                "Unlimited storage", "Custom integrations",
                "HIPAA BAA included", "On-site training",
                "SLA guarantee", "No overage fees",
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

