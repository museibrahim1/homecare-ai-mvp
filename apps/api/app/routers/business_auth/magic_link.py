import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from app.core.cookies import set_session_cookie
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
# MAGIC LINK — passwordless one-tap email sign-in
# =============================================================================

@router.post("/magic-link/request")
@limiter.limit("5/15minutes")
async def request_magic_link(
    request: Request,
    body: MagicLinkRequest,
    db: Session = Depends(get_db),
):
    """Send a one-time login link to the user's email.

    Tokens are 15-minute single-use. Always returns 200 to prevent
    email enumeration; only sends if the account exists.
    """
    email = body.email.lower().strip()
    user = db.query(BusinessUser).filter(BusinessUser.email == email).first()

    if user:
        token = secrets.token_urlsafe(32)
        # Reuse password_reset_token columns to avoid a schema migration;
        # we keep the magic-link expiry short (15 min) so it can't shadow
        # a real password-reset request in practice.
        user.password_reset_token = f"magic:{token}"
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.commit()

        app_url = os.getenv("APP_URL", "https://palmcareai.com")
        login_url = f"{app_url}/sign-in?magic={token}"

        try:
            email_svc = get_email_service()
            result = email_svc.send_magic_link(
                user_email=user.email,
                user_name=user.full_name,
                login_url=login_url,
            ) if hasattr(email_svc, "send_magic_link") else email_svc.send_password_reset(
                user_email=user.email,
                user_name=user.full_name,
                reset_url=login_url,
            )
            if not result.get("success"):
                logger.warning(f"Magic link email failed: {result.get('error')}")
        except Exception as e:
            logger.warning(f"Magic link email skipped: {type(e).__name__}: {e}")

    return {"message": "If an account exists, a sign-in link has been sent."}


@router.post("/magic-link/verify", response_model=BusinessLoginResponse)
@limiter.limit("10/minute")
async def verify_magic_link(
    request: Request,
    response: Response,
    body: MagicLinkConfirm,
    db: Session = Depends(get_db),
):
    """Exchange a magic-link token for an access token + login response."""
    stored = f"magic:{body.token}"
    user = db.query(BusinessUser).filter(
        BusinessUser.password_reset_token == stored,
        BusinessUser.password_reset_expires > datetime.now(timezone.utc),
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired sign-in link")

    # Single-use: clear the token immediately
    user.password_reset_token = None
    user.password_reset_expires = None
    user.email_verified = True  # email ownership proven
    user.last_login = datetime.now(timezone.utc)

    business = user.business

    # Ensure linked User row exists (same logic as /login)
    api_user = db.query(User).filter(User.email == user.email).first()
    if api_user is None:
        api_user = User(
            id=user.id,
            email=user.email,
            hashed_password=user.password_hash,
            full_name=user.full_name or user.email.split("@")[0],
            role="user",
            is_active=True,
            company_name=business.name if business else None,
        )
        db.add(api_user)
        db.flush()

    from app.routers.auth import _issue_refresh_token
    refresh_token = _issue_refresh_token(api_user)

    db.commit()
    clear_login_attempts(user.email)

    token = create_access_token({
        "sub": str(api_user.id),
        "business_id": str(business.id) if business else None,
        "email": user.email,
    })

    set_session_cookie(response, token)

    return BusinessLoginResponse(
        access_token=token,
        refresh_token=refresh_token,
        user=BusinessUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=UserRoleEnum(user.role) if isinstance(user.role, str) else UserRoleEnum(str(user.role)),
            is_active=user.is_active,
            is_owner=user.is_owner,
            email_verified=user.email_verified,
            last_login=user.last_login,
            created_at=user.created_at,
        ),
        business=BusinessProfile(
            id=business.id if business else user.id,
            name=business.name if business else "",
            dba_name=business.dba_name if business else None,
            entity_type=EntityTypeEnum(business.entity_type) if business else EntityTypeEnum.LLC,
            state_of_incorporation=business.state_of_incorporation if business else "",
            address=business.address if business else None,
            city=business.city if business else None,
            state=business.state if business else None,
            zip_code=business.zip_code if business else None,
            phone=business.phone if business else None,
            email=business.email if business else user.email,
            verification_status=VerificationStatusEnum(business.verification_status) if business else VerificationStatusEnum.APPROVED,
            created_at=business.created_at if business else user.created_at,
        ),
    )


