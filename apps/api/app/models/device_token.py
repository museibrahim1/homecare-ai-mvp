import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base, TimestampMixin


class DeviceToken(Base, TimestampMixin):
    """A registered push-notification token for a user's device (APNs/FCM)."""

    __tablename__ = "device_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(512), nullable=False, unique=True, index=True)
    platform = Column(String(20), nullable=False, default="ios")  # ios | android
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
