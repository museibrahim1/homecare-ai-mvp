import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class EmailCampaignEvent(Base):
    __tablename__ = "email_campaign_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("sales_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(100), nullable=False, index=True)
    campaign_tag = Column(String(100), nullable=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    resend_email_id = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    to_email = Column(String(255), nullable=True)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False)


class UsageAnalytics(Base):
    __tablename__ = "usage_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_data = Column(JSON, default=dict)
    page_path = Column(String(500), nullable=True)
    session_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)


class ProviderEngagement(Base):
    __tablename__ = "provider_engagement"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    business_name = Column(String(500), nullable=True)

    total_logins = Column(Integer, default=0)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    logins_last_7d = Column(Integer, default=0)
    logins_last_30d = Column(Integer, default=0)

    assessments_created = Column(Integer, default=0)
    clients_added = Column(Integer, default=0)
    contracts_generated = Column(Integer, default=0)
    notes_created = Column(Integer, default=0)

    engagement_score = Column(Float, default=0)
    churn_risk = Column(String(20), default="low", index=True)
    days_since_last_activity = Column(Integer, default=0)

    plan_tier = Column(String(50), nullable=True)
    subscription_status = Column(String(50), nullable=True)
    mrr = Column(Float, default=0)

    created_at = Column(DateTime(timezone=True), nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False)
