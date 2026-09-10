"""Pydantic models for the billing package."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CreateCheckoutRequest(BaseModel):
    plan_id: UUID
    billing_cycle: str = "monthly"  # monthly or annual
    # Ignored server-side (business is derived from the authenticated user);
    # kept so older clients sending it don't get a validation error.
    business_id: Optional[UUID] = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalRequest(BaseModel):
    # Ignored server-side; see CreateCheckoutRequest.business_id.
    business_id: Optional[UUID] = None
