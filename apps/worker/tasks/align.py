"""
Alignment Task

Merges ASR transcript segments with diarization speaker turns.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db
from libs.merge import align_transcript_with_diarization

logger = logging.getLogger(__name__)


@app.task(name="tasks.align.align_visit", bind=True)
def align_visit(self, visit_id: str):
    """
    Align transcription with diarization (merge speaker labels into transcript).
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting alignment for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, DiarizationTurn
        
        # Get visit
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "alignment": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get transcript segments
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id
        ).order_by(TranscriptSegment.start_ms).all()
        
        if not segments:
            raise ValueError(f"No transcript segments found for visit: {visit_id}")
        
        # Get diarization turns
        turns = db.query(DiarizationTurn).filter(
            DiarizationTurn.visit_id == visit.id
        ).order_by(DiarizationTurn.start_ms).all()
        
        if not turns:
            logger.warning(f"No diarization turns found for visit {visit_id}, using default speaker")
            # Assign default speaker to all segments
            for segment in segments:
                segment.speaker_label = "Speaker"
        else:
            # Convert to dicts for alignment function
            segment_dicts = [
                {"id": str(s.id), "start_ms": s.start_ms, "end_ms": s.end_ms, "text": s.text}
                for s in segments
            ]
            turn_dicts = [
                {"speaker": t.speaker, "start_ms": t.start_ms, "end_ms": t.end_ms}
                for t in turns
            ]
            
            # Perform alignment
            aligned = align_transcript_with_diarization(segment_dicts, turn_dicts)
            
            # Update segments with speaker labels
            segment_map = {str(s.id): s for s in segments}
            for aligned_seg in aligned:
                segment = segment_map.get(aligned_seg["id"])
                if segment:
                    segment.speaker_label = aligned_seg.get("speaker_label", "Unknown")
        
        # Derive actual visit start/end from speech activity
        if segments:
            visit.actual_start = visit.scheduled_start  # Could enhance with first speech timestamp
            visit.actual_end = visit.scheduled_end
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "alignment": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("alignment", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "aligned_segments": len(segments),
            }
        }
        
        db.commit()
        logger.info(f"Alignment completed for visit {visit_id}: {len(segments)} segments aligned")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "aligned_segments": len(segments),
        }
        
    except Exception as e:
        logger.error(f"Alignment failed for visit {visit_id}: {str(e)}")
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "alignment": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
