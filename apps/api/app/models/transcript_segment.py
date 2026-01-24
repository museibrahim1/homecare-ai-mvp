import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class TranscriptSegment(Base, TimestampMixin):
    __tablename__ = "transcript_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    audio_asset_id = Column(UUID(as_uuid=True), ForeignKey("audio_assets.id"), nullable=True)
    
    # Timing
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    
    # Content
    text = Column(Text, nullable=False)
    
    # Speaker (after diarization alignment)
    speaker_label = Column(String(50), nullable=True)  # "Speaker A", "Speaker B", "Caregiver", "Client"
    
    # Confidence
    confidence = Column(Float, nullable=True)
    
    # Word-level timing (optional, for precise highlighting)
    # words = Column(JSONB, nullable=True)  # [{"word": "hello", "start": 0, "end": 500}, ...]
    
    # Relationships
    visit = relationship("Visit", back_populates="transcript_segments")
