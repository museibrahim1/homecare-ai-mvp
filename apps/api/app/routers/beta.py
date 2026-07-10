"""
iOS Beta (TestFlight) signup — public endpoint.

Visitors request access at palmcareai.com/beta. We email the admin
(sales@palmtai.com) with the requester's details so they can be added as a
tester in App Store Connect → TestFlight, and send the requester a
confirmation.
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app.core.rate_limit import limiter
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()


class BetaRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    agency_name: Optional[str] = Field(default=None, max_length=200)
    device: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = Field(default=None, max_length=1000)


@router.post("/request")
@limiter.limit("5/hour")
async def request_beta_access(request: Request, body: BetaRequest):
    """Register interest in the iOS TestFlight beta."""
    email_service = get_email_service()
    admin_email = os.getenv("ADMIN_NOTIFICATION_EMAIL", "sales@palmtai.com")

    admin_result = email_service.send_beta_request_admin(
        admin_email=admin_email,
        requester_name=body.name.strip(),
        requester_email=body.email.lower().strip(),
        agency_name=(body.agency_name or "").strip() or None,
        device=(body.device or "").strip() or None,
        note=(body.note or "").strip() or None,
    )
    if not admin_result.get("success"):
        logger.error(f"Beta request admin email failed: {admin_result.get('error')}")
        raise HTTPException(
            status_code=502,
            detail="We couldn't submit your request right now. Please email sales@palmtai.com directly.",
        )

    # Confirmation is best-effort — the request itself already reached the team.
    try:
        email_service.send_beta_request_confirmation(
            requester_email=body.email.lower().strip(),
            requester_name=body.name.strip().split(" ")[0],
        )
    except Exception as e:
        logger.warning(f"Beta confirmation email failed: {type(e).__name__}: {e}")

    return {
        "success": True,
        "message": "Request received! Watch your inbox for a TestFlight invite within 1-2 business days.",
    }
