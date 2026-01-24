"""
Note Generation Task

Generates structured visit notes from transcript and billable data.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db

logger = logging.getLogger(__name__)


@app.task(name="tasks.generate_note.generate_visit_note", bind=True)
def generate_visit_note(self, visit_id: str):
    """
    Generate a visit note from transcript and billables.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting note generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, BillableItem, Note
        from libs.note_gen import generate_structured_note, generate_narrative
        
        # Get visit
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            raise ValueError(f"Visit not found: {visit_id}")
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "note": {
                "status": "processing",
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        db.commit()
        
        # Get transcript segments
        segments = db.query(TranscriptSegment).filter(
            TranscriptSegment.visit_id == visit.id
        ).order_by(TranscriptSegment.start_ms).all()
        
        # Get billable items
        billables = db.query(BillableItem).filter(
            BillableItem.visit_id == visit.id
        ).all()
        
        # Prepare data
        visit_data = {
            "id": str(visit.id),
            "client_name": visit.client.full_name if visit.client else "",
            "caregiver_name": visit.caregiver.full_name if visit.caregiver else "",
            "scheduled_start": visit.scheduled_start,
            "actual_start": visit.actual_start,
        }
        
        segment_dicts = [
            {"id": str(s.id), "start_ms": s.start_ms, "end_ms": s.end_ms, "text": s.text}
            for s in segments
        ]
        
        billable_dicts = [
            {
                "category": b.category,
                "description": b.description,
                "minutes": b.minutes,
                "adjusted_minutes": b.adjusted_minutes,
            }
            for b in billables
        ]
        
        # Generate structured note
        structured_data = generate_structured_note(visit_data, billable_dicts, segment_dicts)
        
        # Generate narrative
        narrative = generate_narrative(structured_data)
        
        # Check if note already exists
        existing_note = db.query(Note).filter(Note.visit_id == visit.id).first()
        
        if existing_note:
            existing_note.structured_data = structured_data
            existing_note.narrative = narrative
            note = existing_note
        else:
            note = Note(
                visit_id=visit.id,
                structured_data=structured_data,
                narrative=narrative,
            )
            db.add(note)
        
        # Update pipeline state
        visit.pipeline_state = {
            **visit.pipeline_state,
            "note": {
                "status": "completed",
                "started_at": visit.pipeline_state.get("note", {}).get("started_at"),
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
        }
        
        db.commit()
        logger.info(f"Note generation completed for visit {visit_id}")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "note_id": str(note.id),
        }
        
    except Exception as e:
        logger.error(f"Note generation failed for visit {visit_id}: {str(e)}")
        
        if visit:
            visit.pipeline_state = {
                **visit.pipeline_state,
                "note": {
                    "status": "failed",
                    "error": str(e),
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            db.commit()
        
        raise
    finally:
        db.close()
