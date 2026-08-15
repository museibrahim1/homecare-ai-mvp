"""Email preference / unsubscribe categories per address."""

from sqlalchemy import Column, String, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.base import Base, TimestampMixin


class EmailPreference(Base, TimestampMixin):
    """Opt-in flags for marketing categories. Account mail is never gated here.

    True  = still subscribed to that category
    False = opted out of that category
    """

    __tablename__ = "email_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), nullable=False, unique=True, index=True)

    # Sales / demo / cold outreach
    outreach = Column(Boolean, nullable=False, default=True, server_default="true")
    # Product tips, feature updates, how-to
    product_updates = Column(Boolean, nullable=False, default=True, server_default="true")
    # News, launches, announcements
    announcements = Column(Boolean, nullable=False, default=True, server_default="true")

    __table_args__ = (Index("ix_email_preferences_email_lower", "email"),)

    @property
    def all_marketing_off(self) -> bool:
        return not (self.outreach or self.product_updates or self.announcements)
