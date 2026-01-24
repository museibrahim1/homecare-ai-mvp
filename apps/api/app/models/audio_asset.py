import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class AudioAsset(Base, TimestampMixin):
    __tablename__ = "audio_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id = Column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    
    # Storage info
    s3_key = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=True)
    content_type = Column(String(100), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Audio metadata
    duration_ms = Column(Integer, nullable=True)
    sample_rate = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    
    # Processing status
    status = Column(String(50), default="uploaded", nullable=False)
    # uploaded, processing, processed, failed
    
    # Quality metrics
    speech_ratio = Column(Float, nullable=True)  # % of audio that is speech
    avg_confidence = Column(Float, nullable=True)  # average ASR confidence
    
    # Relationships
    visit = relationship("Visit", back_populates="audio_assets")
