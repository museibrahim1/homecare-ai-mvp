"""
Agency Settings Model

Stores agency-wide settings including branding, templates, and contact info.
"""

import uuid
from sqlalchemy import Column, String, Text, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class AgencySettings(Base, TimestampMixin):
    __tablename__ = "agency_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Agency Information
    name = Column(String(255), nullable=False, default="Home Care Services Agency")
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    phone = Column(String(20))
    email = Column(String(255))
    website = Column(String(255))
    
    # Branding
    logo = Column(Text)  # Base64 encoded
    primary_color = Column(String(20), default="#1e3a8a")
    secondary_color = Column(String(20), default="#3b82f6")
    
    # Contract Template
    contract_template = Column(Text)  # Base64 encoded file
    contract_template_name = Column(String(255))
    contract_template_type = Column(String(100))  # mime type
    
    # Default Policies
    cancellation_policy = Column(Text)
    terms_and_conditions = Column(Text)
    
    # Settings key (for singleton pattern - there should only be one)
    settings_key = Column(String(50), unique=True, default="default")
