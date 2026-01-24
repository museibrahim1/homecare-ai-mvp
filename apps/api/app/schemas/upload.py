from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: UUID
    visit_id: UUID
    s3_key: str
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    duration_ms: Optional[int] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
