from typing import List
from uuid import UUID
from pydantic import BaseModel


class TimesheetRow(BaseModel):
    visit_id: UUID
    client_name: str
    caregiver_name: str
    date: str
    start_time: str
    end_time: str
    category: str
    minutes: int
    adjusted_minutes: int
    is_approved: bool


class TimesheetExport(BaseModel):
    rows: List[TimesheetRow]
    total_minutes: int
    total_adjusted_minutes: int
