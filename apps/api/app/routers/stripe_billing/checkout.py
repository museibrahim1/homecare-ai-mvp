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
# CHECKOUT
# =============================================================================

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout session for a plan."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    
    # Get plan
    plan = db.query(Plan).filter(Plan.id == request.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.is_contact_sales:
        raise HTTPException(status_code=400, detail="Enterprise requires contacting sales")
    
    # Get the correct price ID
    if request.billing_cycle == "annual":
        price_id = plan.stripe_price_id_annual
    else:
        price_id = plan.stripe_price_id_monthly
    
    if not price_id:
        raise HTTPException(status_code=400, detail="Plan not configured for Stripe billing")
    
    # Get or determine business
    business_id = request.business_id
    if not business_id:
        # Try to get business from user
        business_user = db.query(BusinessUser).filter(
            BusinessUser.email == current_user.email
        ).first()
        if business_user:
            business_id = business_user.business_id
    
    # Build line items
    line_items = [
        {
            "price": price_id,
            "quantity": 1,
        }
    ]
    
    # Add setup fee if exists
    if plan.stripe_price_id_setup and plan.setup_fee and plan.setup_fee > 0:
        line_items.append({
            "price": plan.stripe_price_id_setup,
            "quantity": 1,
        })
    
    # Create Stripe checkout session (create customer first for Accounts V2 compat)
    try:
        existing_sub = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first() if business_id else None
        customer_id = existing_sub.stripe_customer_id if existing_sub and existing_sub.stripe_customer_id else None

        if not customer_id:
            customer = stripe.Customer.create(
                email=current_user.email,
                metadata={"business_id": str(business_id) if business_id else "", "user_id": str(current_user.id)},
            )
            customer_id = customer.id

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
                "business_id": str(business_id) if business_id else "",
                "user_id": str(current_user.id),
                "billing_cycle": request.billing_cycle,
            },
            subscription_data={
                "metadata": {
                    "plan_id": str(plan.id),
                    "business_id": str(business_id) if business_id else "",
                }
            },
            allow_promotion_codes=True,
        )
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/portal")
async def create_portal_session(
    request: PortalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Customer Portal session for managing subscription."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    
    # Get subscription
    subscription = db.query(Subscription).filter(
        Subscription.business_id == request.business_id
    ).first()
    
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{STRIPE_SUCCESS_URL.replace('/success', '')}",
        )
        
        return {"portal_url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")
