import uuid
from sqlalchemy import Column, String, Text, Date, Integer, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    title = Column(String(500), nullable=False)
    client_name = Column(String(255), nullable=True)
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String(10), nullable=False)  # HH:MM 24h
    duration_minutes = Column(Integer, nullable=False, default=60)
    location = Column(String(500), nullable=True)
    appointment_type = Column(String(50), nullable=False, default="visit")  # assessment, review, meeting, visit
    notes = Column(Text, nullable=True)
    google_event_id = Column(String(255), nullable=True)
    is_follow_up = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        Index("ix_appointments_created_by", "created_by"),
        Index("ix_appointments_date", "created_by", "appointment_date"),
        Index("ix_appointments_client", "client_id"),
    )
