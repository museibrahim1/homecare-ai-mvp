"""
Business Authentication Router

Handles business registration, verification, login, and user management.
"""

import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt

from app.core.deps import get_db
from app.core.config import settings
from app.models.business import (
    Business, BusinessDocument, BusinessUser,
    VerificationStatus, EntityType, DocumentType, UserRole
)
from app.schemas.business import (
    BusinessRegistrationStep1, SOSVerificationRequest, SOSVerificationResponse,
    DocumentUploadRequest, DocumentResponse, BusinessRegistrationResponse,
    BusinessProfile, BusinessProfileUpdate, BusinessStatusResponse,
    BusinessUserCreate, BusinessUserUpdate, BusinessUserResponse, BusinessUserInviteResponse,
    BusinessLoginRequest, BusinessLoginResponse, PasswordResetRequest, PasswordResetConfirm,
    VerificationStatusEnum, EntityTypeEnum, DocumentTypeEnum, UserRoleEnum
)
from app.services.sos_verification import get_sos_service
from app.services.document_storage import get_document_service
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Required documents for verification
REQUIRED_DOCUMENTS = [
    DocumentType.BUSINESS_LICENSE,
    DocumentType.HOME_CARE_LICENSE,
    DocumentType.LIABILITY_INSURANCE,
]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def get_current_business_user(
    token: str,
    db: Session,
) -> BusinessUser:
    """Decode token and get current business user."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
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
                detail=f"Business not approved. Status: {user.business.verification_status.value}"
            )
        
        return user
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============================================================================
# PUBLIC ENDPOINTS - Registration Flow
# =============================================================================

@router.post("/register", response_model=BusinessRegistrationResponse)
async def register_business(
    registration: BusinessRegistrationStep1,
    db: Session = Depends(get_db),
):
    """
    Step 1: Register a new business.
    
    Creates business record and owner user account.
    Triggers SOS verification automatically.
    """
    # Check if business email already exists
    existing = db.query(Business).filter(Business.email == registration.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A business with this email already exists"
        )
    
    # Check if owner email already exists
    existing_user = db.query(BusinessUser).filter(
        BusinessUser.email == registration.owner_email
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists"
        )
    
    # Create business
    # Use lowercase entity_type value to match PostgreSQL enum
    entity_type_value = registration.entity_type.value.lower() if hasattr(registration.entity_type, 'value') else registration.entity_type.lower()
    business = Business(
        name=registration.name,
        dba_name=registration.dba_name,
        entity_type=entity_type_value,
        state_of_incorporation=registration.state_of_incorporation.upper(),
        registration_number=registration.registration_number,
        ein=registration.ein,  # TODO: Encrypt this
        address=registration.address,
        city=registration.city,
        state=registration.state.upper(),
        zip_code=registration.zip_code,
        phone=registration.phone,
        email=registration.email,
        website=registration.website,
        verification_status='pending',  # Use lowercase string to match PostgreSQL enum
    )
    db.add(business)
    db.flush()  # Get the ID
    
    # Create owner user
    owner = BusinessUser(
        business_id=business.id,
        email=registration.owner_email,
        full_name=registration.owner_name,
        password_hash=hash_password(registration.owner_password),
        role=UserRole.OWNER,
        is_owner=True,
        email_verification_token=secrets.token_urlsafe(32),
    )
    db.add(owner)
    
    # Attempt SOS verification
    sos_service = get_sos_service()
    sos_result = await sos_service.verify_business(
        business_name=registration.name,
        state=registration.state_of_incorporation,
        registration_number=registration.registration_number,
    )
    
    if sos_result.get("found"):
        business.sos_verification_data = sos_result
        business.sos_verified_at = datetime.now(timezone.utc)
        business.verification_status = 'sos_verified'
        next_steps = [
            "Your business has been verified with the Secretary of State.",
            "Please upload the required documents to complete verification.",
            "Required: Business License, Home Care License, Liability Insurance"
        ]
    else:
        business.sos_verification_data = sos_result
        next_steps = [
            "We could not automatically verify your business with state records.",
            "Please upload your documents for manual review.",
            "Required: Business License, Home Care License, Liability Insurance, Articles of Incorporation"
        ]
    
    db.commit()
    
    # Send registration confirmation email
    email_service = get_email_service()
    email_service.send_registration_confirmation(
        to_email=registration.owner_email,
        business_name=registration.name,
        business_id=str(business.id),
    )
    
    return BusinessRegistrationResponse(
        business_id=business.id,
        verification_status=VerificationStatusEnum(business.verification_status.value),
        message="Registration submitted successfully",
        next_steps=next_steps,
    )


@router.post("/verify-sos", response_model=SOSVerificationResponse)
async def verify_with_sos(
    request: SOSVerificationRequest,
):
    """
    Verify a business with Secretary of State records.
    
    Can be used before registration to check if business exists.
    """
    sos_service = get_sos_service()
    result = await sos_service.verify_business(
        business_name=request.business_name,
        state=request.state,
        registration_number=request.registration_number,
    )
    
    return SOSVerificationResponse(**result)


@router.post("/upload-document/{business_id}")
async def upload_document(
    business_id: UUID,
    document_type: str = Form(...),
    expiration_date: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a verification document for a business.
    
    No auth required during registration flow (business_id acts as token).
    """
    # Get business
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    if business.verification_status == 'approved':
        raise HTTPException(status_code=400, detail="Business already approved")
    
    # Validate document type
    try:
        doc_type = DocumentType(document_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type}")
    
    # Read file content
    content = await file.read()
    
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
        raise HTTPException(status_code=400, detail=result)
    
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
        document_type=DocumentTypeEnum(document.document_type.value),
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
):
    """
    Check the registration/verification status of a business.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    
    # Count documents
    documents = db.query(BusinessDocument).filter(
        BusinessDocument.business_id == business_id
    ).all()
    docs_submitted = len(documents)
    docs_verified = len([d for d in documents if d.is_verified])
    
    # Determine missing required documents
    existing_types = {d.document_type for d in documents}
    missing = [dt.value for dt in REQUIRED_DOCUMENTS if dt not in existing_types]
    
    # Estimate review time
    estimated_time = None
    if business.verification_status == 'documents_submitted':
        estimated_time = "1-2 business days"
    elif business.verification_status == 'pending':
        estimated_time = "Upload documents to proceed"
    
    return BusinessStatusResponse(
        business_id=business.id,
        business_name=business.name,
        verification_status=VerificationStatusEnum(business.verification_status.value),
        sos_verified=business.sos_verified_at is not None,
        documents_submitted=docs_submitted,
        documents_verified=docs_verified,
        documents_required=missing,
        rejection_reason=business.rejection_reason,
        estimated_review_time=estimated_time,
    )


# =============================================================================
# LOGIN / AUTHENTICATION
# =============================================================================

@router.post("/login", response_model=BusinessLoginResponse)
async def login(
    credentials: BusinessLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with email and password.
    
    Only approved businesses can login.
    """
    # Find user
    user = db.query(BusinessUser).filter(
        BusinessUser.email == credentials.email
    ).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
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
    db.commit()
    
    # Create token
    token = create_access_token({"sub": str(user.id), "business_id": str(business.id)})
    
    # Format EIN (show only last 4)
    ein_last_4 = None
    if business.ein:
        ein_last_4 = business.ein[-4:] if len(business.ein) >= 4 else business.ein
    
    return BusinessLoginResponse(
        access_token=token,
        token_type="bearer",
        user=BusinessUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=UserRoleEnum(user.role.value),
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
            entity_type=EntityTypeEnum(business.entity_type.value),
            state_of_incorporation=business.state_of_incorporation,
            registration_number=business.registration_number,
            ein_last_4=ein_last_4,
            address=business.address,
            city=business.city,
            state=business.state,
            zip_code=business.zip_code,
            phone=business.phone,
            email=business.email,
            website=business.website,
            verification_status=VerificationStatusEnum(business.verification_status.value),
            sos_verified_at=business.sos_verified_at,
            approved_at=business.approved_at,
            logo_url=business.logo_url,
            primary_color=business.primary_color,
            created_at=business.created_at,
        ),
    )


@router.post("/password-reset/request")
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Request a password reset email."""
    user = db.query(BusinessUser).filter(
        BusinessUser.email == request.email
    ).first()
    
    if user:
        # Generate token
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=24)
        db.commit()
        
        # TODO: Send email with reset link
        logger.info(f"Password reset requested for {request.email}")
    
    # Always return success to prevent email enumeration
    return {"message": "If an account exists, a password reset email has been sent."}


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """Reset password using token."""
    user = db.query(BusinessUser).filter(
        BusinessUser.password_reset_token == request.token,
        BusinessUser.password_reset_expires > datetime.now(timezone.utc),
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.password_hash = hash_password(request.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    return {"message": "Password reset successfully"}


# =============================================================================
# AUTHENTICATED - Business Profile
# =============================================================================

@router.get("/profile", response_model=BusinessProfile)
async def get_business_profile(
    token: str = Depends(lambda: None),  # Will be replaced with proper auth
    db: Session = Depends(get_db),
):
    """Get current business profile."""
    # For now, this is a placeholder - need proper token extraction
    raise HTTPException(status_code=501, detail="Use login endpoint")


@router.put("/profile", response_model=BusinessProfile)
async def update_business_profile(
    update: BusinessProfileUpdate,
    db: Session = Depends(get_db),
):
    """Update business profile."""
    raise HTTPException(status_code=501, detail="Use login endpoint")


# =============================================================================
# AUTHENTICATED - Team Management
# =============================================================================

@router.get("/users", response_model=List[BusinessUserResponse])
async def list_business_users(
    db: Session = Depends(get_db),
):
    """List all users in the business."""
    raise HTTPException(status_code=501, detail="Requires authentication")


@router.post("/users", response_model=BusinessUserInviteResponse)
async def invite_user(
    user_data: BusinessUserCreate,
    db: Session = Depends(get_db),
):
    """Invite a new user to the business."""
    raise HTTPException(status_code=501, detail="Requires authentication")


@router.delete("/users/{user_id}")
async def remove_user(
    user_id: UUID,
    db: Session = Depends(get_db),
):
    """Remove a user from the business."""
    raise HTTPException(status_code=501, detail="Requires authentication")
