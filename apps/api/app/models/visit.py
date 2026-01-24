import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Visit(Base, TimestampMixin):
    __tablename__ = "visits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    caregiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Scheduled times
    scheduled_start = Column(DateTime(timezone=True), nullable=True)
    scheduled_end = Column(DateTime(timezone=True), nullable=True)
    
    # Actual times (derived from audio/speech analysis)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(String(50), default="scheduled", nullable=False)
    # scheduled, in_progress, pending_review, approved, exported
    
    # Pipeline state tracking
    pipeline_state = Column(JSONB, default=dict, nullable=False)
    # {
    #   "transcription": {"status": "completed", "started_at": ..., "finished_at": ..., "error": null},
    #   "diarization": {...},
    #   "alignment": {...},
    #   "billing": {...},
    #   "note": {...},
    #   "contract": {...}
    # }
    
    # Admin notes
    admin_notes = Column(Text, nullable=True)
    
    # Relationships
    client = relationship("Client", back_populates="visits")
    caregiver = relationship("User", back_populates="visits_as_caregiver", foreign_keys=[caregiver_id])
    audio_assets = relationship("AudioAsset", back_populates="visit")
    transcript_segments = relationship("TranscriptSegment", back_populates="visit", order_by="TranscriptSegment.start_ms")
    diarization_turns = relationship("DiarizationTurn", back_populates="visit", order_by="DiarizationTurn.start_ms")
    billable_items = relationship("BillableItem", back_populates="visit")
    note = relationship("Note", back_populates="visit", uselist=False)
