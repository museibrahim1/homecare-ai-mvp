"""
Agency Settings Model

Stores agency-wide settings including branding, templates, contact info,
billing configuration, and service rates. The AI reads these fields to
generate contracts with the correct rates — no guessing.
Each user has their own settings (data isolation).
"""

import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin


class AgencySettings(Base, TimestampMixin):
    __tablename__ = "agency_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Data isolation - each user has their own settings
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Agency Information
    name = Column(String(255), nullable=False, default="Home Care Services Agency")
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    
    # Business Identifiers
    tax_id = Column(String(50))  # EIN / Tax ID
    license_number = Column(String(100))
    npi_number = Column(String(20))  # National Provider Identifier
    
    # Primary Contact
    contact_person = Column(String(255))
    contact_title = Column(String(100))
    
    # ── Billing & Rate Configuration ──
    # How the agency charges clients. The AI uses these values directly
    # instead of falling back to hardcoded defaults.
    pay_sources = Column(JSONB, default=list)            # ["medicaid","medicare","private_pay","insurance","va"]
    service_types = Column(JSONB, default=list)           # ["personal_care","skilled_nursing","companion","respite","homemaker"]
    billing_type = Column(String(50), default="hourly")   # hourly | per_visit | daily | live_in
    
    default_hourly_rate = Column(Numeric(10, 2))          # Fallback rate when no specific rate matches
    medicaid_companion_rate = Column(Numeric(10, 2))      # Medicaid companion care $/hr
    medicaid_personal_care_rate = Column(Numeric(10, 2))  # Medicaid personal care $/hr
    medicaid_respite_rate = Column(Numeric(10, 2))        # Medicaid respite $/hr
    medicare_skilled_rate = Column(Numeric(10, 2))        # Medicare skilled nursing $/hr
    medicare_aide_rate = Column(Numeric(10, 2))           # Medicare home health aide $/hr
    private_pay_rate = Column(Numeric(10, 2))             # Private pay base $/hr
    
    overtime_multiplier = Column(Numeric(4, 2), default=1.5)
    min_hours_per_visit = Column(Numeric(4, 1), default=2.0)
    min_hours_per_week = Column(Numeric(5, 1), default=4.0)
    max_hours_per_week = Column(Numeric(5, 1), default=60.0)
    
    accepts_medicaid = Column(Boolean, default=False)
    accepts_medicare = Column(Boolean, default=False)
    accepts_private_pay = Column(Boolean, default=True)
    accepts_insurance = Column(Boolean, default=False)
    accepts_va = Column(Boolean, default=False)
    
    onboarding_completed = Column(Boolean, default=False)
    
    # Branding
    logo = Column(Text)  # Base64 encoded
    primary_color = Column(String(20), default="#1e3a8a")
    secondary_color = Column(String(20), default="#3b82f6")
    
    # Documents Storage (JSON array of uploaded documents)
    documents = Column(Text)  # JSON array of document objects
    
    # Legacy fields (kept for backward compatibility)
    contract_template = Column(Text)  # Base64 encoded file
    contract_template_name = Column(String(255))
    contract_template_type = Column(String(100))  # mime type
    
    # Default Policies
    cancellation_policy = Column(Text)
    terms_and_conditions = Column(Text)
    
    # Settings key (for singleton pattern - there should only be one)
    settings_key = Column(String(50), unique=True, default="default")
