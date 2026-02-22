"""
Task Model

Actionable items extracted from SmartNotes or created manually.
"""

import uuid
from sqlalchemy import Column, String, Text, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import DateTime
from app.db.base import Base, TimestampMixin


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    smart_note_id = Column(UUID(as_uuid=True), ForeignKey("smart_notes.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False, default="todo")  # todo, in_progress, done, cancelled
    priority = Column(String(20), nullable=False, default="medium")  # low, medium, high, urgent
    due_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))
    related_client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("ix_tasks_user", "user_id"),
        Index("ix_tasks_status", "user_id", "status"),
        Index("ix_tasks_due", "user_id", "due_date"),
        Index("ix_tasks_note", "smart_note_id"),
    )
