"""
Diarization Task

Uses pyannote.audio for speaker diarization.
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
from libs.pyannote_diar import diarize_audio

logger = logging.getLogger(__name__)


@app.task(name="tasks.diarize.diarize_visit", bind=True)
def diarize_visit(self, visit_id: str):
    """
    Perform speaker diarization for a visit.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting diarization for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, AudioAsset, DiarizationTurn
        
        # Get visit and audio
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "diarization": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get audio asset
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
            
            # Perform diarization
            turns = diarize_audio(tmp_path, hf_token=settings.hf_token)
            
            # Delete existing turns for this visit
            db.query(DiarizationTurn).filter(
                DiarizationTurn.visit_id == visit.id
            ).delete()
            
            # Save turns to database
            for turn in turns:
                diarization_turn = DiarizationTurn(
                    visit_id=visit.id,
                    audio_asset_id=audio_asset.id,
                    speaker=turn["speaker"],
                    start_ms=turn["start_ms"],
                    end_ms=turn["end_ms"],
                    confidence=turn.get("confidence"),
                )
                db.add(diarization_turn)
            
            # Update pipeline state
            speakers = list(set(t["speaker"] for t in turns))
            visit.pipeline_state = {
                **visit.pipeline_state,
                "diarization": {
                    "status": "completed",
                    "started_at": visit.pipeline_state.get("diarization", {}).get("started_at"),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "turn_count": len(turns),
                    "speakers": speakers,
                }
            }
            
            db.commit()
            logger.info(f"Diarization completed for visit {visit_id}: {len(turns)} turns, {len(speakers)} speakers")
            
            return {
                "status": "success",
                "visit_id": visit_id,
                "turn_count": len(turns),
                "speakers": speakers,
            }
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        logger.error(f"Diarization failed for visit {visit_id}: {str(e)}")
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "diarization": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
