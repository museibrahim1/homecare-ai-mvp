"""
SmartNote, Task, and Reminder Schemas
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


# ── SmartNote ──

class SmartNoteCreate(BaseModel):
    title: str
    content: str = ""
    tags: Optional[List[str]] = []
    is_pinned: Optional[bool] = False
    color: Optional[str] = "default"
    related_client_id: Optional[UUID] = None
    source: Optional[str] = "manual"


class SmartNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    color: Optional[str] = None
    related_client_id: Optional[UUID] = None


class SmartNoteResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    content: str
    ai_summary: Optional[str] = None
    tags: Optional[List[str]] = []
    is_pinned: bool
    color: str
    related_client_id: Optional[UUID] = None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SmartNoteDetail(SmartNoteResponse):
    tasks: List["TaskResponse"] = []
    reminders: List["ReminderResponse"] = []


# ── Task ──

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None
    smart_note_id: Optional[UUID] = None
    related_client_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    related_client_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None


class TaskResponse(BaseModel):
    id: UUID
    user_id: UUID
    smart_note_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    related_client_id: Optional[UUID] = None
    assigned_to_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Reminder ──

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    reminder_type: Optional[str] = "one_time"
    task_id: Optional[UUID] = None
    smart_note_id: Optional[UUID] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    remind_at: Optional[datetime] = None
    reminder_type: Optional[str] = None


class ReminderResponse(BaseModel):
    id: UUID
    user_id: UUID
    task_id: Optional[UUID] = None
    smart_note_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    remind_at: datetime
    is_dismissed: bool
    reminder_type: str
    notification_sent: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Forward ref resolution
SmartNoteDetail.model_rebuild()
