"""
Note Generation Task

Generates structured visit notes from transcript and billable data using Claude LLM.
"""

import logging
from datetime import datetime, timezone
from uuid import UUID

from worker import app
from db import get_db
from config import settings

logger = logging.getLogger(__name__)


@app.task(name="tasks.generate_note.generate_visit_note", bind=True)
def generate_visit_note(self, visit_id: str):
    """
    Generate a visit note from transcript and billables using Claude.
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting note generation for visit {visit_id}")
    
    db = get_db()
    visit = None
    
    try:
        from models import Visit, TranscriptSegment, BillableItem, Note
        from libs.llm import get_llm_service
        
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
        
        # Prepare transcript text
        transcript_text = "\n".join([
            f"[{s.start_ms // 1000}s] {s.speaker_label or 'Speaker'}: {s.text}"
            for s in segments
        ]) if segments else "No transcript available"
        
        # Prepare visit info
        visit_info = {
            "client_name": visit.client.full_name if visit.client else "Unknown Client",
            "caregiver_name": visit.caregiver.full_name if visit.caregiver else "Unknown Caregiver",
            "date": str(visit.scheduled_start.date() if visit.scheduled_start else datetime.now().date()),
            "scheduled_duration": f"{(visit.scheduled_end - visit.scheduled_start).seconds // 60} minutes" if visit.scheduled_start and visit.scheduled_end else "Unknown",
        }
        
        # Prepare billable items
        billable_dicts = [
            {
                "category": b.category,
                "description": b.description,
                "minutes": b.minutes,
            }
            for b in billables
        ]
        
        # Use LLM to generate professional note
        logger.info(f"Calling Claude LLM for note generation...")
        llm_service = get_llm_service()
        note_data = llm_service.generate_visit_note(
            transcript_text=transcript_text,
            visit_info=visit_info,
            billable_items=billable_dicts,
        )
        logger.info(f"Claude LLM note generation complete")
        
        # Build structured data from LLM response
        structured_data = {
            "visit_info": visit_info,
            "subjective": note_data.get("subjective", ""),
            "objective": note_data.get("objective", ""),
            "assessment": note_data.get("assessment", ""),
            "plan": note_data.get("plan", ""),
            "tasks_performed": note_data.get("tasks_summary", []),
            "vital_signs": note_data.get("vital_signs", {}),
            "client_mood": note_data.get("client_mood", ""),
            "cognitive_status": note_data.get("cognitive_status", ""),
            "safety_observations": note_data.get("safety_observations", ""),
            "medications_discussed": note_data.get("medications_discussed", []),
            "next_visit_plan": note_data.get("next_visit_plan", ""),
        }
        
        narrative = note_data.get("narrative", "Visit completed as scheduled.")
        
        # Check if note already exists
        existing_note = db.query(Note).filter(Note.visit_id == visit.id).first()
        
        if existing_note:
            existing_note.structured_data = structured_data
            existing_note.narrative = narrative
            existing_note.updated_at = datetime.now(timezone.utc)
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
