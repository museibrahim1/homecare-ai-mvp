import uuid
from sqlalchemy import Column, String, Text, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class CareTrackerEntry(Base, TimestampMixin):
    __tablename__ = "care_tracker_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    caregiver_id = Column(UUID(as_uuid=True), ForeignKey("caregivers.id"), nullable=True)

    stage = Column(String(50), nullable=False, default="follow_up")  # follow_up, plan_review, ongoing
    priority = Column(String(20), nullable=False, default="routine")  # routine, moderate, high, critical
    care_specialty = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    target_date = Column(Date, nullable=True)
    last_contact = Column(Date, nullable=True)
    next_follow_up = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)  # fallback when caregiver_id unset

    __table_args__ = (
        Index("ix_care_tracker_created_by", "created_by"),
        Index("ix_care_tracker_client", "client_id"),
        Index("ix_care_tracker_stage", "created_by", "stage"),
    )
