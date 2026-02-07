"""
Stripe Billing Router

Handles Stripe checkout, webhooks, and subscription management.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.business import Business, BusinessUser
from app.models.subscription import Plan, Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)

router = APIRouter()

# Check if Stripe is available
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    logger.warning("Stripe not installed")

# Initialize Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "https://app.palmtai.com/billing/success")
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "https://app.palmtai.com/pricing")

if STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


# =============================================================================
# SCHEMAS
# =============================================================================

class CreateCheckoutRequest(BaseModel):
    plan_id: UUID
    billing_cycle: str = "monthly"  # monthly or annual
    business_id: Optional[UUID] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalRequest(BaseModel):
    business_id: UUID


class StripePriceConfig(BaseModel):
    """Configuration for Stripe price IDs"""
    stripe_product_id: Optional[str] = None
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_annual: Optional[str] = None
    stripe_price_id_setup: Optional[str] = None


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.get("/plans")
async def get_public_plans(db: Session = Depends(get_db)):
    """Get all active plans (public endpoint for pricing page)."""
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.monthly_price).all()
    
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "tier": p.tier.value,
            "description": p.description,
            "monthly_price": float(p.monthly_price) if p.monthly_price else 0,
            "annual_price": float(p.annual_price) if p.annual_price else 0,
            "setup_fee": float(p.setup_fee) if p.setup_fee else 0,
            "max_users": p.max_users,
            "is_contact_sales": p.is_contact_sales or False,
            "features": p.features,
        }
        for p in plans
    ]


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
    
    # Create Stripe checkout session
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=line_items,
            success_url=f"{STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=STRIPE_CANCEL_URL,
            customer_email=current_user.email,
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
    """Handle successful checkout."""
    metadata = data.get("metadata", {})
    plan_id = metadata.get("plan_id")
    business_id = metadata.get("business_id")
    billing_cycle = metadata.get("billing_cycle", "monthly")
    
    if not plan_id:
        logger.error("No plan_id in checkout metadata")
        return
    
    # Get plan
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        logger.error(f"Plan not found: {plan_id}")
        return
    
    # Create or update subscription
    if business_id:
        subscription = db.query(Subscription).filter(
            Subscription.business_id == business_id
        ).first()
        
        if not subscription:
            subscription = Subscription(business_id=business_id)
            db.add(subscription)
        
        subscription.plan_id = plan.id
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.billing_cycle = billing_cycle
        subscription.stripe_customer_id = data.get("customer")
        subscription.stripe_subscription_id = data.get("subscription")
        subscription.current_period_start = datetime.now(timezone.utc)
        
        db.commit()
        logger.info(f"Subscription created/updated for business {business_id}")


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
    if current_user.role.value != "admin":
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
    if current_user.role.value != "admin":
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
