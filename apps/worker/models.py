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


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    address = Column(Text)
    phone = Column(String(20))
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))


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
    status = Column(String(50), default="uploaded")
    avg_confidence = Column(Float)


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


class DiarizationTurn(Base):
    __tablename__ = "diarization_turns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    audio_asset_id = Column(UUID(as_uuid=True), ForeignKey("audio_assets.id"))
    speaker = Column(String(50), nullable=False)
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    confidence = Column(Float)


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


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False, unique=True)
    structured_data = Column(JSONB, default=dict)
    narrative = Column(Text)
    is_approved = Column(Boolean, default=False)
    version = Column(String(20), default="1.0")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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
