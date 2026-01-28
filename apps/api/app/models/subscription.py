"""
Subscription and Plan Models

Tracks business subscriptions and billing.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Numeric, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlanTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"


class Plan(Base):
    """Available subscription plans."""
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    tier = Column(SQLEnum(PlanTier), nullable=False, default=PlanTier.FREE)
    description = Column(Text)
    
    # Pricing
    monthly_price = Column(Numeric(10, 2), default=0)
    annual_price = Column(Numeric(10, 2), default=0)  # Annual = 10 months (2 months free)
    setup_fee = Column(Numeric(10, 2), default=0)  # One-time setup fee
    
    # Stripe Integration
    # Product ID (represents the plan in Stripe)
    stripe_product_id = Column(String(255))  # prod_xxxxx
    
    # Price IDs for recurring subscription
    stripe_price_id_monthly = Column(String(255))  # price_xxxxx (monthly recurring)
    stripe_price_id_annual = Column(String(255))   # price_xxxxx (annual recurring)
    
    # Setup fee as one-time price
    stripe_price_id_setup = Column(String(255))    # price_xxxxx (one-time setup fee)
    
    # Limits
    max_users = Column(Integer, default=1)
    max_clients = Column(Integer, default=10)
    max_visits_per_month = Column(Integer, default=50)
    max_storage_gb = Column(Integer, default=1)
    
    # Features
    features = Column(Text)  # JSON list of feature strings
    is_contact_sales = Column(Boolean, default=False)  # True for Enterprise
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    """Business subscriptions."""
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    
    status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    
    # Billing
    billing_cycle = Column(String(20), default="monthly")  # monthly, annual
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    
    # Trial
    trial_ends_at = Column(DateTime(timezone=True))
    
    # Payment info (external reference)
    stripe_subscription_id = Column(String(255))
    stripe_customer_id = Column(String(255))
    
    # Usage tracking
    visits_this_month = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)
    
    cancelled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    business = relationship("Business", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")


class Invoice(Base):
    """Billing invoices."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id"), nullable=False)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    
    # Invoice details
    invoice_number = Column(String(50), unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(20), default="pending")  # pending, paid, failed, refunded
    
    # Dates
    invoice_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    due_date = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    
    # External reference
    stripe_invoice_id = Column(String(255))
    
    # Description
    description = Column(Text)
    line_items = Column(Text)  # JSON
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
