"""Stripe webhook handlers.

These are the source of truth for web subscriptions: checkout completion,
renewals, payment failures, and cancellations all land here and update the
local Subscription row. Feature gating (plan_access, tier_limits, visits)
reads that row, so a correct webhook is what actually unlocks the product
after payment.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.subscription import Plan, Subscription, SubscriptionStatus

from .common import stripe, STRIPE_AVAILABLE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

logger = logging.getLogger(__name__)

router = APIRouter()


def _ts_to_dt(value) -> Optional[datetime]:
    """Stripe epoch-seconds timestamp → aware datetime (None-safe)."""
    if isinstance(value, (int, float)) and value > 0:
        return datetime.fromtimestamp(value, tz=timezone.utc)
    return None


def _subscription_period_end(sub_obj: dict) -> Optional[datetime]:
    """
    Read the current period end from a Stripe Subscription object.

    Newer Stripe API versions moved current_period_end from the subscription
    to its items, so check both places.
    """
    end = _ts_to_dt(sub_obj.get("current_period_end"))
    if end:
        return end
    items = (sub_obj.get("items") or {}).get("data") or []
    if items:
        return _ts_to_dt(items[0].get("current_period_end"))
    return None


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """Handle Stripe webhook events (signature-verified)."""
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
    """Grant (or update) the business subscription after a completed checkout."""
    metadata = data.get("metadata", {}) or {}
    plan_id = metadata.get("plan_id")
    business_id = metadata.get("business_id")
    billing_cycle = metadata.get("billing_cycle", "monthly")

    if not plan_id or not business_id:
        logger.error("checkout.session.completed missing plan_id/business_id metadata")
        return

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        logger.error(f"Plan not found: {plan_id}")
        return

    subscription = db.query(Subscription).filter(
        Subscription.business_id == business_id
    ).first()
    if not subscription:
        subscription = Subscription(business_id=business_id, plan_id=plan.id)
        db.add(subscription)

    stripe_sub_id = data.get("subscription")
    if isinstance(stripe_sub_id, dict):
        stripe_sub_id = stripe_sub_id.get("id")

    subscription.plan_id = plan.id
    subscription.billing_cycle = billing_cycle
    subscription.stripe_customer_id = data.get("customer")
    subscription.stripe_subscription_id = stripe_sub_id
    subscription.current_period_start = datetime.now(timezone.utc)
    subscription.cancelled_at = None

    # Pull the authoritative status + period boundaries from Stripe.
    status = SubscriptionStatus.ACTIVE
    if stripe_sub_id and STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
        try:
            sub_obj = stripe.Subscription.retrieve(stripe_sub_id)
            period_end = _subscription_period_end(sub_obj)
            if period_end:
                subscription.current_period_end = period_end
            if sub_obj.get("status") == "trialing":
                status = SubscriptionStatus.TRIAL
                subscription.trial_ends_at = _ts_to_dt(sub_obj.get("trial_end")) or period_end
        except Exception as e:
            logger.warning(f"Could not fetch Stripe subscription {stripe_sub_id}: {e}")

    subscription.status = status
    db.commit()
    logger.info(
        f"Stripe subscription {stripe_sub_id} -> business {business_id} "
        f"({plan.name}, {subscription.status})"
    )


async def handle_subscription_updated(data: dict, db: Session):
    """Sync status and billing period on subscription changes/renewals."""
    stripe_sub_id = data.get("id")
    subscription = db.query(Subscription).filter(
        Subscription.stripe_subscription_id == stripe_sub_id
    ).first()
    if not subscription:
        return

    status_map = {
        "active": SubscriptionStatus.ACTIVE,
        "trialing": SubscriptionStatus.TRIAL,
        "past_due": SubscriptionStatus.PAST_DUE,
        "unpaid": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELLED,
        "incomplete_expired": SubscriptionStatus.CANCELLED,
    }
    new_status = status_map.get(data.get("status"))
    if new_status:
        subscription.status = new_status
        if new_status == SubscriptionStatus.CANCELLED and not subscription.cancelled_at:
            subscription.cancelled_at = datetime.now(timezone.utc)

    period_end = _subscription_period_end(data)
    if period_end:
        subscription.current_period_end = period_end
    if data.get("status") == "trialing":
        subscription.trial_ends_at = _ts_to_dt(data.get("trial_end")) or period_end

    db.commit()
    logger.info(f"Subscription {stripe_sub_id} updated to {data.get('status')}")


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
    """Handle a paid invoice: activate, reset usage, and mint a local invoice."""
    customer_id = data.get("customer")
    subscription = db.query(Subscription).filter(
        Subscription.stripe_customer_id == customer_id
    ).first()
    if not subscription:
        return

    amount_paid_cents = data.get("amount_paid") or 0

    # A $0 invoice is issued when a trial starts; that must not flip the
    # subscription from TRIAL to ACTIVE.
    if amount_paid_cents > 0:
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.visits_this_month = 0

    # Extend the period end from the invoice's line period when available.
    lines = (data.get("lines") or {}).get("data") or []
    if lines:
        period_end = _ts_to_dt((lines[0].get("period") or {}).get("end"))
        if period_end:
            subscription.current_period_end = period_end

    db.commit()
    logger.info(f"Invoice paid for customer {customer_id} (${amount_paid_cents / 100:.2f})")

    if amount_paid_cents > 0:
        _mint_local_invoice(db, subscription, data, amount_paid_cents)


def _mint_local_invoice(db: Session, subscription: Subscription, data: dict, amount_paid_cents: int):
    """Best-effort PalmCare-branded invoice for a Stripe charge (idempotent)."""
    try:
        from app.services.billing_invoices import create_stripe_invoice

        stripe_invoice_id = data.get("id") or ""
        if not stripe_invoice_id:
            return
        plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()

        lines = (data.get("lines") or {}).get("data") or []
        period = (lines[0].get("period") or {}) if lines else {}

        create_stripe_invoice(
            db,
            subscription=subscription,
            plan=plan,
            amount=amount_paid_cents / 100.0,
            currency=str(data.get("currency") or "usd").upper(),
            billing_cycle=subscription.billing_cycle or "monthly",
            period_start=_ts_to_dt(period.get("start")),
            period_end=_ts_to_dt(period.get("end")),
            stripe_invoice_id=stripe_invoice_id,
            paid_at=_ts_to_dt(
                (data.get("status_transitions") or {}).get("paid_at")
            ) or datetime.now(timezone.utc),
        )
    except Exception:  # pragma: no cover - invoices must never break webhooks
        logger.exception("Failed to create local invoice for Stripe charge")


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
