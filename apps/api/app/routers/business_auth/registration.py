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

    # Team membership is keyed on company_name, so an agency name must map to
    # exactly one tenant. Without this check, registering under an existing
    # agency's name would join (and expose) that agency's team.
    from sqlalchemy import func
    name_taken = (
        db.query(User)
        .filter(func.lower(User.company_name) == agency_name.lower())
        .first()
    )
    if name_taken:
        raise HTTPException(
            status_code=409,
            detail="An agency with this name is already registered. If you work there, ask the account owner to invite you from Settings → Team.",
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


