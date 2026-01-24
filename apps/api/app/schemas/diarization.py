from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class DiarizationTurnResponse(BaseModel):
    id: UUID
    visit_id: UUID
    speaker: str
    start_ms: int
    end_ms: int
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiarizationResponse(BaseModel):
    visit_id: UUID
    turns: List[DiarizationTurnResponse]
    speakers: List[str]
    total_turns: int
