"""
SQLAlchemy models for worker.

These are simplified versions of the API models for use in worker tasks.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, ForeignKey, Float, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="caregiver")
    is_active = Column(Boolean, default=True)
    # Voiceprint for speaker identification
    voiceprint = Column(Text, nullable=True)
    voiceprint_created_at = Column(DateTime(timezone=True), nullable=True)


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    preferred_name = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    
    # Contact
    phone = Column(String(20))
    phone_secondary = Column(String(20))
    email = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    
    # Emergency Contacts
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relationship = Column(String(100))
    emergency_contact_2_name = Column(String(255))
    emergency_contact_2_phone = Column(String(20))
    emergency_contact_2_relationship = Column(String(100))
    
    # Medical Information
    primary_diagnosis = Column(String(255))
    secondary_diagnoses = Column(Text)
    allergies = Column(Text)
    medications = Column(Text)
    physician_name = Column(String(255))
    physician_phone = Column(String(20))
    medical_notes = Column(Text)
    
    # Care Information
    mobility_status = Column(String(100))
    cognitive_status = Column(String(100))
    living_situation = Column(String(100))
    care_level = Column(String(50))
    care_plan = Column(Text)
    special_requirements = Column(Text)
    
    # Insurance
    insurance_provider = Column(String(255))
    insurance_id = Column(String(100))
    medicaid_id = Column(String(100))
    medicare_id = Column(String(100))
    billing_address = Column(Text)
    
    # Scheduling
    preferred_days = Column(String(255))
    preferred_times = Column(String(255))
    
    # Status
    status = Column(String(50), default='active')
    intake_date = Column(Date)
    discharge_date = Column(Date)
    
    # Notes
    notes = Column(Text)
    
    # External
    external_id = Column(String(255))
    external_source = Column(String(100))


class Visit(Base):
    __tablename__ = "visits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    caregiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    scheduled_start = Column(DateTime(timezone=True))
    scheduled_end = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    status = Column(String(50), default="scheduled")
    pipeline_state = Column(JSONB, default=dict)
    
    client = relationship("Client")
    caregiver = relationship("User")


class AudioAsset(Base):
    __tablename__ = "audio_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    s3_key = Column(String(512), nullable=False)
    original_filename = Column(String(255))
    content_type = Column(String(100))
    file_size_bytes = Column(Integer)
    duration_ms = Column(Integer)
    sample_rate = Column(Integer)
    channels = Column(Integer)
    status = Column(String(50), default="uploaded")
    speech_ratio = Column(Float)
    avg_confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    audio_asset_id = Column(UUID(as_uuid=True), ForeignKey("audio_assets.id"))
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    speaker_label = Column(String(50))
    confidence = Column(Float)
    source = Column(String(50))  # Track source: whisper, whisper_api, import_json, import_srt, etc.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DiarizationTurn(Base):
    __tablename__ = "diarization_turns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    audio_asset_id = Column(UUID(as_uuid=True), ForeignKey("audio_assets.id"))
    speaker = Column(String(50), nullable=False)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    confidence = Column(Float)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class BillableItem(Base):
    __tablename__ = "billable_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    code = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    minutes = Column(Integer, nullable=False)
    evidence = Column(JSONB, default=list)
    is_approved = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(Text)
    adjusted_minutes = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False, unique=True)
    structured_data = Column(JSONB, default=dict)
    narrative = Column(Text)
    is_approved = Column(Boolean, default=False)
    version = Column(String(20), default="1.0")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Caregiver(Base):
    __tablename__ = "caregivers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    email = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    certification_level = Column(String(100))
    specializations = Column(JSONB, default=list)
    languages = Column(JSONB, default=list)
    can_handle_high_care = Column(Boolean, default=False)
    can_handle_moderate_care = Column(Boolean, default=True)
    can_handle_low_care = Column(Boolean, default=True)
    max_clients = Column(Integer, default=5)
    current_client_count = Column(Integer, default=0)
    years_experience = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    status = Column(String(50), default='active')


class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    title = Column(String(255), nullable=False)
    services = Column(JSONB, default=list)
    schedule = Column(JSONB, default=dict)
    hourly_rate = Column(Numeric(10, 2))
    weekly_hours = Column(Numeric(10, 2))
    cancellation_policy = Column(Text)
    terms_and_conditions = Column(Text)
    status = Column(String(50), default="draft")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CallStatus:
    """Call status enum values."""
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


class Call(Base):
    __tablename__ = "calls"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Twilio identifiers
    caregiver_call_sid = Column(String(50))
    client_call_sid = Column(String(50))
    conference_sid = Column(String(50))
    recording_sid = Column(String(50))
    
    # Related entities
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"))
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Phone numbers
    caregiver_phone = Column(String(20), nullable=False)
    client_phone = Column(String(20), nullable=False)
    twilio_phone = Column(String(20))
    
    # Status tracking
    status = Column(String(50), default=CallStatus.INITIATED)
    error_message = Column(Text)
    
    # Call timing
    started_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    
    # Recording info
    recording_url = Column(String(500))
    recording_duration_seconds = Column(Integer)
    recording_file_path = Column(String(500))
    
    # Consent tracking
    caregiver_consent_at = Column(DateTime(timezone=True))
    client_consent_at = Column(DateTime(timezone=True))
    consent_message_played = Column(Boolean, default=False)
    
    # Processing status
    recording_downloaded = Column(Boolean, default=False)
    pipeline_submitted = Column(Boolean, default=False)
    audio_asset_id = Column(UUID(as_uuid=True))
    
    # Metadata
    call_metadata = Column(JSONB, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
