import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class BillableItem(Base, TimestampMixin):
    __tablename__ = "billable_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    
    # Task classification
    code = Column(String(50), nullable=False)  # Internal task code
    category = Column(String(100), nullable=False)  # ADL_HYGIENE, MEAL_PREP, MED_REMINDER, etc.
    description = Column(Text, nullable=True)
    
    # Timing
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    minutes = Column(Integer, nullable=False)
    
    # Evidence (links to transcript segments that triggered this)
    evidence = Column(JSONB, default=list, nullable=False)
    # [{"segment_id": "uuid", "start_ms": 0, "end_ms": 1000, "text": "..."}, ...]
    
    # Review status
    is_approved = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    flag_reason = Column(Text, nullable=True)
    
    # Admin adjustments
    adjusted_minutes = Column(Integer, nullable=True)
    adjustment_reason = Column(Text, nullable=True)
    
    # Relationships
    visit = relationship("Visit", back_populates="billable_items")
