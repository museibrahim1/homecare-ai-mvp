import uuid
import enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class InvestorStatus(str, enum.Enum):
    new = "new"
    researched = "researched"
    contacted = "contacted"
    email_sent = "email_sent"
    email_opened = "email_opened"
    responded = "responded"
    meeting_scheduled = "meeting_scheduled"
    pitch_sent = "pitch_sent"
    interested = "interested"
    passed = "passed"
    committed = "committed"
    not_relevant = "not_relevant"


class InvestorType(str, enum.Enum):
    vc_fund = "vc_fund"
    angel = "angel"
    accelerator = "accelerator"
    corporate_vc = "corporate_vc"
    family_office = "family_office"
    syndicate = "syndicate"


class Investor(Base, TimestampMixin):
    """
    Investor CRM for fundraising outreach.
    Separate from SalesLead (agency prospects).
    PRIVATE: Only visible to platform admin (CEO account).
    """
    __tablename__ = "investors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Fund / investor info
    fund_name = Column(String(500), nullable=False, index=True)
    investor_type = Column(String(50), default=InvestorType.vc_fund.value)
    website = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    # Focus areas
    focus_sectors = Column(JSON, default=list)  # ["AI", "HealthTech", "SaaS"]
    focus_stages = Column(JSON, default=list)  # ["Pre-Seed", "Seed"]

    # Check size
    check_size_min = Column(String(50), nullable=True)  # e.g. "$100K"
    check_size_max = Column(String(50), nullable=True)  # e.g. "$5M"
    check_size_display = Column(String(100), nullable=True)  # e.g. "$100K - $5M"

    # Location
    location = Column(String(255), nullable=True)

    # Contact info
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_title = Column(String(255), nullable=True)
    contact_linkedin = Column(String(500), nullable=True)
    contact_twitter = Column(String(255), nullable=True)

    # Portfolio signals (why relevant to PalmCare)
    relevance_reason = Column(Text, nullable=True)
    portfolio_companies = Column(JSON, default=list)

    # Source tracking
    source = Column(String(100), default="vcsheet.com")

    # Outreach tracking
    status = Column(String(50), default=InvestorStatus.new.value, nullable=False, index=True)
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

    # Activity log stored as JSON array
    activity_log = Column(JSON, default=list)
