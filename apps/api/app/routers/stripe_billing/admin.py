import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.business import Business, BusinessUser
from app.models.subscription import Plan, Subscription, SubscriptionStatus, Invoice

from .common import (
    stripe, STRIPE_AVAILABLE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
    STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, EXTENDED_TRIAL_PRICE_ID, STRIPE_PRICE_MAP,
)
from .schemas import (
    CreateCheckoutRequest, SignupCheckoutRequest, CheckoutResponse,
    PortalRequest, StripePriceConfig,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# ADMIN: UPDATE STRIPE IDS
# =============================================================================

@router.put("/plans/{plan_id}/stripe")
async def update_plan_stripe_config(
    plan_id: UUID,
    config: StripePriceConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update Stripe price IDs for a plan (admin only).
    
    To set up in Stripe Dashboard:
    1. Create a Product for each plan (Growth, Pro, Enterprise)
    2. Create Price objects:
       - Monthly recurring price
       - Annual recurring price (with 10% discount)
       - One-time setup fee price
    3. Copy the IDs here
    
    Example Stripe IDs:
    - Product: prod_xxxxxxxxxxxxx
    - Monthly Price: price_xxxxxxxxxxxxx
    - Annual Price: price_xxxxxxxxxxxxx
    - Setup Fee Price: price_xxxxxxxxxxxxx
    """
    # Check admin
    if (current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Update Stripe IDs
    if config.stripe_product_id is not None:
        plan.stripe_product_id = config.stripe_product_id
    if config.stripe_price_id_monthly is not None:
        plan.stripe_price_id_monthly = config.stripe_price_id_monthly
    if config.stripe_price_id_annual is not None:
        plan.stripe_price_id_annual = config.stripe_price_id_annual
    if config.stripe_price_id_setup is not None:
        plan.stripe_price_id_setup = config.stripe_price_id_setup
    
    db.commit()
    
    return {
        "message": "Stripe configuration updated",
        "plan_id": str(plan.id),
        "stripe_product_id": plan.stripe_product_id,
        "stripe_price_id_monthly": plan.stripe_price_id_monthly,
        "stripe_price_id_annual": plan.stripe_price_id_annual,
        "stripe_price_id_setup": plan.stripe_price_id_setup,
    }


@router.get("/plans/{plan_id}/stripe")
async def get_plan_stripe_config(
    plan_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get Stripe configuration for a plan (admin only)."""
    if (current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {
        "plan_id": str(plan.id),
        "plan_name": plan.name,
        "stripe_product_id": plan.stripe_product_id,
        "stripe_price_id_monthly": plan.stripe_price_id_monthly,
        "stripe_price_id_annual": plan.stripe_price_id_annual,
        "stripe_price_id_setup": plan.stripe_price_id_setup,
        "monthly_price": float(plan.monthly_price) if plan.monthly_price else 0,
        "annual_price": float(plan.annual_price) if plan.annual_price else 0,
        "setup_fee": float(plan.setup_fee) if plan.setup_fee else 0,
    }


@router.get("/signup-stats")
async def get_signup_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get signup analytics: total signups, by source, trial vs paid, etc."""
    if (current_user.role.value if hasattr(current_user.role, 'value') else current_user.role) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.models.audit_log import AuditLog
    from sqlalchemy import func

    total_businesses = db.query(func.count(Business.id)).scalar() or 0
    total_subscriptions = db.query(func.count(Subscription.id)).scalar() or 0
    trial_count = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "trial"
    ).scalar() or 0
    active_count = db.query(func.count(Subscription.id)).filter(
        Subscription.status == "active"
    ).scalar() or 0

    signups = db.query(AuditLog).filter(
        AuditLog.action == "business_registered"
    ).order_by(AuditLog.created_at.desc()).limit(50).all()

    source_counts: dict = {}
    for s in signups:
        src = (s.changes or {}).get("signup_source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    return {
        "total_businesses": total_businesses,
        "total_subscriptions": total_subscriptions,
        "trial": trial_count,
        "active_paid": active_count,
        "signups_by_source": source_counts,
        "recent_signups": [
            {
                "description": s.description,
                "source": (s.changes or {}).get("signup_source"),
                "plan": (s.changes or {}).get("selected_plan"),
                "date": s.created_at.isoformat() if s.created_at else None,
            }
            for s in signups[:20]
        ],
    }
