from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel


class BillableItemResponse(BaseModel):
    id: UUID
    visit_id: UUID
    code: str
    category: str
    description: Optional[str] = None
    start_ms: int
    end_ms: int
    minutes: int
    evidence: List[Dict[str, Any]]
    is_approved: bool
    is_flagged: bool
    flag_reason: Optional[str] = None
    adjusted_minutes: Optional[int] = None
    adjustment_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BillableItemUpdate(BaseModel):
    is_approved: Optional[bool] = None
    is_flagged: Optional[bool] = None
    flag_reason: Optional[str] = None
    adjusted_minutes: Optional[int] = None
    adjustment_reason: Optional[str] = None


class BillingResponse(BaseModel):
    visit_id: UUID
    items: List[BillableItemResponse]
    total_minutes: int
    total_adjusted_minutes: int
    categories: Dict[str, int]  # category -> minutes
