import uuid
from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Action details
    action = Column(String(100), nullable=False)
    # user_login, visit_created, audio_uploaded, billable_approved, note_generated, etc.
    
    entity_type = Column(String(50), nullable=True)  # visit, client, user, billable_item, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Change details
    description = Column(Text, nullable=True)
    changes = Column(JSONB, default=dict, nullable=False)
    # {"field": {"old": "value", "new": "value"}}
    
    # Request context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
