"""
Note Generation Task

Generates structured visit notes using LLM analysis of transcripts.
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
    Generate a visit note from transcript and billables using LLM.
    
    Uses LLM to:
    1. Analyze transcript for clinical observations
    2. Generate SOAP-style documentation
    3. Create professional narrative suitable for medical records
    
    Args:
        visit_id: UUID of the visit
    """
    logger.info(f"Starting LLM-powered note generation for visit {visit_id}")
    
    db = get_db()
    
    try:
        from models import Visit, TranscriptSegment, BillableItem, Note
        from libs.note_gen import generate_structured_note, generate_narrative
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
        
        # Prepare visit info
        visit_info = {
            "id": str(visit.id),
            "client_name": visit.client.full_name if visit.client else "Unknown",
            "caregiver_name": visit.caregiver.full_name if visit.caregiver else "Unknown",
            "date": str(visit.actual_start or visit.scheduled_start or datetime.now()),
            "duration_minutes": sum(b.minutes for b in billables) if billables else 0,
        }
        
        # Prepare transcript text
        transcript_text = "\n".join([
            f"[{seg.start_ms // 1000}s] {seg.text}"
            for seg in segments
        ]) if segments else "No transcript available."
        
        # Prepare billable items
        billable_dicts = [
            {
                "category": b.category,
                "description": b.description,
                "minutes": b.minutes,
                "adjusted_minutes": b.adjusted_minutes,
            }
            for b in billables
        ]
        
        # Initialize LLM service
        llm = get_llm_service()
        
        # Generate LLM-powered visit note
        logger.info("Generating visit note with LLM...")
        llm_note = llm.generate_visit_note(transcript_text, visit_info, billable_dicts)
        
        # Also generate fallback structured note
        segment_dicts = [
            {"id": str(s.id), "start_ms": s.start_ms, "end_ms": s.end_ms, "text": s.text}
            for s in segments
        ]
        fallback_structured = generate_structured_note(
            {"id": str(visit.id), "client_name": visit_info["client_name"], 
             "caregiver_name": visit_info["caregiver_name"],
             "scheduled_start": visit.scheduled_start, "actual_start": visit.actual_start},
            billable_dicts,
            segment_dicts
        )
        
        # Merge LLM analysis with structured data
        structured_data = {
            "visit_info": visit_info,
            "tasks_performed": llm_note.get("tasks_summary", fallback_structured.get("tasks_performed", [])),
            "soap_note": {
                "subjective": llm_note.get("subjective", ""),
                "objective": llm_note.get("objective", ""),
                "assessment": llm_note.get("assessment", ""),
                "plan": llm_note.get("plan", ""),
            },
            "observations": llm_note.get("objective", fallback_structured.get("observations", "")),
            "risks_concerns": llm_note.get("safety_observations", fallback_structured.get("risks_concerns", "None noted.")),
            "client_condition": llm_note.get("client_mood", "stable"),
            "medications_discussed": llm_note.get("medications_discussed", []),
            "vital_signs": llm_note.get("vital_signs_mentioned", {}),
            "follow_up_needed": bool(llm_note.get("plan", "")),
            "llm_generated": True,
        }
        
        # Use LLM narrative or generate fallback
        narrative = llm_note.get("narrative", "")
        if not narrative:
            narrative = generate_narrative(fallback_structured)
        
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
                "llm_used": True,
            }
        }
        
        db.commit()
        logger.info(f"Note generation completed for visit {visit_id}")
        
        return {
            "status": "success",
            "visit_id": visit_id,
            "note_id": str(note.id),
            "llm_generated": True,
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
