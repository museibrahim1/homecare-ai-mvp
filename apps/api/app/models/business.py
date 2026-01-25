"""
Business Models

Models for business registration, verification, and user management.
Replaces the simple user model with a full business entity system.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base, TimestampMixin


class VerificationStatus(str, enum.Enum):
    """Business verification status"""
    PENDING = "pending"
    SOS_VERIFIED = "sos_verified"  # Passed SOS check, awaiting documents
    DOCUMENTS_SUBMITTED = "documents_submitted"  # Docs uploaded, awaiting review
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class EntityType(str, enum.Enum):
    """Business entity types"""
    LLC = "llc"
    CORPORATION = "corporation"
    S_CORP = "s_corp"
    PARTNERSHIP = "partnership"
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    NONPROFIT = "nonprofit"
    OTHER = "other"


class DocumentType(str, enum.Enum):
    """Types of verification documents"""
    BUSINESS_LICENSE = "business_license"
    HOME_CARE_LICENSE = "home_care_license"
    LIABILITY_INSURANCE = "liability_insurance"
    WORKERS_COMP = "workers_comp"
    W9 = "w9"
    ARTICLES_OF_INCORPORATION = "articles_of_incorporation"
    CERTIFICATE_OF_GOOD_STANDING = "certificate_of_good_standing"
    OTHER = "other"


class UserRole(str, enum.Enum):
    """Business user roles"""
    OWNER = "owner"
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"


class Business(Base, TimestampMixin):
    """
    Main business/agency entity.
    
    A business must be verified before users can access the application.
    """
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Business Identity
    name = Column(String(255), nullable=False)
    dba_name = Column(String(255))  # Doing Business As
    entity_type = Column(SQLEnum(EntityType), default=EntityType.LLC)
    
    # State Registration
    state_of_incorporation = Column(String(2), nullable=False)  # State code (NE, IA, etc.)
    registration_number = Column(String(100))  # SOS registration/file number
    ein = Column(String(255))  # Encrypted EIN (Employer Identification Number)
    
    # Contact Information
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(2))
    zip_code = Column(String(20))
    phone = Column(String(20))
    email = Column(String(255), nullable=False, unique=True)
    website = Column(String(255))
    
    # Verification Status
    verification_status = Column(
        SQLEnum(VerificationStatus), 
        default=VerificationStatus.PENDING
    )
    sos_verification_data = Column(JSONB)  # Raw response from SOS API
    sos_verified_at = Column(DateTime(timezone=True))
    
    # Approval
    approved_at = Column(DateTime(timezone=True))
    approved_by = Column(UUID(as_uuid=True))  # Admin user who approved
    rejection_reason = Column(Text)
    
    # Settings
    logo_url = Column(String(500))
    primary_color = Column(String(7), default="#6366f1")
    
    # Relationships
    users = relationship("BusinessUser", back_populates="business", cascade="all, delete-orphan")
    documents = relationship("BusinessDocument", back_populates="business", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Business {self.name} ({self.verification_status.value})>"


class BusinessDocument(Base, TimestampMixin):
    """
    Verification documents uploaded by businesses.
    
    Documents are stored in MinIO and must be reviewed by admins.
    """
    __tablename__ = "business_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    
    # Document Info
    document_type = Column(SQLEnum(DocumentType), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Path in MinIO
    file_size = Column(String(50))
    mime_type = Column(String(100))
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True))
    verified_by = Column(UUID(as_uuid=True))  # Admin who verified
    verification_notes = Column(Text)
    
    # Expiration (for licenses/insurance)
    expiration_date = Column(Date)
    
    # Relationships
    business = relationship("Business", back_populates="documents")
    
    def __repr__(self):
        return f"<BusinessDocument {self.document_type.value} for {self.business_id}>"


class BusinessUser(Base, TimestampMixin):
    """
    Users belonging to a business.
    
    Replaces the simple User model. All users must belong to a verified business.
    """
    __tablename__ = "business_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    
    # User Info
    email = Column(String(255), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    
    # Role & Status
    role = Column(SQLEnum(UserRole), default=UserRole.STAFF)
    is_active = Column(Boolean, default=True)
    is_owner = Column(Boolean, default=False)  # Primary account owner
    
    # Email Verification
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String(255))
    email_verified_at = Column(DateTime(timezone=True))
    
    # Password Reset
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime(timezone=True))
    
    # Last Activity
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    business = relationship("Business", back_populates="users")
    
    def __repr__(self):
        return f"<BusinessUser {self.email} ({self.role.value})>"
    
    @property
    def is_admin(self):
        """Check if user has admin privileges"""
        return self.role in [UserRole.OWNER, UserRole.ADMIN]
