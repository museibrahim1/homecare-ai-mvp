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
# WEBHOOKS
# =============================================================================

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """Handle Stripe webhook events."""
    if not STRIPE_AVAILABLE or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhooks not configured")
    
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle events
    event_type = event["type"]
    data = event["data"]["object"]
    
    logger.info(f"Stripe webhook: {event_type}")
    
    if event_type == "checkout.session.completed":
        await handle_checkout_completed(data, db)
    
    elif event_type == "customer.subscription.updated":
        await handle_subscription_updated(data, db)
    
    elif event_type == "customer.subscription.deleted":
        await handle_subscription_deleted(data, db)
    
    elif event_type == "invoice.paid":
        await handle_invoice_paid(data, db)
    
    elif event_type == "invoice.payment_failed":
        await handle_payment_failed(data, db)
    
    return {"status": "success"}


async def handle_checkout_completed(data: dict, db: Session):
    """Handle successful checkout (both signup trials and direct purchases)."""
    from datetime import timedelta

    metadata = data.get("metadata", {})
    plan_id = metadata.get("plan_id")
    business_id = metadata.get("business_id")
    billing_cycle = metadata.get("billing_cycle", "monthly")
    trial_type = metadata.get("trial_type")

    if not plan_id:
        logger.error("No plan_id in checkout metadata")
        return

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        logger.error(f"Plan not found: {plan_id}")
        return

    if business_id:
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()

        if not subscription:
            subscription = Subscription(business_id=business_id)
            db.add(subscription)

        subscription.plan_id = plan.id
        subscription.billing_cycle = billing_cycle
        subscription.stripe_customer_id = data.get("customer")
        subscription.stripe_subscription_id = data.get("subscription")
        subscription.current_period_start = datetime.now(timezone.utc)

        stripe_sub = data.get("subscription")
        if stripe_sub and STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
            try:
                sub_obj = stripe.Subscription.retrieve(stripe_sub)
                if sub_obj.get("status") == "trialing":
                    trial_days = 30 if trial_type == "extended" else 14
                    subscription.status = SubscriptionStatus.TRIAL
                    subscription.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=trial_days)
                    subscription.current_period_end = subscription.trial_ends_at
                else:
                    subscription.status = SubscriptionStatus.ACTIVE
            except Exception as e:
                logger.warning(f"Could not fetch Stripe subscription status: {e}")
                subscription.status = SubscriptionStatus.TRIAL if trial_type else SubscriptionStatus.ACTIVE
        else:
            subscription.status = SubscriptionStatus.TRIAL if trial_type else SubscriptionStatus.ACTIVE

        db.commit()
        logger.info(f"Subscription created/updated for business {business_id} (trial_type={trial_type})")


async def handle_subscription_updated(data: dict, db: Session):
    """Handle subscription update."""
    stripe_sub_id = data.get("id")
    status = data.get("status")
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()
    
    if subscription:
        # Map Stripe status to our status
        status_map = {
            "active": SubscriptionStatus.ACTIVE,
            "past_due": SubscriptionStatus.PAST_DUE,
            "canceled": SubscriptionStatus.CANCELLED,
            "unpaid": SubscriptionStatus.PAST_DUE,
            "trialing": SubscriptionStatus.TRIAL,
        }
        
        subscription.status = status_map.get(status, SubscriptionStatus.ACTIVE)
        db.commit()
        logger.info(f"Subscription {stripe_sub_id} updated to {status}")


async def handle_subscription_deleted(data: dict, db: Session):
    """Handle subscription cancellation."""
    stripe_sub_id = data.get("id")
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus.CANCELLED
        subscription.cancelled_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"Subscription {stripe_sub_id} cancelled")


async def handle_invoice_paid(data: dict, db: Session):
    """Handle successful payment."""
    customer_id = data.get("customer")
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus.ACTIVE
        # Reset usage counter if needed
        subscription.visits_this_month = 0
        db.commit()
        logger.info(f"Invoice paid for customer {customer_id}")


async def handle_payment_failed(data: dict, db: Session):
    """Handle failed payment."""
    customer_id = data.get("customer")
    
    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()
    
    if subscription:
        subscription.status = SubscriptionStatus.PAST_DUE
        db.commit()
        logger.info(f"Payment failed for customer {customer_id}")
