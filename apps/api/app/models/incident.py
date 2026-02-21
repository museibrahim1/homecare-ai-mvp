import uuid
from sqlalchemy import Column, String, ForeignKey, Text, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    status = Column(String(50), nullable=False, default="investigating")
    impact = Column(String(50), nullable=False, default="minor")
    service_name = Column(String(100), nullable=False, default="PalmCare AI Platform")
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    updates = relationship(
        "IncidentUpdate",
        back_populates="incident",
        order_by="IncidentUpdate.created_at.desc()",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_incidents_status", "status"),
        Index("ix_incidents_created_at", "created_at"),
    )


class IncidentUpdate(Base, TimestampMixin):
    __tablename__ = "incident_updates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)

    incident = relationship("Incident", back_populates="updates")

    __table_args__ = (
        Index("ix_incident_updates_incident_id", "incident_id"),
    )
