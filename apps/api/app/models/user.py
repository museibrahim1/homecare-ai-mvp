import uuid
from sqlalchemy import Column, String, Boolean, Enum, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from app.db.types import JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
from app.core.encryption import encrypt_field, decrypt_field
import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    caregiver = "caregiver"
    user = "user"  # For business owners


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default='caregiver', nullable=False)  # String to be flexible
    is_active = Column(Boolean, default=True, nullable=False)
    phone = Column(String(20), nullable=True)
    company_name = Column(String(255), nullable=True)  # For business owners
    
    # Google Calendar Integration (OAuth tokens encrypted at rest)
    # The SQL column names stay the same so no migration is needed; the
    # Python attributes are exposed via encrypt/decrypt properties below.
    google_calendar_connected = Column(Boolean, default=False, nullable=False)
    _google_calendar_access_token = Column("google_calendar_access_token", Text, nullable=True)
    _google_calendar_refresh_token = Column("google_calendar_refresh_token", Text, nullable=True)
    google_calendar_token_expiry = Column(DateTime(timezone=True), nullable=True)

    # "Send from my business email" — the caregiver/agency connects their own
    # mailbox (Google Workspace / Gmail, gmail.send scope) so agreements are
    # sent from their address and land in their Sent folder. Tokens encrypted
    # at rest; kept separate from the calendar/inbox integration above so this
    # narrow-scope connection never disturbs the broader Google integration.
    email_sender_connected = Column(Boolean, default=False, nullable=False, server_default="false")
    email_sender_provider = Column(String(20), nullable=True)  # 'google'
    email_sender_address = Column(String(255), nullable=True)
    _email_sender_access_token = Column("email_sender_access_token", Text, nullable=True)
    _email_sender_refresh_token = Column("email_sender_refresh_token", Text, nullable=True)
    email_sender_token_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Force logout: tokens issued before this timestamp are rejected
    force_logout_at = Column(DateTime(timezone=True), nullable=True)
    
    # Password reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    
    # Voiceprint for speaker identification (encrypted at rest)
    _voiceprint_encrypted = Column("voiceprint", Text, nullable=True)
    voiceprint_created_at = Column(DateTime(timezone=True), nullable=True)
    
    # MFA (TOTP)
    mfa_secret = Column(String(255), nullable=True)
    mfa_enabled = Column(Boolean, default=False, nullable=False, server_default="false")
    
    # Password history (last 5 hashes) for HIPAA password reuse prevention
    password_history = Column(JSONB, default=list, server_default="[]")

    # Team permissions (list of permission strings)
    permissions = Column(JSONB, default=list, server_default="[]")
    invited_by = Column(String(36), nullable=True)
    temp_password = Column(Boolean, default=False, nullable=False, server_default="false")

    # Executive title for C-suite/leadership team (CEO, CFO, CMO, CSO, CTO, etc.)
    executive_title = Column(String(100), nullable=True)

    # Assigned calling states/territories (e.g. ["FL","TX","CA"])
    calling_states = Column(JSONB, default=list, server_default="[]")

    # Activity tracking for admin team members
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_active = Column(DateTime(timezone=True), nullable=True)
    total_session_minutes = Column(JSONB, default=dict, server_default="{}")
    
    @property
    def voiceprint(self):
        return decrypt_field(self._voiceprint_encrypted)

    @voiceprint.setter
    def voiceprint(self, value):
        self._voiceprint_encrypted = encrypt_field(value)

    @property
    def google_calendar_access_token(self):
        return decrypt_field(self._google_calendar_access_token)

    @google_calendar_access_token.setter
    def google_calendar_access_token(self, value):
        self._google_calendar_access_token = encrypt_field(value) if value else None

    @property
    def google_calendar_refresh_token(self):
        return decrypt_field(self._google_calendar_refresh_token)

    @google_calendar_refresh_token.setter
    def google_calendar_refresh_token(self, value):
        self._google_calendar_refresh_token = encrypt_field(value) if value else None

    @property
    def email_sender_access_token(self):
        return decrypt_field(self._email_sender_access_token)

    @email_sender_access_token.setter
    def email_sender_access_token(self, value):
        self._email_sender_access_token = encrypt_field(value) if value else None

    @property
    def email_sender_refresh_token(self):
        return decrypt_field(self._email_sender_refresh_token)

    @email_sender_refresh_token.setter
    def email_sender_refresh_token(self, value):
        self._email_sender_refresh_token = encrypt_field(value) if value else None

    # Relationships
    visits_as_caregiver = relationship("Visit", back_populates="caregiver", foreign_keys="Visit.caregiver_id")
    audit_logs = relationship("AuditLog", back_populates="user")
