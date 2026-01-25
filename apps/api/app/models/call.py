"""
Call Model

Database model for tracking Twilio call bridges and recordings.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base


class CallStatus(str, enum.Enum):
    """Status of a call bridge."""
    INITIATED = "initiated"
    CAREGIVER_RINGING = "caregiver_ringing"
    CAREGIVER_CONNECTED = "caregiver_connected"
    CLIENT_RINGING = "client_ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NO_ANSWER = "no_answer"
    BUSY = "busy"
    CANCELLED = "cancelled"


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Call(Base, TimestampMixin):
    """
    Represents a recorded call bridge between caregiver and client.
    
    The call flow is:
    1. initiated - API call made to start the bridge
    2. caregiver_ringing - Twilio calling caregiver
    3. caregiver_connected - Caregiver answered, in conference
    4. client_ringing - Twilio calling client
    5. in_progress - Both parties connected, recording
    6. completed - Call ended, recording available
    """
    __tablename__ = "calls"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Twilio identifiers
    caregiver_call_sid = Column(String(50))  # Twilio SID for caregiver leg
    client_call_sid = Column(String(50))  # Twilio SID for client leg
    conference_sid = Column(String(50))  # Twilio conference SID
    recording_sid = Column(String(50))  # Twilio recording SID
    
    # Related entities
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Who initiated
    
    # Phone numbers
    caregiver_phone = Column(String(20), nullable=False)
    client_phone = Column(String(20), nullable=False)
    twilio_phone = Column(String(20))  # The Twilio number used
    
    # Status tracking
    status = Column(SQLEnum(CallStatus), default=CallStatus.INITIATED)
    error_message = Column(Text)
    
    # Call timing
    started_at = Column(DateTime(timezone=True))  # When call actually started (both connected)
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)  # Duration in seconds
    
    # Recording info
    recording_url = Column(String(500))
    recording_duration_seconds = Column(Integer)
    recording_file_path = Column(String(500))  # Local storage path after download
    
    # Consent tracking
    caregiver_consent_at = Column(DateTime(timezone=True))
    client_consent_at = Column(DateTime(timezone=True))
    consent_message_played = Column(Boolean, default=False)
    
    # Processing status
    recording_downloaded = Column(Boolean, default=False)
    pipeline_submitted = Column(Boolean, default=False)
    audio_asset_id = Column(UUID(as_uuid=True))  # Link to audio_assets table after processing
    
    # Metadata
    call_metadata = Column(JSONB, default=dict)  # Store additional Twilio callback data
    
    # Relationships
    visit = relationship("Visit", back_populates="calls")
    client = relationship("Client", back_populates="calls")
    
    def __repr__(self):
        return f"<Call {self.id} status={self.status}>"
    
    @property
    def is_active(self) -> bool:
        """Check if call is currently active."""
        return self.status in [
            CallStatus.INITIATED,
            CallStatus.CAREGIVER_RINGING,
            CallStatus.CAREGIVER_CONNECTED,
            CallStatus.CLIENT_RINGING,
            CallStatus.IN_PROGRESS,
        ]
    
    @property
    def is_completed(self) -> bool:
        """Check if call completed successfully."""
        return self.status == CallStatus.COMPLETED
    
    @property
    def has_recording(self) -> bool:
        """Check if call has a recording available."""
        return bool(self.recording_sid or self.recording_url)
