"""
Caregiver Schemas
"""

from datetime import datetime, date
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr


class CaregiverBase(BaseModel):
    full_name: str
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
    employee_id: Optional[str] = None
    hire_date: Optional[date] = None
    certification_level: Optional[str] = None
    certifications: Optional[List[Any]] = []
    specializations: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    can_handle_high_care: Optional[bool] = False
    can_handle_moderate_care: Optional[bool] = True
    can_handle_low_care: Optional[bool] = True
    max_clients: Optional[int] = 5
    current_client_count: Optional[int] = 0
    available_days: Optional[str] = None
    available_hours: Optional[str] = None
    preferred_areas: Optional[str] = None
    max_travel_miles: Optional[int] = 25
    years_experience: Optional[int] = 0
    rating: Optional[float] = 5.0
    total_assignments: Optional[int] = 0
    status: Optional[str] = 'active'
    notes: Optional[str] = None
    background_check_date: Optional[date] = None
    background_check_status: Optional[str] = None
    external_id: Optional[str] = None
    external_source: Optional[str] = None


class CaregiverCreate(CaregiverBase):
    pass


class CaregiverUpdate(BaseModel):
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
    employee_id: Optional[str] = None
    hire_date: Optional[date] = None
    certification_level: Optional[str] = None
    certifications: Optional[List[Any]] = None
    specializations: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    can_handle_high_care: Optional[bool] = None
    can_handle_moderate_care: Optional[bool] = None
    can_handle_low_care: Optional[bool] = None
    max_clients: Optional[int] = None
    current_client_count: Optional[int] = None
    available_days: Optional[str] = None
    available_hours: Optional[str] = None
    preferred_areas: Optional[str] = None
    max_travel_miles: Optional[int] = None
    years_experience: Optional[int] = None
    rating: Optional[float] = None
    total_assignments: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    background_check_date: Optional[date] = None
    background_check_status: Optional[str] = None


class CaregiverResponse(CaregiverBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CaregiverListResponse(BaseModel):
    id: UUID
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    certification_level: Optional[str] = None
    specializations: Optional[List[str]] = []
    can_handle_high_care: Optional[bool] = False
    status: Optional[str] = 'active'
    current_client_count: Optional[int] = 0
    max_clients: Optional[int] = 5
    rating: Optional[float] = 5.0

    class Config:
        from_attributes = True


class CaregiverMatchRequest(BaseModel):
    care_level: str  # HIGH, MODERATE, LOW
    specializations_needed: Optional[List[str]] = []
    preferred_language: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class CaregiverMatchResponse(BaseModel):
    caregiver: CaregiverListResponse
    match_score: float
    match_reasons: List[str]
