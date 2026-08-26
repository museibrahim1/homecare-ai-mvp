import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class AgencyLead(Base, TimestampMixin):
    """Agency-facing CRM lead (pre-client prospect). Distinct from CEO SalesLead."""

    __tablename__ = "agency_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    source = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="new")  # new, contacted, qualified
    notes = Column(Text, nullable=True)
    insurance_type = Column(String(50), nullable=True)  # medicaid, medicare, private
    insurance_id = Column(String(100), nullable=True)

    converted_at = Column(DateTime(timezone=True), nullable=True)
    converted_client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)

    __table_args__ = (
        Index("ix_agency_leads_created_by", "created_by"),
        Index("ix_agency_leads_status", "created_by", "status"),
    )
