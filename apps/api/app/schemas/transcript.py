from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class TranscriptSegmentResponse(BaseModel):
    id: UUID
    visit_id: UUID
    start_ms: int
    end_ms: int
    text: str
    speaker_label: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptResponse(BaseModel):
    visit_id: UUID
    segments: List[TranscriptSegmentResponse]
    total_duration_ms: int
    word_count: int
