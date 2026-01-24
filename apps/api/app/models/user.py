import uuid
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CAREGIVER = "caregiver"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CAREGIVER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Relationships
    visits_as_caregiver = relationship("Visit", back_populates="caregiver", foreign_keys="Visit.caregiver_id")
    audit_logs = relationship("AuditLog", back_populates="user")
