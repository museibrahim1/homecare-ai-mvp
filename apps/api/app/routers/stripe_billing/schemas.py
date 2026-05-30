"""Pydantic models for the billing package."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CreateCheckoutRequest(BaseModel):
    plan_id: UUID
    billing_cycle: str = "monthly"  # monthly or annual
    business_id: Optional[UUID] = None


class SignupCheckoutRequest(BaseModel):
    """Public checkout request for new signups (no auth required)."""
    business_id: UUID
    email: str
    billing_cycle: str = "monthly"
    trial_type: str = "standard"  # "standard" (14-day free) or "extended" (30-day for $39.99)
    plan_tier: str = "starter"


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

