"""Stripe Checkout + Customer Portal for web subscriptions.

Web (palmcareai.com) subscribers pay with a card through Stripe Checkout.
Apple In-App Purchase (app.routers.apple_iap) stays the path inside the
iOS app per App Store Guideline 3.1.1. A business subscribes through
exactly one channel at a time; Apple-managed subscriptions are blocked
from Stripe checkout and vice versa.
"""

import logging
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.business import BusinessUser
from app.models.subscription import Plan, Subscription, SubscriptionStatus

from .common import (
    stripe, STRIPE_AVAILABLE, STRIPE_SECRET_KEY,
    STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, STRIPE_TRIAL_DAYS, env_price_id,
)
from .schemas import CreateCheckoutRequest, CheckoutResponse, PortalRequest

logger = logging.getLogger(__name__)

router = APIRouter()


def _tier_value(plan: Plan) -> str:
    return plan.tier.value if hasattr(plan.tier, "value") else str(plan.tier or "")


def _resolve_line_item(plan: Plan, billing_cycle: str) -> dict:
    """
    Resolve the Checkout line item for a plan.

    Priority:
      1. STRIPE_PRICE_<TIER>_<CYCLE> env var (ops override)
      2. Plan row's stripe_price_id_monthly / stripe_price_id_annual column
      3. Inline price_data built from the Plan's own price

    The inline fallback means checkout keeps working (at the correct,
    current price) even when no Stripe Price object was ever created.
    """
    tier = _tier_value(plan)
    price_id = env_price_id(tier, billing_cycle)
    if not price_id:
        price_id = (
            plan.stripe_price_id_annual
            if billing_cycle == "annual"
            else plan.stripe_price_id_monthly
        )
    if price_id:
        return {"price": price_id, "quantity": 1}

    amount = plan.annual_price if billing_cycle == "annual" else plan.monthly_price
    amount = float(amount or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Plan not configured for web billing")

    return {
        "price_data": {
            "currency": "usd",
            "unit_amount": int(round(amount * 100)),
            "recurring": {"interval": "year" if billing_cycle == "annual" else "month"},
            "product_data": {
                "name": plan.name or "PalmCare subscription",
                "metadata": {"tier": tier},
            },
        },
        "quantity": 1,
    }


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("10/minute")
async def create_checkout_session(
    request: Request,  # required by slowapi
    body: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout session for a self-serve plan."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Card payments are not configured yet")

    if body.billing_cycle not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    plan = db.query(Plan).filter(Plan.id == body.plan_id, Plan.is_active.is_(True)).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.is_contact_sales:
        raise HTTPException(status_code=400, detail="Enterprise requires contacting sales")

    # SECURITY: resolve the business from the AUTHENTICATED user only. Never
    # trust request.business_id — trusting it lets a user bind a checkout to
    # another tenant and overwrite their subscription via webhook metadata.
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email
    ).first()
    if not business_user:
        # Without a business the webhook could never unlock anything, so the
        # customer would be charged for nothing. Refuse up front instead.
        raise HTTPException(
            status_code=400,
            detail="Your account is not linked to an agency yet. Finish agency setup first.",
        )
    business_id = business_user.business_id

    existing_sub = db.query(Subscription).filter(
        Subscription.business_id == business_id
    ).first()

    if (
        existing_sub
        and existing_sub.stripe_customer_id
        and existing_sub.stripe_customer_id.startswith("apple:")
        and existing_sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL)
    ):
        raise HTTPException(
            status_code=400,
            detail="You already subscribe through Apple. Manage your plan in Apple Subscriptions.",
        )

    line_items = [_resolve_line_item(plan, body.billing_cycle)]

    # One-time setup fee, when the plan defines one.
    if plan.stripe_price_id_setup and plan.setup_fee and plan.setup_fee > 0:
        line_items.append({"price": plan.stripe_price_id_setup, "quantity": 1})

    # 30-day free trial for first-time subscribers only. Anyone who already
    # had a paid subscription (Stripe or Apple) pays from day one.
    grant_trial = STRIPE_TRIAL_DAYS > 0 and not (
        existing_sub
        and (existing_sub.stripe_subscription_id or existing_sub.stripe_customer_id)
    )

    try:
        customer_id = None
        if (
            existing_sub
            and existing_sub.stripe_customer_id
            and not existing_sub.stripe_customer_id.startswith("apple:")
        ):
            customer_id = existing_sub.stripe_customer_id

        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"business_id": str(business_id), "user_id": str(current_user.id)},
            )
            customer_id = customer.id

        subscription_data = {
            "metadata": {
                "plan_id": str(plan.id),
                "business_id": str(business_id),
            }
        }
        if grant_trial:
            subscription_data["trial_period_days"] = STRIPE_TRIAL_DAYS

        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=line_items,
            success_url=f"{STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=STRIPE_CANCEL_URL,
            customer=customer_id,
            metadata={
                "plan_id": str(plan.id),
                "plan_name": plan.name,
                "business_id": str(business_id),
                "user_id": str(current_user.id),
                "billing_cycle": body.billing_cycle,
            },
            subscription_data=subscription_data,
            allow_promotion_codes=True,
        )

        return CheckoutResponse(checkout_url=session.url, session_id=session.id)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=502, detail="Failed to start checkout. Please try again.")


@router.post("/portal")
@limiter.limit("10/minute")
async def create_portal_session(
    request: Request,  # required by slowapi
    body: PortalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for managing a subscription."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Card payments are not configured yet")

    # SECURITY: derive the business from the authenticated user, NOT from
    # body.business_id. Trusting the client value was a cross-tenant IDOR —
    # any user could open another business's billing portal (view invoices/PII,
    # change card, cancel their subscription).
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email
    ).first()
    if not business_user:
        raise HTTPException(status_code=404, detail="No subscription found")

    subscription = db.query(Subscription).filter(
        Subscription.business_id == business_user.business_id
    ).first()

    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription found")

    if subscription.stripe_customer_id.startswith("apple:"):
        raise HTTPException(
            status_code=400,
            detail="This subscription is managed by Apple. Use Apple Subscriptions to change or cancel.",
        )

    try:
        portal_return = os.getenv("STRIPE_PORTAL_RETURN_URL", "https://palmcareai.com/billing").strip()
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=portal_return,
        )
        return {"portal_url": session.url}

    except stripe.error.StripeError as e:
        logger.error(f"Stripe portal error: {e}")
        raise HTTPException(status_code=502, detail="Failed to open the billing portal. Please try again.")
