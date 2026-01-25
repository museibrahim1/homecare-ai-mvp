"""
Call Schemas

Pydantic schemas for call-related requests and responses.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class CallStatusEnum(str, Enum):
    """Call status enum for API responses."""
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


# =============================================================================
# Request Schemas
# =============================================================================

class CallInitiateRequest(BaseModel):
    """Request to initiate a new call bridge."""
    caregiver_phone: str = Field(..., description="Caregiver's phone number")
    client_phone: str = Field(..., description="Client's phone number")
    visit_id: Optional[UUID] = Field(None, description="Associated visit ID")
    client_id: Optional[UUID] = Field(None, description="Associated client ID")
    caregiver_name: Optional[str] = Field("Care Provider", description="Name for announcements")
    client_name: Optional[str] = Field("Client", description="Name for announcements")
    
    class Config:
        json_schema_extra = {
            "example": {
                "caregiver_phone": "+15551234567",
                "client_phone": "+15559876543",
                "visit_id": "550e8400-e29b-41d4-a716-446655440000",
                "caregiver_name": "Jane Smith",
                "client_name": "John Doe"
            }
        }


class CallEndRequest(BaseModel):
    """Request to end an active call."""
    reason: Optional[str] = Field(None, description="Reason for ending the call")


# =============================================================================
# Response Schemas
# =============================================================================

class CallResponse(BaseModel):
    """Response with call details."""
    id: UUID
    status: CallStatusEnum
    caregiver_phone: str
    client_phone: str
    visit_id: Optional[UUID]
    client_id: Optional[UUID]
    
    # Timing
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    
    # Recording
    has_recording: bool
    recording_duration_seconds: Optional[int]
    
    # Consent
    caregiver_consent_at: Optional[datetime]
    client_consent_at: Optional[datetime]
    
    # Processing
    pipeline_submitted: bool
    audio_asset_id: Optional[UUID]
    
    created_at: datetime
    
    class Config:
        from_attributes = True


class CallInitiateResponse(BaseModel):
    """Response after initiating a call."""
    success: bool
    message: str
    call_id: Optional[UUID]
    call_sid: Optional[str]


class CallStatusResponse(BaseModel):
    """Response with current call status."""
    call_id: UUID
    status: CallStatusEnum
    caregiver_connected: bool
    client_connected: bool
    duration_seconds: Optional[int]
    recording_available: bool
    error_message: Optional[str]


class CallEndResponse(BaseModel):
    """Response after ending a call."""
    success: bool
    message: str
    call_id: UUID
    final_status: CallStatusEnum
    duration_seconds: Optional[int]


class CallListResponse(BaseModel):
    """Response with list of calls."""
    calls: List[CallResponse]
    total: int


# =============================================================================
# Webhook Schemas (for Twilio callbacks)
# =============================================================================

class TwilioStatusCallback(BaseModel):
    """Twilio call status callback payload."""
    CallSid: str
    AccountSid: str
    From: str
    To: str
    CallStatus: str
    Direction: Optional[str] = None
    CallDuration: Optional[str] = None
    Timestamp: Optional[str] = None
    
    class Config:
        extra = "allow"  # Allow additional Twilio fields


class TwilioRecordingCallback(BaseModel):
    """Twilio recording status callback payload."""
    AccountSid: str
    RecordingSid: str
    RecordingUrl: str
    RecordingStatus: str
    RecordingDuration: Optional[str] = None
    RecordingChannels: Optional[str] = None
    RecordingSource: Optional[str] = None
    
    class Config:
        extra = "allow"


class TwilioConferenceCallback(BaseModel):
    """Twilio conference status callback payload."""
    ConferenceSid: str
    FriendlyName: str
    AccountSid: str
    StatusCallbackEvent: str
    CallSid: Optional[str] = None
    Muted: Optional[str] = None
    Hold: Optional[str] = None
    
    class Config:
        extra = "allow"
