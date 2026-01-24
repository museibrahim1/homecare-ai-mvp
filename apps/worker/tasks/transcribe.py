"""
Transcription Task

Uses faster-whisper for speech-to-text transcription.
"""

import os
import tempfile
import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db
from storage import download_file_to_path
from config import settings
from libs.whisper_asr import transcribe_audio

logger = logging.getLogger(__name__)


@app.task(name="tasks.transcribe.transcribe_visit", bind=True)
def transcribe_visit(self, visit_id: str):
    """
    Transcribe audio for a visit.
    
    Args:
        visit_id: UUID of the visit to transcribe
    """
    logger.info(f"Starting transcription for visit {visit_id}")
    
    db = get_db()
    
    try:
        # Import models here to avoid circular imports
        from models import Visit, AudioAsset, TranscriptSegment
        
        # Get visit and audio
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "transcription": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get the first audio asset
        audio_asset = db.query(AudioAsset).filter(
            AudioAsset.visit_id == visit.id
        ).first()
        
        if not audio_asset:
            raise ValueError(f"No audio found for visit: {visit_id}")
        
        # Download audio to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        
        try:
            download_file_to_path(audio_asset.s3_key, tmp_path)
            
            # Transcribe
            segments = transcribe_audio(
                tmp_path,
                model_size=settings.asr_model_size,
                use_gpu=settings.use_gpu,
            )
            
            # Delete existing segments for this visit
            db.query(TranscriptSegment).filter(
                TranscriptSegment.visit_id == visit.id
            ).delete()
            
            # Save segments to database
            for seg in segments:
                transcript_segment = TranscriptSegment(
                    visit_id=visit.id,
                    audio_asset_id=audio_asset.id,
                    start_ms=seg["start_ms"],
                    end_ms=seg["end_ms"],
                    text=seg["text"],
                    confidence=seg.get("confidence"),
                )
                db.add(transcript_segment)
            
            # Update audio asset
            if segments:
                audio_asset.duration_ms = max(s["end_ms"] for s in segments)
                audio_asset.avg_confidence = sum(
                    s.get("confidence", 0) for s in segments
                ) / len(segments) if segments else 0
            audio_asset.status = "processed"
            
            # Update pipeline state
            visit.pipeline_state = {
                **visit.pipeline_state,
                "transcription": {
                    "status": "completed",
                    "started_at": visit.pipeline_state.get("transcription", {}).get("started_at"),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "segment_count": len(segments),
                }
            }
            
            db.commit()
            logger.info(f"Transcription completed for visit {visit_id}: {len(segments)} segments")
            
            return {
                "status": "success",
                "visit_id": visit_id,
                "segment_count": len(segments),
            }
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        logger.error(f"Transcription failed for visit {visit_id}: {str(e)}")
        
        # Update pipeline state with error
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "transcription": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
