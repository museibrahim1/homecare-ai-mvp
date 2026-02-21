from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class IncidentUpdateCreate(BaseModel):
    status: str
    message: str


class IncidentUpdateResponse(BaseModel):
    id: UUID
    incident_id: UUID
    status: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentCreate(BaseModel):
    title: str
    impact: str = "minor"
    service_name: str = "PalmCare AI Platform"
    status: str = "investigating"
    message: str


class IncidentResponse(BaseModel):
    id: UUID
    title: str
    status: str
    impact: str
    service_name: str
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    updates: List[IncidentUpdateResponse] = []

    class Config:
        from_attributes = True


class StatusOverview(BaseModel):
    overall_status: str
    overall_impact: str
    services: List[dict]
    active_incidents: List[IncidentResponse]
    recent_incidents: List[IncidentResponse]
