"""
Reminder Model

Time-based notifications linked to tasks or notes.
"""

import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Index, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    smart_note_id = Column(UUID(as_uuid=True), ForeignKey("smart_notes.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    is_dismissed = Column(Boolean, default=False)
    reminder_type = Column(String(20), nullable=False, default="one_time")  # one_time, daily, weekly
    notification_sent = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: __import__('datetime').datetime.now(__import__('datetime').timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_reminders_user", "user_id"),
        Index("ix_reminders_due", "user_id", "remind_at", "is_dismissed"),
        Index("ix_reminders_task", "task_id"),
    )
