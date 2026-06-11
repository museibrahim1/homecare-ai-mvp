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
# LOGIN / AUTHENTICATION
# =============================================================================

@router.post("/login", response_model=BusinessLoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    credentials: BusinessLoginRequest,
    db: Session = Depends(get_db),
):
    """Login with email and password.

    Brute-force protected: IP-level slowapi limit (10/min) + per-email
    account lockout after 5 failures.
    """
    email = credentials.email.lower().strip()

    # Per-account lockout (shared with /auth/login)
    is_locked, seconds_remaining = check_account_lockout(email)
    if is_locked:
        minutes = (seconds_remaining or 900) // 60
        raise HTTPException(
            status_code=429,
            detail=f"Account temporarily locked. Try again in {minutes} minutes.",
        )

    user = db.query(BusinessUser).filter(BusinessUser.email == email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        is_now_locked, lock_duration = record_failed_login(email)
        if is_now_locked:
            raise HTTPException(
                status_code=429,
                detail=f"Account locked due to too many failed attempts. "
                       f"Try again in {(lock_duration or 900) // 60} minutes.",
            )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Successful credentials — clear failure counter
    clear_login_attempts(email)
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # Check business status
    business = user.business
    if business.verification_status != 'approved':
        if business.verification_status == 'pending':
            raise HTTPException(
                status_code=403,
                detail="Business registration is pending. Please complete verification."
            )
        elif business.verification_status == 'rejected':
            raise HTTPException(
                status_code=403,
                detail=f"Business registration was rejected: {business.rejection_reason or 'Contact support'}"
            )
        elif business.verification_status == 'suspended':
            raise HTTPException(
                status_code=403,
                detail="Business account is suspended. Contact support."
            )
        else:
            raise HTTPException(
                status_code=403,
                detail="Business verification is not complete."
            )
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)

    # Find or create a linked User row so all /clients, /visits, /auth/me
    # endpoints (which query the `users` table via get_current_user) work
    # for business accounts. The User row is identified by email.
    api_user = db.query(User).filter(User.email == user.email).first()
    if api_user is None:
        api_user = User(
            email=user.email,
            hashed_password=user.password_hash,  # reuse same hash
            full_name=user.full_name or user.email.split("@")[0],
            role="user",
            is_active=True,
            phone=user.phone,
            company_name=business.legal_name,
        )
        db.add(api_user)
        db.flush()
        logger.info(f"Created linked User row {api_user.id} for BusinessUser {user.id} ({user.email})")

    # Issue a rotating refresh token on the linked User row so the mobile
    # app can renew sessions (Face ID stay-signed-in) via /auth/refresh.
    from app.routers.auth import _issue_refresh_token
    refresh_token = _issue_refresh_token(api_user)

    db.commit()

    # IMPORTANT: token sub MUST be the User.id (not BusinessUser.id) so
    # downstream endpoints can resolve the user via get_current_user.
    token = create_access_token({
        "sub": str(api_user.id),
        "business_id": str(business.id),
        "business_user_id": str(user.id),
    })
    
    return BusinessLoginResponse(
        access_token=token,
        token_type="bearer",
        refresh_token=refresh_token,
        user=BusinessUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=UserRoleEnum(user.role),
            is_active=user.is_active,
            is_owner=user.is_owner,
            email_verified=user.email_verified,
            last_login=user.last_login,
            created_at=user.created_at,
        ),
        business=BusinessProfile(
            id=business.id,
            name=business.name,
            dba_name=business.dba_name,
            entity_type=EntityTypeEnum(business.entity_type),
            state_of_incorporation=business.state_of_incorporation,
            registration_number=business.registration_number,
            address=business.address,
            city=business.city,
            state=business.state,
            zip_code=business.zip_code,
            phone=business.phone,
            email=business.email,
            website=business.website,
            verification_status=VerificationStatusEnum(business.verification_status),
            sos_verified_at=business.sos_verified_at,
            approved_at=business.approved_at,
            logo_url=business.logo_url,
            primary_color=business.primary_color,
            created_at=business.created_at,
        ),
    )


@router.post("/password-reset/request")
@limiter.limit("5/15minutes")
async def request_password_reset(
    request: Request,
    body: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset email. Rate-limited to 5 per IP per 15 min."""
    email = body.email.lower().strip()
    user = db.query(BusinessUser).filter(BusinessUser.email == email).first()

    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        db.commit()

        app_url = os.getenv("APP_URL", "https://palmcareai.com")
        reset_url = f"{app_url}/reset-password?token={token}"

        try:
            email_svc = get_email_service()
            result = email_svc.send_password_reset(
                user_email=user.email,
                user_name=user.full_name,
                reset_url=reset_url,
            )
            if not result.get("success"):
                logger.warning(f"Password reset email failed: {result.get('error')}")
        except Exception as e:
            logger.warning(f"Password reset email skipped: {type(e).__name__}: {e}")

    # Always return success — prevents user enumeration
    return {"message": "If an account exists, a password reset email has been sent."}


@router.post("/password-reset/confirm")
@limiter.limit("10/15minutes")
async def confirm_password_reset(
    request: Request,
    body: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """Reset password using token. Also invalidates existing sessions."""
    from app.core.security import validate_password
    is_valid, error_msg = validate_password(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    user = db.query(BusinessUser).filter(
        BusinessUser.password_reset_token == body.token,
        BusinessUser.password_reset_expires > datetime.now(timezone.utc),
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    new_hash = hash_password(body.new_password)
    user.password_hash = new_hash
    user.password_reset_token = None
    user.password_reset_expires = None

    # Mirror new password to linked User row + force-logout all existing sessions
    linked = db.query(User).filter(User.email == user.email).first()
    if linked:
        linked.hashed_password = new_hash
        if hasattr(linked, "force_logout_at"):
            linked.force_logout_at = datetime.now(timezone.utc)

    db.commit()
    clear_login_attempts(user.email)
    return {"message": "Password reset successfully"}


