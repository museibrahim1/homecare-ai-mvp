import uuid
from sqlalchemy import Column, String, Boolean, Enum, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    caregiver = "caregiver"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.caregiver, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Google Calendar Integration
    google_calendar_connected = Column(Boolean, default=False, nullable=False)
    google_calendar_access_token = Column(Text, nullable=True)
    google_calendar_refresh_token = Column(Text, nullable=True)
    google_calendar_token_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    visits_as_caregiver = relationship("Visit", back_populates="caregiver", foreign_keys="Visit.caregiver_id")
    audit_logs = relationship("AuditLog", back_populates="user")
