import logging
import os
import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.business import (
    Business, BusinessDocument, BusinessUser,
    VerificationStatus, DocumentType
)
from app.schemas.business import (
    AdminBusinessListItem, AdminBusinessDetail, AdminApprovalRequest,
    AdminApprovalResponse, DocumentResponse,
    VerificationStatusEnum, EntityTypeEnum, DocumentTypeEnum, UserRoleEnum,
    BusinessUserResponse
)
from app.services.document_storage import get_document_service
from app.services.email import email_service

from .common import require_platform_admin

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# QUICK SETUP (DEMO ONBOARDING)
# =============================================================================

class QuickSetupRequest(BaseModel):
    company_name: str
    owner_name: str
    owner_email: EmailStr
    state: str  # 2-letter code
    phone: Optional[str] = None
    services: Optional[List[str]] = None
    estimated_clients: Optional[int] = None


class QuickSetupResponse(BaseModel):
    business_id: UUID
    user_id: UUID
    temporary_password: str
    login_url: str


def _generate_temp_password(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


@router.post("/quick-setup", response_model=QuickSetupResponse)
async def quick_setup(
    request: QuickSetupRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """
    Quickly onboard a new agency during a live demo.

    Creates an auto-approved Business, a User record, and a BusinessUser (owner)
    with a temporary password. Skips SOS verification and document uploads.
    """
    state_code = request.state.upper()[:2]

    # Prevent duplicate business email
    existing_biz = db.query(Business).filter(Business.email == request.owner_email).first()
    if existing_biz:
        raise HTTPException(status_code=400, detail="A business with this email already exists")

    # Prevent duplicate user email
    existing_bu = db.query(BusinessUser).filter(BusinessUser.email == request.owner_email).first()
    if existing_bu:
        raise HTTPException(status_code=400, detail="A business user with this email already exists")

    existing_user = db.query(User).filter(User.email == request.owner_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    temp_password = _generate_temp_password()
    hashed = get_password_hash(temp_password)

    # 1. Business (auto-approved)
    business = Business(
        name=request.company_name,
        entity_type="llc",
        state_of_incorporation=state_code,
        state=state_code,
        phone=request.phone,
        email=request.owner_email,
        verification_status="approved",
        approved_at=datetime.now(timezone.utc),
        approved_by=admin.id,
        sos_verification_data={
            "quick_setup": True,
            "services": request.services or [],
            "estimated_clients": request.estimated_clients,
            "created_by_admin": str(admin.id),
        },
    )
    db.add(business)
    db.flush()

    # 2. BusinessUser (owner)
    owner = BusinessUser(
        business_id=business.id,
        email=request.owner_email,
        full_name=request.owner_name,
        phone=request.phone,
        password_hash=hashed,
        role="owner",
        is_owner=True,
        email_verified=True,
    )
    db.add(owner)
    db.flush()

    # 3. Matching User record for app functionality (same ID)
    regular_user = User(
        id=owner.id,
        email=request.owner_email,
        full_name=request.owner_name,
        hashed_password=hashed,
        company_name=request.company_name,
        role="user",
        is_active=True,
        phone=request.phone,
    )
    db.add(regular_user)

    db.commit()

    app_url = os.getenv("APP_URL", "https://palmcareai.com")
    login_url = f"{app_url}/login"

    # Best-effort welcome email
    try:
        email_service.send_email(
            to=request.owner_email,
            subject=f"Welcome to PalmCare AI — {request.company_name}",
            sender=email_service.from_welcome,
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">Welcome to PalmCare AI!</h2>
                <p>Hi {request.owner_name},</p>
                <p>Your agency <strong>{request.company_name}</strong> has been set up and is ready to go.</p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                    <p style="margin: 0 0 5px 0;">Email: {request.owner_email}</p>
                    <p style="margin: 0;">Temporary Password: {temp_password}</p>
                </div>
                <p style="color: #dc2626; font-size: 14px;">Please change your password after your first login.</p>
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{login_url}"
                       style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Login Now
                    </a>
                </div>
            </div>
            """,
        )
    except Exception as e:
        logger.warning(f"Quick-setup welcome email failed for {request.owner_email}: {e}")

    logger.info(
        f"Quick-setup: admin {admin.id} created business '{request.company_name}' "
        f"(id={business.id}) for {request.owner_email}"
    )

    return QuickSetupResponse(
        business_id=business.id,
        user_id=owner.id,
        temporary_password=temp_password,
        login_url=login_url,
    )


