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
# PUBLIC SIGNUP CHECKOUT (no auth required)
# =============================================================================

@router.post("/signup-checkout", response_model=CheckoutResponse)
async def create_signup_checkout(
    request: SignupCheckoutRequest,
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Checkout session for new signups.
    No auth required -- called right after registration.
    Collects credit card and sets up trial that auto-converts to paid subscription.
    """
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tier_map = {"starter": "STARTER", "growth": "GROWTH", "professional": "PROFESSIONAL"}
    tier_key = tier_map.get(request.plan_tier.lower(), "STARTER")
    plan = db.query(Plan).filter(Plan.tier == tier_key).first()
    if not plan:
        plan = db.query(Plan).order_by(Plan.monthly_price).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No plans available")

    if request.billing_cycle == "annual":
        price_id = plan.stripe_price_id_annual
    else:
        price_id = plan.stripe_price_id_monthly

    if not price_id:
        raise HTTPException(status_code=400, detail="Plan not configured for Stripe billing")

    trial_days = 30 if request.trial_type == "extended" else 14

    line_items = [{"price": price_id, "quantity": 1}]

    if request.trial_type == "extended" and EXTENDED_TRIAL_PRICE_ID:
        line_items.insert(0, {"price": EXTENDED_TRIAL_PRICE_ID, "quantity": 1})

    try:
        customer = stripe.Customer.create(
            email=request.email,
            metadata={
                "business_id": str(request.business_id),
                "plan_tier": request.plan_tier,
                "source": "signup",
            },
        )

        session_params = {
            "mode": "subscription",
            "payment_method_types": ["card"],
            "payment_method_collection": "always",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": f"{STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": STRIPE_CANCEL_URL,
            "customer": customer.id,
            "metadata": {
                "plan_id": str(plan.id),
                "plan_name": plan.name,
                "business_id": str(request.business_id),
                "billing_cycle": request.billing_cycle,
                "trial_type": request.trial_type,
            },
            "subscription_data": {
                "trial_period_days": trial_days,
                "metadata": {
                    "plan_id": str(plan.id),
                    "business_id": str(request.business_id),
                },
                "description": (
                    f"PalmCare AI {plan.name} - {trial_days}-day free trial, "
                    f"then {'$' + str(int(plan.annual_price)) + '/yr' if request.billing_cycle == 'annual' else '$' + str(int(plan.monthly_price)) + '/mo'}"
                ),
            },
            "custom_text": {
                "submit": {
                    "message": (
                        f"After your {trial_days}-day free trial, "
                        f"your card will be automatically charged "
                        f"{'$' + str(int(plan.monthly_price)) + '/month' if request.billing_cycle == 'monthly' else '$' + str(int(plan.annual_price)) + '/year'} "
                        f"for PalmCare AI {plan.name}. Cancel anytime before the trial ends."
                    ),
                },
            },
            "allow_promotion_codes": True,
        }

        session = stripe.checkout.Session.create(**session_params)

        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    except stripe.error.CardError as e:
        logger.error(f"Stripe card error on signup: {e}")
        raise HTTPException(status_code=400, detail="There was an issue with the payment method. Please try a different card.")
    except stripe.error.RateLimitError:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment and try again.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe signup checkout error: {e}")
        raise HTTPException(status_code=502, detail="Payment service is temporarily unavailable. Please try again in a moment.")

