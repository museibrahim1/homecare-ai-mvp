"""
Caregiver Model

Stores caregiver information for assignment to clients.
Caregivers don't use the app - they're managed by administrators.
"""

import uuid
from sqlalchemy import Column, String, Text, Boolean, Date, Integer, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin


class Caregiver(Base, TimestampMixin):
    __tablename__ = "caregivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Data isolation - track who created this caregiver
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Basic Info
    full_name = Column(String(255), nullable=False)
    preferred_name = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    
    # Contact
    phone = Column(String(20))
    phone_secondary = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    
    # Professional Info
    employee_id = Column(String(100))
    hire_date = Column(Date)
    certification_level = Column(String(100))  # CNA, HHA, RN, LPN, etc.
    certifications = Column(JSONB, default=list)  # List of certifications with expiry dates
    specializations = Column(JSONB, default=list)  # e.g., ["dementia", "diabetes", "mobility"]
    languages = Column(JSONB, default=list)  # e.g., ["English", "Spanish"]
    
    # Care Capabilities
    can_handle_high_care = Column(Boolean, default=False)
    can_handle_moderate_care = Column(Boolean, default=True)
    can_handle_low_care = Column(Boolean, default=True)
    max_clients = Column(Integer, default=5)
    current_client_count = Column(Integer, default=0)
    
    # Availability
    available_days = Column(String(255))  # e.g., "Mon,Tue,Wed,Thu,Fri"
    available_hours = Column(String(255))  # e.g., "8AM-5PM"
    preferred_areas = Column(Text)  # Geographic areas they prefer
    max_travel_miles = Column(Integer, default=25)
    
    # Performance
    years_experience = Column(Integer, default=0)
    rating = Column(Float, default=5.0)  # 1-5 rating
    total_assignments = Column(Integer, default=0)
    
    # Status
    status = Column(String(50), default='active')  # active, inactive, on_leave
    
    # Notes
    notes = Column(Text)
    background_check_date = Column(Date)
    background_check_status = Column(String(50))  # passed, pending, failed
    
    # External Integration
    external_id = Column(String(255))
    external_source = Column(String(100))  # e.g., "monday", "workday", "csv"

    __table_args__ = (
        Index('ix_caregivers_created_by', 'created_by'),
        Index('ix_caregivers_status', 'status'),
        Index('ix_caregivers_email', 'email'),
    )
