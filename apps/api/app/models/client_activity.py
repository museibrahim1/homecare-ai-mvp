import uuid
from sqlalchemy import Column, String, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.base import Base, TimestampMixin


class ClientActivity(Base, TimestampMixin):
    __tablename__ = "client_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    activity_type = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)

    __table_args__ = (
        Index("ix_client_activities_client", "client_id", "created_at"),
        Index("ix_client_activities_type", "activity_type"),
    )
