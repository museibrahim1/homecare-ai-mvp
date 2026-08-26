from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# --- Leads ---

class AgencyLeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_id: Optional[str] = None


class AgencyLeadCreate(AgencyLeadBase):
    pass


class AgencyLeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_id: Optional[str] = None


class AgencyLeadResponse(AgencyLeadBase):
    id: UUID
    created_by: UUID
    converted_at: Optional[datetime] = None
    converted_client_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AgencyLeadConvertRequest(BaseModel):
    insurance_type: Optional[str] = None
    insurance_id: Optional[str] = None
    care_level: Optional[str] = None
    estimated_monthly_value: Optional[int] = None


class LocalLeadMigrateItem(BaseModel):
    id: Optional[str] = None
    name: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    source: Optional[str] = "Website"
    status: Optional[str] = "New"
    notes: Optional[str] = ""
    created: Optional[str] = None
    insurance_type: Optional[str] = ""
    insurance_id: Optional[str] = ""


# --- Appointments ---

class AppointmentBase(BaseModel):
    title: str
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    appointment_date: date
    appointment_time: str
    duration_minutes: int = 60
    location: Optional[str] = None
    appointment_type: str = "visit"
    notes: Optional[str] = None
    google_event_id: Optional[str] = None
    is_follow_up: bool = False


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    client_id: Optional[UUID] = None
    client_name: Optional[str] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    google_event_id: Optional[str] = None
    is_follow_up: Optional[bool] = None


class AppointmentResponse(AppointmentBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocalAppointmentMigrateItem(BaseModel):
    id: Optional[str] = None
    title: str
    client: Optional[str] = None
    date: str
    time: str
    duration: Optional[int] = 60
    location: Optional[str] = None
    type: Optional[str] = "visit"
    notes: Optional[str] = None
    googleEventId: Optional[str] = None


# --- Care tracker ---

class CareTrackerEntryBase(BaseModel):
    client_id: UUID
    caregiver_id: Optional[UUID] = None
    stage: str = "follow_up"
    priority: str = "routine"
    care_specialty: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    last_contact: Optional[date] = None
    next_follow_up: Optional[date] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    assigned_to_name: Optional[str] = None


class CareTrackerEntryCreate(CareTrackerEntryBase):
    pass


class CareTrackerEntryUpdate(BaseModel):
    caregiver_id: Optional[UUID] = None
    stage: Optional[str] = None
    priority: Optional[str] = None
    care_specialty: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None
    last_contact: Optional[date] = None
    next_follow_up: Optional[date] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    assigned_to_name: Optional[str] = None


class CareTrackerEntryResponse(CareTrackerEntryBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocalCareTrackerMigrateItem(BaseModel):
    id: Optional[str] = None
    clientId: Optional[str] = None
    clientName: Optional[str] = None
    stage: Optional[str] = "follow_up"
    priority: Optional[str] = "routine"
    assignedTo: Optional[str] = None
    careSpecialty: Optional[str] = None
    startDate: Optional[str] = None
    targetDate: Optional[str] = None
    lastContact: Optional[str] = None
    nextFollowUp: Optional[str] = None
    notes: Optional[str] = None
    phone: Optional[str] = None


# --- Activity ---

class ClientActivityResponse(BaseModel):
    id: UUID
    client_id: UUID
    created_by: Optional[UUID] = None
    activity_type: str
    title: str
    description: Optional[str] = None
    metadata_json: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrmMigrateLocalRequest(BaseModel):
    leads: Optional[List[LocalLeadMigrateItem]] = None
    appointments: Optional[List[LocalAppointmentMigrateItem]] = None
    care_tracker: Optional[List[LocalCareTrackerMigrateItem]] = None


class CrmMigrateLocalResponse(BaseModel):
    leads_imported: int = 0
    appointments_imported: int = 0
    care_tracker_imported: int = 0
