import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.core.rate_limit import limiter
from sqlalchemy.orm import Session
from jose import jwt

from app.core.deps import get_db, get_current_user as get_current_api_user
from app.core.config import settings
from app.models.business import (
    Business, BusinessDocument, BusinessUser,
    VerificationStatus, EntityType, DocumentType, UserRole
)
from app.models.user import User  # For creating linked user account
from app.schemas.business import (
    BusinessRegistrationStep1, SOSVerificationRequest, SOSVerificationResponse,
    DocumentUploadRequest, DocumentResponse, BusinessRegistrationResponse,
    BusinessProfile, BusinessProfileUpdate, BusinessStatusResponse,
    BusinessUserCreate, BusinessUserUpdate, BusinessUserResponse, BusinessUserInviteResponse,
    BusinessLoginRequest, BusinessLoginResponse, PasswordResetRequest, PasswordResetConfirm,
    MagicLinkRequest, MagicLinkConfirm,
    VerificationStatusEnum, EntityTypeEnum, DocumentTypeEnum, UserRoleEnum
)
from app.services.sos_verification import get_sos_service
from app.services.document_storage import get_document_service
from app.services.email import get_email_service
from app.core.security import (
    check_account_lockout, record_failed_login, clear_login_attempts,
    get_password_hash, verify_password as _verify_password,
)

from .common import (
    REQUIRED_DOCUMENTS, hash_password, verify_password,
    create_access_token, get_current_business_user,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# =============================================================================
# AUTHENTICATED - Business Profile
# =============================================================================

@router.get("/profile", response_model=BusinessProfile)
async def get_business_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Get current business profile."""
    business = db.query(Business).filter(
        Business.email == current_user.email
    ).first()
    if not business:
        business = db.query(Business).filter(
            Business.name == current_user.company_name
        ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    return BusinessProfile(
        id=business.id,
        name=business.name,
        dba_name=business.dba_name,
        entity_type=EntityTypeEnum(business.entity_type.value if hasattr(business.entity_type, 'value') else business.entity_type),
        state_of_incorporation=business.state_of_incorporation or "",
        registration_number=business.registration_number,
        address=business.address,
        city=business.city,
        state=business.state,
        zip_code=business.zip_code,
        phone=business.phone,
        email=business.email,
        website=business.website,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        sos_verified_at=business.sos_verified_at,
        approved_at=business.approved_at,
        logo_url=getattr(business, 'logo_url', None),
        primary_color=getattr(business, 'primary_color', None),
        created_at=business.created_at,
    )


@router.put("/profile", response_model=BusinessProfile)
async def update_business_profile(
    update: BusinessProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Update business profile."""
    business = db.query(Business).filter(
        Business.email == current_user.email
    ).first()
    if not business:
        business = db.query(Business).filter(
            Business.name == current_user.company_name
        ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(business, field):
            setattr(business, field, value)
    
    db.commit()
    db.refresh(business)
    
    return BusinessProfile(
        id=business.id,
        name=business.name,
        dba_name=business.dba_name,
        entity_type=EntityTypeEnum(business.entity_type.value if hasattr(business.entity_type, 'value') else business.entity_type),
        state_of_incorporation=business.state_of_incorporation or "",
        registration_number=business.registration_number,
        address=business.address,
        city=business.city,
        state=business.state,
        zip_code=business.zip_code,
        phone=business.phone,
        email=business.email,
        website=business.website,
        verification_status=VerificationStatusEnum(business.verification_status.value if hasattr(business.verification_status, 'value') else business.verification_status),
        sos_verified_at=business.sos_verified_at,
        approved_at=business.approved_at,
        logo_url=getattr(business, 'logo_url', None),
        primary_color=getattr(business, 'primary_color', None),
        created_at=business.created_at,
    )


