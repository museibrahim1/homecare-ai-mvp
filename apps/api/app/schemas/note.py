from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class NoteResponse(BaseModel):
    id: UUID
    visit_id: UUID
    structured_data: Dict[str, Any]
    narrative: Optional[str] = None
    is_approved: bool
    approved_by_id: Optional[UUID] = None
    version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NoteUpdate(BaseModel):
    structured_data: Optional[Dict[str, Any]] = None
    narrative: Optional[str] = None
    is_approved: Optional[bool] = None
