import uuid
from sqlalchemy import Column, String, Date, Text, Index, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # === OWNERSHIP - For data isolation ===
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # === BASIC INFORMATION ===
    full_name = Column(String(255), nullable=False)
    preferred_name = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)  # Male, Female, Other, Prefer not to say
    
    # === CONTACT INFORMATION ===
    phone = Column(String(20), nullable=True)
    phone_secondary = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    
    # === EMERGENCY CONTACTS ===
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)
    emergency_contact_2_name = Column(String(255), nullable=True)
    emergency_contact_2_phone = Column(String(20), nullable=True)
    emergency_contact_2_relationship = Column(String(100), nullable=True)
    
    # === MEDICAL INFORMATION ===
    primary_diagnosis = Column(String(255), nullable=True)
    secondary_diagnoses = Column(Text, nullable=True)  # Comma separated or JSON
    allergies = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    physician_name = Column(String(255), nullable=True)
    physician_phone = Column(String(20), nullable=True)
    medical_notes = Column(Text, nullable=True)
    
    # === CARE INFORMATION ===
    mobility_status = Column(String(100), nullable=True)  # Independent, Walker, Wheelchair, Bedbound
    cognitive_status = Column(String(100), nullable=True)  # Intact, Mild impairment, Moderate, Severe
    living_situation = Column(String(100), nullable=True)  # Alone, With spouse, With family, Facility
    care_level = Column(String(50), nullable=True)  # LOW, MODERATE, HIGH
    care_plan = Column(Text, nullable=True)
    special_requirements = Column(Text, nullable=True)
    
    # === INSURANCE & BILLING ===
    insurance_provider = Column(String(255), nullable=True)
    insurance_id = Column(String(100), nullable=True)
    medicaid_id = Column(String(100), nullable=True)
    medicare_id = Column(String(100), nullable=True)
    billing_address = Column(Text, nullable=True)
    
    # === SCHEDULING PREFERENCES ===
    preferred_days = Column(String(255), nullable=True)  # e.g., "Monday, Wednesday, Friday"
    preferred_times = Column(String(255), nullable=True)  # e.g., "Morning", "9am-12pm"
    
    # === STATUS ===
    status = Column(String(50), default='active')  # active, inactive, discharged, pending
    intake_date = Column(Date, nullable=True)
    discharge_date = Column(Date, nullable=True)
    
    # === NOTES ===
    notes = Column(Text, nullable=True)
    
    # === EXTERNAL SYSTEM INTEGRATION ===
    external_id = Column(String(255), nullable=True)
    external_source = Column(String(100), nullable=True)  # e.g., "monday.com", "salesforce"
    
    # === RELATIONSHIPS ===
    visits = relationship("Visit", back_populates="client")
    contracts = relationship("Contract", back_populates="client")
    calls = relationship("Call", back_populates="client")
    
    # Indexes for faster lookups
    __table_args__ = (
        Index('ix_clients_external', 'external_source', 'external_id'),
        Index('ix_clients_email', 'email'),
        Index('ix_clients_status', 'status'),
    )
