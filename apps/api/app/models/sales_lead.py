import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class LeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    email_sent = "email_sent"
    email_opened = "email_opened"
    responded = "responded"
    meeting_scheduled = "meeting_scheduled"
    demo_given = "demo_given"
    negotiating = "negotiating"
    converted = "converted"
    not_interested = "not_interested"
    no_response = "no_response"


class OwnershipType(str, enum.Enum):
    proprietary = "Proprietary"
    non_profit = "Non-Profit"
    government = "Government Operated"
    combination = "Combination"
    other = "Other"


class SalesLead(Base, TimestampMixin):
    """
    Sales leads for outbound campaigns.
    PRIVATE: Only visible to platform admin (CEO account).
    Source: CMS Provider Data API (dataset 6jpm-sxkc).
    """
    __tablename__ = "sales_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # CMS data fields
    provider_name = Column(String(500), nullable=False, index=True)
    state = Column(String(2), nullable=False, index=True)
    city = Column(String(255), nullable=True)
    address = Column(String(500), nullable=True)
    zip_code = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    ownership_type = Column(String(100), nullable=True)
    ccn = Column(String(20), nullable=True, unique=True)
    certification_date = Column(String(20), nullable=True)
    years_in_operation = Column(Float, nullable=True)
    star_rating = Column(String(10), nullable=True)

    # Services offered
    offers_nursing = Column(Boolean, default=False)
    offers_pt = Column(Boolean, default=False)
    offers_ot = Column(Boolean, default=False)
    offers_speech = Column(Boolean, default=False)
    offers_social = Column(Boolean, default=False)
    offers_aide = Column(Boolean, default=False)

    # Contact info (manually added)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_title = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)

    # Outreach tracking
    status = Column(String(50), default=LeadStatus.new.value, nullable=False, index=True)
    priority = Column(String(20), default="medium", nullable=False)
    notes = Column(Text, nullable=True)

    # Email campaign tracking
    last_email_sent_at = Column(DateTime(timezone=True), nullable=True)
    last_email_subject = Column(String(500), nullable=True)
    email_send_count = Column(Integer, default=0)
    email_open_count = Column(Integer, default=0)
    last_email_opened_at = Column(DateTime(timezone=True), nullable=True)
    last_response_at = Column(DateTime(timezone=True), nullable=True)
    resend_email_id = Column(String(255), nullable=True)

    # Campaign tagging
    campaign_tag = Column(String(100), nullable=True, index=True)
    source = Column(String(100), default="cms_provider_data")

    # Conversion tracking
    is_contacted = Column(Boolean, default=False)
    is_converted = Column(Boolean, default=False)
    converted_at = Column(DateTime(timezone=True), nullable=True)
    called_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Callback tracking
    callback_requested = Column(Boolean, default=False, nullable=False, server_default="false")
    callback_date = Column(DateTime(timezone=True), nullable=True)
    callback_notes = Column(Text, nullable=True)

    # Team assignment
    assigned_to = Column(String(36), nullable=True, index=True)
    assigned_type = Column(String(20), nullable=True)

    # Email sequence tracking
    sequence_step = Column(Integer, default=0)
    sequence_started_at = Column(DateTime(timezone=True), nullable=True)
    sequence_completed = Column(Boolean, default=False)
    next_email_scheduled_at = Column(DateTime(timezone=True), nullable=True)
    last_template_sent = Column(String(100), nullable=True)

    # Activity log stored as JSON array
    activity_log = Column(JSON, default=list)
