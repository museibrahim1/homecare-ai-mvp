from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel

from app.schemas.client import ClientResponse
from app.schemas.user import UserResponse


class VisitBase(BaseModel):
    client_id: UUID
    caregiver_id: Optional[UUID] = None  # Optional - defaults to current user
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    admin_notes: Optional[str] = None


class VisitCreate(VisitBase):
    pass


class VisitUpdate(BaseModel):
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class VisitResponse(BaseModel):
    id: UUID
    client_id: UUID
    caregiver_id: UUID
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: str
    pipeline_state: Dict[str, Any]
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested
    client: Optional[ClientResponse] = None
    caregiver: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class VisitListResponse(BaseModel):
    items: List[VisitResponse]
    total: int
    page: int
    page_size: int
