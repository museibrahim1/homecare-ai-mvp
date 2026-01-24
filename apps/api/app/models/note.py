import uuid
from sqlalchemy import Column, String, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Note(Base, TimestampMixin):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False, unique=True)
    
    # Structured fields (generated)
    structured_data = Column(JSONB, default=dict, nullable=False)
    # {
    #   "tasks_performed": ["medication reminder", "meal prep", ...],
    #   "observations": "Client appeared in good spirits...",
    #   "risks_concerns": "None noted",
    #   "vitals": {"bp": "120/80", "pulse": 72, ...},
    #   "medications_administered": [...],
    #   "client_condition": "stable",
    #   "follow_up_needed": false
    # }
    
    # Narrative note (SOAP-style or agency-specific)
    narrative = Column(Text, nullable=True)
    
    # Review status
    is_approved = Column(Boolean, default=False, nullable=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Document versions
    version = Column(String(20), default="1.0", nullable=False)
    
    # Relationships
    visit = relationship("Visit", back_populates="note")
