from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class ClientBase(BaseModel):
    # Basic Information
    full_name: str
    preferred_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    
    # Contact Information
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    
    # Emergency Contacts
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_2_name: Optional[str] = None
    emergency_contact_2_phone: Optional[str] = None
    emergency_contact_2_relationship: Optional[str] = None
    
    # Medical Information
    primary_diagnosis: Optional[str] = None
    secondary_diagnoses: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    physician_name: Optional[str] = None
    physician_phone: Optional[str] = None
    medical_notes: Optional[str] = None
    
    # Care Information
    mobility_status: Optional[str] = None
    cognitive_status: Optional[str] = None
    living_situation: Optional[str] = None
    care_level: Optional[str] = None
    care_plan: Optional[str] = None
    special_requirements: Optional[str] = None
    
    # Insurance & Billing
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None
    billing_address: Optional[str] = None
    
    # Scheduling Preferences
    preferred_days: Optional[str] = None
    preferred_times: Optional[str] = None
    
    # Status
    status: Optional[str] = "active"
    intake_date: Optional[date] = None
    discharge_date: Optional[date] = None
    
    # Notes
    notes: Optional[str] = None
    
    # External Integration
    external_id: Optional[str] = None
    external_source: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    # All fields optional for updates
    full_name: Optional[str] = None
    preferred_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    emergency_contact_2_name: Optional[str] = None
    emergency_contact_2_phone: Optional[str] = None
    emergency_contact_2_relationship: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    secondary_diagnoses: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    physician_name: Optional[str] = None
    physician_phone: Optional[str] = None
    medical_notes: Optional[str] = None
    mobility_status: Optional[str] = None
    cognitive_status: Optional[str] = None
    living_situation: Optional[str] = None
    care_level: Optional[str] = None
    care_plan: Optional[str] = None
    special_requirements: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    medicaid_id: Optional[str] = None
    medicare_id: Optional[str] = None
    billing_address: Optional[str] = None
    preferred_days: Optional[str] = None
    preferred_times: Optional[str] = None
    status: Optional[str] = None
    intake_date: Optional[date] = None
    discharge_date: Optional[date] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Simplified response for client lists"""
    id: UUID
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    care_level: Optional[str] = None
    primary_diagnosis: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
