"""
SmartNote Model

AI-powered note-taking with task extraction and reminders.
"""

import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin


class SmartNote(Base, TimestampMixin):
    __tablename__ = "smart_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False, default="")
    ai_summary = Column(Text)
    tags = Column(JSONB, default=list)
    is_pinned = Column(Boolean, default=False)
    color = Column(String(20), default="default")
    related_client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    source = Column(String(20), nullable=False, default="manual")  # manual, voice, meeting, call

    __table_args__ = (
        Index("ix_smart_notes_user", "user_id"),
        Index("ix_smart_notes_pinned", "user_id", "is_pinned"),
        Index("ix_smart_notes_client", "related_client_id"),
    )
