"""
Diarization Task

Uses pyannote.audio for speaker diarization.
"""

import os
import tempfile
import logging
from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional

from worker import app
from db import get_db
from storage import download_file_to_path, get_presigned_url
from config import settings
from libs.pyannote_diar import diarize_audio

logger = logging.getLogger(__name__)


def calculate_overlap(seg_start: int, seg_end: int, turn_start: int, turn_end: int) -> int:
    """Calculate the overlap in milliseconds between a segment and a turn."""
    overlap_start = max(seg_start, turn_start)
    overlap_end = min(seg_end, turn_end)
    return max(0, overlap_end - overlap_start)


def align_diarization_with_transcript(db, visit_id: UUID, turns: List[dict]) -> int:
    """
    Align diarization turns with transcript segments.
    
    For each transcript segment, find the diarization turn that 
    overlaps most and assign the speaker label.
    
    Args:
        db: Database session
        visit_id: UUID of the visit
        turns: List of diarization turn dicts with speaker, start_ms, end_ms
    
    Returns:
        Number of segments that were aligned with speaker labels
    """
    from models import TranscriptSegment
    
    if not turns:
        logger.info(f"No diarization turns to align for visit {visit_id}")
        return 0
    
    # Get all transcript segments for this visit
    segments = db.query(TranscriptSegment).filter(
        TranscriptSegment.visit_id == visit_id
    ).order_by(TranscriptSegment.start_ms).all()
    
    if not segments:
        logger.info(f"No transcript segments found for visit {visit_id}")
        return 0
    
    aligned_count = 0
    
    for segment in segments:
        best_overlap = 0
        best_speaker = None
        
        # Find the turn with maximum overlap
        for turn in turns:
            overlap = calculate_overlap(
                segment.start_ms, 
                segment.end_ms,
                turn["start_ms"],
                turn["end_ms"]
            )
            
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = turn["speaker"]
        
        # Assign speaker label if we found an overlapping turn
        if best_speaker and best_overlap > 0:
            segment.speaker_label = best_speaker
            aligned_count += 1
    
    db.commit()
    logger.info(f"Aligned {aligned_count}/{len(segments)} transcript segments with speaker labels")
    
    return aligned_count


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
            
            # Generate presigned URL for pyannote.ai API
            audio_url = get_presigned_url(audio_asset.s3_key, expires_in=3600)
            logger.info(f"Generated presigned URL for diarization API")
            
            # Perform diarization - pass both local path and URL
            # API will use URL, local models will use path
            turns = diarize_audio(
                tmp_path, 
                hf_token=settings.hf_token,
                pyannote_api_key=os.getenv("PYANNOTE_API_KEY"),
                audio_url=audio_url
            )
            
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
            
            db.commit()  # Commit turns before alignment
            
            # Align diarization with transcript segments
            aligned_count = align_diarization_with_transcript(db, visit.id, turns)
            
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
                    "aligned_segments": aligned_count,
                }
            }
            
            db.commit()
            logger.info(f"Diarization completed for visit {visit_id}: {len(turns)} turns, {len(speakers)} speakers, {aligned_count} segments aligned")
            
            return {
                "status": "success",
                "visit_id": visit_id,
                "turn_count": len(turns),
                "speakers": speakers,
                "aligned_segments": aligned_count,
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
