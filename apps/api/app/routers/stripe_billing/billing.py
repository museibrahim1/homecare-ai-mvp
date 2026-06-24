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
    RETENTION_COUPON_ID, RETENTION_OFFER_HEADLINE, RETENTION_OFFER_SUBTEXT,
)
from .schemas import (
    CreateCheckoutRequest, SignupCheckoutRequest, CheckoutResponse,
    PortalRequest, StripePriceConfig,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# USER-FACING BILLING ENDPOINTS
# =============================================================================

@router.get("/subscription")
async def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's subscription, plan, and usage."""
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email
    ).first()

    if not business_user:
        return {"subscription": None, "plan": None}

    subscription = db.query(Subscription).filter(
        Subscription.business_id == business_user.business_id
    ).first()

    if not subscription:
        return {"subscription": None, "plan": None}

    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()

    return {
        "subscription": {
            "id": str(subscription.id),
            "status": subscription.status.value if hasattr(subscription.status, 'value') else subscription.status,
            "billing_cycle": subscription.billing_cycle,
            "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
            "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
            "trial_ends_at": subscription.trial_ends_at.isoformat() if subscription.trial_ends_at else None,
            "cancelled_at": subscription.cancelled_at.isoformat() if subscription.cancelled_at else None,
            "stripe_customer_id": subscription.stripe_customer_id,
            "stripe_subscription_id": subscription.stripe_subscription_id,
            "visits_this_month": subscription.visits_this_month or 0,
            "storage_used_mb": subscription.storage_used_mb or 0,
            "business_id": str(subscription.business_id),
        },
        "plan": {
            "id": str(plan.id),
            "name": plan.name,
            "tier": plan.tier.value if hasattr(plan.tier, 'value') else plan.tier,
            "monthly_price": float(plan.monthly_price) if plan.monthly_price else 0,
            "annual_price": float(plan.annual_price) if plan.annual_price else 0,
            "max_users": plan.max_users,
            "max_clients": plan.max_clients,
            "max_visits_per_month": plan.max_visits_per_month,
            "max_storage_gb": plan.max_storage_gb,
            "features": plan.features,
        } if plan else None,
    }


def _get_user_subscription(db: Session, current_user: User):
    """Resolve the current user's Subscription via their business, or None."""
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email
    ).first()
    if not business_user:
        return None
    return db.query(Subscription).filter(
        Subscription.business_id == business_user.business_id
    ).first()


@router.get("/retention-offer")
async def get_retention_offer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the save-offer to show before a user cancels.

    `available` is False if the offer isn't configured or was already redeemed,
    in which case the client should go straight to the cancel/portal flow.
    """
    if not (STRIPE_AVAILABLE and STRIPE_SECRET_KEY and RETENTION_COUPON_ID):
        return {"available": False}

    subscription = _get_user_subscription(db, current_user)
    if not subscription or not subscription.stripe_subscription_id:
        return {"available": False}

    # One save-offer per subscription — tracked in Stripe metadata (no DB change).
    try:
        stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
        if (stripe_sub.get("metadata") or {}).get("retention_offer_used") == "true":
            return {"available": False}
    except stripe.error.StripeError:
        return {"available": False}

    return {
        "available": True,
        "headline": RETENTION_OFFER_HEADLINE,
        "subtext": RETENTION_OFFER_SUBTEXT,
    }


@router.post("/retention-offer")
async def accept_retention_offer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply the retention coupon to the user's subscription (one-time)."""
    if not (STRIPE_AVAILABLE and STRIPE_SECRET_KEY and RETENTION_COUPON_ID):
        raise HTTPException(status_code=503, detail="Retention offer not available")

    subscription = _get_user_subscription(db, current_user)
    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found")

    try:
        stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
        if (stripe_sub.get("metadata") or {}).get("retention_offer_used") == "true":
            raise HTTPException(status_code=409, detail="Offer already redeemed")

        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            coupon=RETENTION_COUPON_ID,
            metadata={**(stripe_sub.get("metadata") or {}), "retention_offer_used": "true"},
        )
    except stripe.error.StripeError as e:
        logger.error(f"Failed to apply retention offer: {e}")
        raise HTTPException(status_code=500, detail="Could not apply offer")

    logger.info(f"Retention offer applied for business {subscription.business_id}")
    return {"applied": True, "message": "Discount applied to your next 3 months."}


@router.get("/invoices")
async def get_my_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's invoice history."""
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email
    ).first()

    if not business_user:
        return {"invoices": []}

    invoices = db.query(Invoice).filter(
        Invoice.business_id == business_user.business_id
    ).order_by(Invoice.invoice_date.desc()).limit(50).all()

    return {
        "invoices": [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "amount": float(inv.amount) if inv.amount else 0,
                "currency": inv.currency or "USD",
                "status": inv.status,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "description": inv.description,
                "stripe_invoice_id": inv.stripe_invoice_id,
            }
            for inv in invoices
        ]
    }
