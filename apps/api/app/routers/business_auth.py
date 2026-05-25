"""
Business Authentication Router

Handles business registration, verification, login, and user management.
"""

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
from passlib.context import CryptContext
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
)

logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Required documents for verification (use lowercase strings to match PostgreSQL enum)
REQUIRED_DOCUMENTS = [
    'business_license',
    'home_care_license',
    'liability_insurance',
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Issue a JWT that mirrors the lifetime configured in settings.

    Defaults to `settings.jwt_expiration_hours` (1h per HIPAA) so that
    business-side tokens don't outlive regular user tokens.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=settings.jwt_expiration_hours)
    )
    to_encode.update({
        "exp": expire,
        "iss": settings.jwt_issuer,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_business_user(
    token: str,
    db: Session,
) -> BusinessUser:
    """Decode token and get current business user."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = db.query(BusinessUser).filter(BusinessUser.id == UUID(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Check if business is approved
        if user.business.verification_status != 'approved':
            raise HTTPException(
                status_code=403, 
                detail=f"Business not approved. Status: {user.business.verification_status}"
            )
        
        return user
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============================================================================
# PUBLIC ENDPOINTS - Registration Flow
# =============================================================================

@router.post("/register", response_model=BusinessRegistrationResponse)
@limiter.limit("5/5minutes")
async def register_business(
    request: Request,
    registration: BusinessRegistrationStep1,
    db: Session = Depends(get_db),
):
    """Simple signup: email + password + name. Returns a logged-in session.

    No EIN, no SOS verification, no document upload. Agencies can fill in
    extra details from Settings later. Account is auto-approved.
    """
    # Normalize inputs
    owner_email = registration.owner_email.lower().strip()
    business_email = (registration.email or owner_email).lower().strip()
    agency_name = (registration.name or "").strip() or registration.owner_name.strip()

    # Conflict check (one query covers both halves of the email→account map)
    existing_user = (
        db.query(BusinessUser).filter(BusinessUser.email == owner_email).first()
        or db.query(User).filter(User.email == owner_email).first()
    )
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Try signing in instead.",
        )

    # HIPAA: validate password complexity
    from app.core.security import validate_password
    is_valid, error_msg = validate_password(registration.owner_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Defaults so we don't store empty strings where the DB needs a value
    entity_type_raw = registration.entity_type or EntityTypeEnum.LLC
    entity_type_value = (
        entity_type_raw.value.lower()
        if hasattr(entity_type_raw, "value")
        else str(entity_type_raw).lower()
    )
    state = (registration.state or registration.state_of_incorporation or "NE").upper()
    state_of_incorporation = (registration.state_of_incorporation or state).upper()

    # Hash password once, reuse for both records (avoids double bcrypt cost)
    hashed = hash_password(registration.owner_password)

    business = Business(
        name=agency_name,
        dba_name=registration.dba_name,
        entity_type=entity_type_value,
        state_of_incorporation=state_of_incorporation,
        registration_number=registration.registration_number,
        address=registration.address or "",
        city=registration.city or "",
        state=state,
        zip_code=registration.zip_code or "",
        phone=registration.phone or "",
        email=business_email,
        website=registration.website,
        verification_status="approved",
        approved_at=datetime.now(timezone.utc),
    )
    db.add(business)
    db.flush()

    owner = BusinessUser(
        business_id=business.id,
        email=owner_email,
        full_name=registration.owner_name.strip(),
        password_hash=hashed,
        role="owner",
        is_owner=True,
        email_verified=False,
        email_verification_token=secrets.token_urlsafe(32),
    )
    db.add(owner)
    db.flush()

    regular_user = User(
        id=owner.id,
        email=owner_email,
        full_name=registration.owner_name.strip(),
        hashed_password=hashed,
        company_name=agency_name,
        role="user",
        is_active=True,
    )
    db.add(regular_user)
    db.flush()

    next_steps = [
        "You're signed in — start by adding your first client.",
        "Update your agency details anytime from Settings.",
    ]

    try:
        from app.models.agency_settings import AgencySettings
        db.add(AgencySettings(
            user_id=regular_user.id,
            settings_key=f"user_{regular_user.id}",
            name=agency_name,
            address=registration.address or "",
            city=registration.city or "",
            state=state,
            zip_code=registration.zip_code or "",
            phone=registration.phone or "",
            email=business_email,
        ))
    except Exception as e:
        logger.warning(f"Could not auto-create AgencySettings on registration: {e}")
    
    # Create 14-day trial subscription on the user's chosen plan (or Starter).
    try:
        from app.models.subscription import Plan, Subscription, SubscriptionStatus
        tier_map = {"starter": "STARTER", "growth": "PROFESSIONAL", "professional": "PROFESSIONAL"}
        plan_tier = tier_map.get((registration.selected_plan or "starter").lower(), "STARTER")
        plan = db.query(Plan).filter(Plan.tier == plan_tier).first() or \
            db.query(Plan).order_by(Plan.monthly_price).first()
        if plan:
            trial_end = datetime.now(timezone.utc) + timedelta(days=14)
            db.add(Subscription(
                business_id=business.id,
                plan_id=plan.id,
                status=SubscriptionStatus.TRIAL,
                billing_cycle="monthly",
                trial_ends_at=trial_end,
                current_period_start=datetime.now(timezone.utc),
                current_period_end=trial_end,
            ))
    except Exception as e:
        logger.warning(f"Could not auto-create trial subscription: {e}")

    signup_source = getattr(registration, "signup_source", None) or "direct"
    try:
        from app.services.audit import log_action
        log_action(
            db=db, user_id=regular_user.id, action="business_registered",
            entity_type="business", entity_id=business.id,
            description=f"New business registered (source: {signup_source})",
            changes={"signup_source": signup_source, "selected_plan": registration.selected_plan or "starter"},
        )
    except Exception:
        pass

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Registration commit failed: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Registration could not be completed. Please try again in a moment.",
        )

    # Issue an immediate access token so the client is signed in after signup.
    token = create_access_token({
        "sub": str(regular_user.id),
        "business_id": str(business.id),
        "email": owner_email,
    }, expires_delta=timedelta(hours=settings.jwt_expiration_hours))

    # Welcome email — best-effort, never block signup on email failure.
    try:
        email_service = get_email_service()
        welcome_result = email_service.send_business_registration_received(
            business_email=owner_email,
            business_name=agency_name,
        )
        if not welcome_result.get("success"):
            logger.warning(f"Welcome email failed: {welcome_result.get('error')}")
    except Exception as e:
        logger.warning(f"Welcome email skipped: {type(e).__name__}: {e}")

    try:
        admin_email = os.getenv("ADMIN_NOTIFICATION_EMAIL", "sales@palmtai.com")
        email_service = get_email_service()
        email_service.send_admin_new_registration(
            admin_email=admin_email,
            business_name=agency_name,
            business_id=str(business.id),
        )
    except Exception:
        pass

    logger.info(f"New business registered: business_id={business.id}, source={signup_source}")

    return BusinessRegistrationResponse(
        business_id=business.id,
        verification_status=VerificationStatusEnum(business.verification_status),
        message="Welcome to PalmCare AI!",
        next_steps=next_steps,
        access_token=token,
    )


@router.post("/verify-sos", response_model=SOSVerificationResponse)
@limiter.limit("10/minute")
async def verify_with_sos(
    request: Request,
    body: SOSVerificationRequest,
    current_user: User = Depends(get_current_api_user),
):
    """
    Optional helper: look up a business in Secretary of State records.

    Auth-gated and rate-limited to prevent abuse of upstream SOS APIs.
    Not part of the signup flow anymore.
    """
    sos_service = get_sos_service()
    result = await sos_service.verify_business(
        business_name=body.business_name,
        state=body.state,
        registration_number=body.registration_number,
    )
    return SOSVerificationResponse(**result)


@router.post("/upload-document/{business_id}")
@limiter.limit("10/minute")
async def upload_document(
    request: Request,
    business_id: UUID,
    document_type: str = Form(...),
    expiration_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Upload an optional verification document for a business.

    Auth-gated: the caller must be the owner of the business they're uploading
    documents for. The signup flow itself no longer requires any documents.
    """
    # Get business
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Ownership: the caller's linked BusinessUser must belong to this business.
    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email,
        BusinessUser.business_id == business.id,
    ).first()
    if not business_user:
        raise HTTPException(status_code=403, detail="You don't have access to this business")
    
    allowed_statuses = ('pending', 'documents_submitted', 'rejected')
    if business.verification_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Documents cannot be uploaded in current status")
    
    # File size limit (10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # File type validation
    allowed_types = ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF and image files are accepted")
    
    # Validate document type
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")
    
    # Upload to storage
    doc_service = get_document_service()
    success, result, file_size = doc_service.upload_document(
        business_id=str(business_id),
        document_type=document_type,
        file_content=content,
        original_filename=file.filename,
        mime_type=file.content_type,
    )
    
    if not success:
        logger.error(f"Document upload failed: {result}")
        raise HTTPException(status_code=400, detail="Document upload failed. Please try again.")
    
    # Parse expiration date
    exp_date = None
    if expiration_date:
        try:
            exp_date = datetime.strptime(expiration_date, "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Create document record
    document = BusinessDocument(
        business_id=business_id,
        document_type=doc_type,
        file_name=file.filename,
        file_path=result,
        file_size=file_size,
        mime_type=file.content_type,
        expiration_date=exp_date,
    )
    db.add(document)
    
    # Check if all required documents are uploaded
    existing_docs = db.query(BusinessDocument).filter(
        BusinessDocument.business_id == business_id
    ).all()
    existing_types = {d.document_type for d in existing_docs}
    existing_types.add(doc_type)
    
    if all(req in existing_types for req in REQUIRED_DOCUMENTS):
        business.verification_status = 'documents_submitted'
    
    db.commit()
    db.refresh(document)
    
    return DocumentResponse(
        id=document.id,
        document_type=DocumentTypeEnum(document.document_type),
        file_name=document.file_name,
        file_size=document.file_size,
        uploaded_at=document.created_at,
        is_verified=document.is_verified,
        verified_at=document.verified_at,
        expiration_date=document.expiration_date,
    )


@router.get("/status/{business_id}", response_model=BusinessStatusResponse)
async def get_registration_status(
    business_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """
    Check the registration/verification status of a business.
    Requires auth: caller must belong to the business.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    business_user = db.query(BusinessUser).filter(
        BusinessUser.email == current_user.email,
        BusinessUser.business_id == business.id,
    ).first()
    if not business_user:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Count documents
    documents = db.query(BusinessDocument).filter(
        BusinessDocument.business_id == business_id
    ).all()
    docs_submitted = len(documents)
    docs_verified = len([d for d in documents if d.is_verified])
    
    # Determine missing required documents
    existing_types = {d.document_type for d in documents}
    missing = [dt for dt in REQUIRED_DOCUMENTS if dt not in existing_types]
    
    # Estimate review time
    estimated_time = None
    if business.verification_status == 'documents_submitted':
        estimated_time = "1-2 business days"
    elif business.verification_status == 'pending':
        estimated_time = "Upload documents to proceed"
    
    return BusinessStatusResponse(
        business_id=business.id,
        business_name=business.name[:3] + "***" if business.name else "",
        verification_status=VerificationStatusEnum(business.verification_status),
        sos_verified=business.sos_verified_at is not None,
        documents_submitted=docs_submitted,
        documents_verified=docs_verified,
        documents_required=missing,
        rejection_reason=business.rejection_reason if business.verification_status in ('rejected', 'suspended') else None,
        estimated_review_time=estimated_time,
    )


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

    db.commit()
    clear_login_attempts(user.email)

    token = create_access_token({
        "sub": str(api_user.id),
        "business_id": str(business.id) if business else None,
        "email": user.email,
    })

    return BusinessLoginResponse(
        access_token=token,
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


# =============================================================================
# AUTHENTICATED - Team Management
# =============================================================================

from app.models.subscription import Subscription, Plan

def get_team_limits(db: Session, company_name: str):
    """Get team limits based on subscription plan."""
    # Find business by company name
    business = db.query(Business).filter(Business.name == company_name).first()
    
    # Default limits for free tier
    default_limits = {
        "max_users": 1,
        "plan_name": "Free",
        "plan_tier": "free",
        "monthly_price": 0,
        "upgrade_options": []
    }
    
    if not business:
        return default_limits
    
    # Get subscription and plan
    subscription = db.query(Subscription).filter(
        Subscription.business_id == business.id
    ).first()
    
    if not subscription:
        return default_limits
    
    plan = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
    if not plan:
        return default_limits
    
    # Get upgrade options (higher tier plans)
    tier_order = {"free": 0, "starter": 1, "professional": 2, "enterprise": 3}
    current_tier_level = tier_order.get(plan.tier.value if hasattr(plan.tier, 'value') else plan.tier, 0)
    
    upgrade_plans = db.query(Plan).filter(
        Plan.is_active == True
    ).all()
    
    upgrade_options = []
    for up in upgrade_plans:
        up_tier = up.tier.value if hasattr(up.tier, 'value') else up.tier
        up_level = tier_order.get(up_tier, 0)
        if up_level > current_tier_level:
            upgrade_options.append({
                "name": up.name,
                "tier": up_tier,
                "max_users": up.max_users,
                "monthly_price": float(up.monthly_price) if up.monthly_price else 0,
                "additional_users": up.max_users - plan.max_users,
            })
    
    # Sort by tier level
    upgrade_options.sort(key=lambda x: tier_order.get(x["tier"], 0))
    
    return {
        "max_users": plan.max_users,
        "plan_name": plan.name,
        "plan_tier": plan.tier.value if hasattr(plan.tier, 'value') else plan.tier,
        "monthly_price": float(plan.monthly_price) if plan.monthly_price else 0,
        "upgrade_options": upgrade_options
    }

@router.get("/team/limits")
async def get_team_plan_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Get team size limits based on current subscription plan."""
    # Get team limits
    limits = get_team_limits(db, current_user.company_name)
    
    # Count current team members
    current_count = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).count()
    
    return {
        "current_users": current_count,
        "max_users": limits["max_users"],
        "plan_name": limits["plan_name"],
        "plan_tier": limits["plan_tier"],
        "can_invite": current_count < limits["max_users"],
        "remaining_seats": max(0, limits["max_users"] - current_count),
        "upgrade_options": limits["upgrade_options"]
    }

@router.get("/team")
async def list_team_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """List all team members (users in the same company)."""
    # Get all users with the same company name
    team_members = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).all()
    
    # Get plan limits for context
    limits = get_team_limits(db, current_user.company_name)
    
    return {
        "members": [{
            "id": str(member.id),
            "email": member.email,
            "full_name": member.full_name,
            "role": member.role,
            "phone": member.phone,
            "is_active": member.is_active,
            "voiceprint_created": member.voiceprint is not None,
            "created_at": member.created_at.isoformat() if member.created_at else None,
        } for member in team_members],
        "limits": {
            "current_users": len(team_members),
            "max_users": limits["max_users"],
            "plan_name": limits["plan_name"],
            "can_invite": len(team_members) < limits["max_users"],
        }
    }


@router.post("/team/invite")
async def invite_team_member(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
    email: str = None,
    full_name: str = None,
    role: str = "caregiver",
):
    """Invite a new team member."""
    if not email or not full_name:
        raise HTTPException(status_code=400, detail="Email and full_name are required")
    
    # Check team limits based on subscription plan
    limits = get_team_limits(db, current_user.company_name)
    
    # Lock existing team members to prevent concurrent inserts exceeding limit
    current_count = db.query(User).filter(
        User.company_name == current_user.company_name,
        User.company_name.isnot(None),
        User.company_name != ""
    ).with_for_update().count()
    
    if current_count >= limits["max_users"]:
        # Include upgrade info in error message
        upgrade_msg = ""
        if limits["upgrade_options"]:
            next_plan = limits["upgrade_options"][0]
            upgrade_msg = f" Upgrade to {next_plan['name']} (${next_plan['monthly_price']}/mo) to add up to {next_plan['max_users']} users."
        
        raise HTTPException(
            status_code=403,
            detail=f"Team limit reached. Your {limits['plan_name']} plan allows {limits['max_users']} user(s).{upgrade_msg}"
        )
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    
    # Generate temporary password
    temp_password = secrets.token_urlsafe(12)
    
    # Create the new user
    try:
        new_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(temp_password),
            company_name=current_user.company_name,
            role=role,
            is_active=True,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create team member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create team member. Please try again.")
    
    # Send invitation email
    email_sent = False
    try:
        email_service = get_email_service()
        app_url = os.getenv("APP_URL", "https://palmcareai.com")
        invite_result = email_service.send_email(
            to=email,
            subject=f"You've been invited to join {current_user.company_name} on PalmCare AI",
            sender=email_service.from_welcome,
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #6366f1;">You've Been Invited!</h2>
                <p>Hi {full_name},</p>
                <p>{current_user.full_name} has invited you to join <strong>{current_user.company_name}</strong> on PalmCare AI.</p>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                    <p style="margin: 0 0 5px 0;">Email: {email}</p>
                    <p style="margin: 0;">Temporary Password: {temp_password}</p>
                </div>
                
                <p style="color: #dc2626; font-size: 14px;">Please change your password after your first login.</p>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{app_url}/login" 
                       style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                        Login Now
                    </a>
                </div>
            </div>
            """
        )
        email_sent = invite_result.get("success", False)
        if not email_sent:
            logger.warning(f"Invitation email failed: {invite_result.get('error')}")
    except Exception as e:
        logger.warning(f"Failed to send invitation email: {e}")
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": new_user.role,
        "message": f"Invitation sent to {email}" if email_sent else f"Team member created but invitation email to {email} could not be sent. Please share credentials manually.",
    }


@router.put("/team/{user_id}")
async def update_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
    role: str = None,
    is_active: bool = None,
):
    """Update a team member's role or status."""
    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check same company
    if member.company_name != current_user.company_name:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user")
    
    # Can't deactivate yourself
    if is_active is False and member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    if role is not None:
        member.role = role
    if is_active is not None:
        member.is_active = is_active
    
    db.commit()
    db.refresh(member)
    
    return {
        "id": str(member.id),
        "email": member.email,
        "full_name": member.full_name,
        "role": member.role,
        "is_active": member.is_active,
    }


@router.delete("/team/{user_id}")
async def remove_team_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_api_user),
):
    """Remove a team member (soft delete - deactivate)."""
    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check same company
    if member.company_name != current_user.company_name:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user")
    
    # Can't remove yourself
    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own account")
    
    # Soft delete - deactivate
    member.is_active = False
    db.commit()
    
    return {"message": f"User {member.email} has been deactivated"}


# Legacy endpoints (keeping for backwards compatibility)
@router.get("/users", response_model=List[BusinessUserResponse])
async def list_business_users(
    db: Session = Depends(get_db),
):
    """List all users in the business. (Legacy - use /team instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team endpoint instead")


@router.post("/users", response_model=BusinessUserInviteResponse)
async def invite_user(
    user_data: BusinessUserCreate,
    db: Session = Depends(get_db),
):
    """Invite a new user to the business. (Legacy - use /team/invite instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team/invite endpoint instead")


@router.delete("/users/{user_id}")
async def remove_user(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Remove a user from the business. (Legacy - use /team/{user_id}/deactivate instead)"""
    raise HTTPException(status_code=501, detail="Use /auth/business/team/{user_id}/deactivate endpoint instead")
