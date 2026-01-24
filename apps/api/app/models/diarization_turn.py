import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class DiarizationTurn(Base, TimestampMixin):
    __tablename__ = "diarization_turns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    audio_asset_id = Column(UUID(as_uuid=True), ForeignKey("audio_assets.id"), nullable=True)
    
    # Speaker identification
    speaker = Column(String(50), nullable=False)  # "SPEAKER_00", "SPEAKER_01", etc.
    
    # Timing
    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    
    # Confidence
    confidence = Column(Float, nullable=True)
    
    # Relationships
    visit = relationship("Visit", back_populates="diarization_turns")
