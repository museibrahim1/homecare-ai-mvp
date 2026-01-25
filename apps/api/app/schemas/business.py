"""
Business Schemas

Pydantic schemas for business registration, verification, and management.
"""

from datetime import datetime, date
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class VerificationStatusEnum(str, Enum):
    PENDING = "pending"
    SOS_VERIFIED = "sos_verified"
    DOCUMENTS_SUBMITTED = "documents_submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class EntityTypeEnum(str, Enum):
    LLC = "llc"
    CORPORATION = "corporation"
    S_CORP = "s_corp"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NONPROFIT = "nonprofit"
    OTHER = "other"


class DocumentTypeEnum(str, Enum):
    BUSINESS_LICENSE = "business_license"
    HOME_CARE_LICENSE = "home_care_license"
    LIABILITY_INSURANCE = "liability_insurance"
    WORKERS_COMP = "workers_comp"
    W9 = "w9"
    ARTICLES_OF_INCORPORATION = "articles_of_incorporation"
    CERTIFICATE_OF_GOOD_STANDING = "certificate_of_good_standing"
    OTHER = "other"


class UserRoleEnum(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"


# =============================================================================
# Business Registration
# =============================================================================

class BusinessRegistrationStep1(BaseModel):
    """Step 1: Basic business information"""
    name: str = Field(..., min_length=2, max_length=255)
    dba_name: Optional[str] = None
    entity_type: EntityTypeEnum
    state_of_incorporation: str = Field(..., min_length=2, max_length=2)
    registration_number: Optional[str] = None
    ein: Optional[str] = None  # Will be encrypted
    
    # Contact
    address: str
    city: str
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: str
    phone: str
    email: EmailStr
    website: Optional[str] = None
    
    # Owner info (creates first user)
    owner_name: str
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8)


class SOSVerificationRequest(BaseModel):
    """Request to verify business with Secretary of State"""
    business_name: str
    state: str = Field(..., min_length=2, max_length=2)
    registration_number: Optional[str] = None


class SOSVerificationResponse(BaseModel):
    """Response from SOS verification"""
    found: bool
    business_name: Optional[str] = None
    status: Optional[str] = None  # Active, Inactive, etc.
    registration_number: Optional[str] = None
    registered_agent: Optional[str] = None
    formation_date: Optional[str] = None
    entity_type: Optional[str] = None
    address: Optional[str] = None
    raw_data: Optional[dict] = None
    error: Optional[str] = None


class DocumentUploadRequest(BaseModel):
    """Document upload metadata"""
    document_type: DocumentTypeEnum
    expiration_date: Optional[date] = None


class DocumentResponse(BaseModel):
    """Document details response"""
    id: UUID
    document_type: DocumentTypeEnum
    file_name: str
    file_size: Optional[str] = None
    uploaded_at: datetime
    is_verified: bool
    verified_at: Optional[datetime] = None
    expiration_date: Optional[date] = None

    class Config:
        from_attributes = True


class BusinessRegistrationResponse(BaseModel):
    """Response after completing registration"""
    business_id: UUID
    verification_status: VerificationStatusEnum
    message: str
    next_steps: List[str]


# =============================================================================
# Business Profile
# =============================================================================

class BusinessProfile(BaseModel):
    """Full business profile"""
    id: UUID
    name: str
    dba_name: Optional[str] = None
    entity_type: EntityTypeEnum
    state_of_incorporation: str
    registration_number: Optional[str] = None
    ein_last_4: Optional[str] = None  # Only show last 4 digits
    
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: str
    website: Optional[str] = None
    
    verification_status: VerificationStatusEnum
    sos_verified_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class BusinessProfileUpdate(BaseModel):
    """Update business profile"""
    dba_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class BusinessStatusResponse(BaseModel):
    """Business registration status check"""
    business_id: UUID
    business_name: str
    verification_status: VerificationStatusEnum
    sos_verified: bool
    documents_submitted: int
    documents_verified: int
    documents_required: List[str]
    rejection_reason: Optional[str] = None
    estimated_review_time: Optional[str] = None


# =============================================================================
# Business Users
# =============================================================================

class BusinessUserCreate(BaseModel):
    """Create/invite a new business user"""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.STAFF


class BusinessUserUpdate(BaseModel):
    """Update business user"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    is_active: Optional[bool] = None


class BusinessUserResponse(BaseModel):
    """Business user details"""
    id: UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    role: UserRoleEnum
    is_active: bool
    is_owner: bool
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BusinessUserInviteResponse(BaseModel):
    """Response after inviting a user"""
    user_id: UUID
    email: str
    invite_sent: bool
    message: str


# =============================================================================
# Authentication
# =============================================================================

class BusinessLoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class BusinessLoginResponse(BaseModel):
    """Login response"""
    access_token: str
    token_type: str = "bearer"
    user: BusinessUserResponse
    business: BusinessProfile


class PasswordResetRequest(BaseModel):
    """Request password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token"""
    token: str
    new_password: str = Field(..., min_length=8)


# =============================================================================
# Admin
# =============================================================================

class AdminBusinessListItem(BaseModel):
    """Business item for admin list"""
    id: UUID
    name: str
    email: str
    state_of_incorporation: str
    verification_status: VerificationStatusEnum
    documents_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminBusinessDetail(BaseModel):
    """Full business details for admin review"""
    id: UUID
    name: str
    dba_name: Optional[str] = None
    entity_type: EntityTypeEnum
    state_of_incorporation: str
    registration_number: Optional[str] = None
    
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: str
    website: Optional[str] = None
    
    verification_status: VerificationStatusEnum
    sos_verification_data: Optional[dict] = None
    sos_verified_at: Optional[datetime] = None
    
    documents: List[DocumentResponse]
    owner: Optional[BusinessUserResponse] = None
    
    created_at: datetime

    class Config:
        from_attributes = True


class AdminApprovalRequest(BaseModel):
    """Admin approval/rejection request"""
    approved: bool
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class AdminApprovalResponse(BaseModel):
    """Admin approval response"""
    business_id: UUID
    verification_status: VerificationStatusEnum
    message: str
