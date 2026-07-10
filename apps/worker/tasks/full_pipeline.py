"""
Full Pipeline Task - Runs all processing steps automatically.

Steps:
- Transcription (Deepgram Nova-3, which also separates speakers inline)
- Billing, Note, then Contract (sequential - contract needs billables)

Speaker-name identification is an opt-in step (the "Speakers" action), not part
of the automatic pipeline.
"""

import logging
from worker import app as celery_app
from db import get_db_session
from models import Visit

# Import all task functions
from tasks.transcribe import transcribe_visit
from tasks.bill import generate_billables
from tasks.generate_note import generate_visit_note
from tasks.generate_contract import generate_service_contract

logger = logging.getLogger(__name__)


def update_pipeline_state(visit_id: str, step: str, status: str, error: str = None):
    """Update the pipeline state for a specific step."""
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if visit:
            step_data = {"status": status}
            if error:
                step_data["error"] = error
            visit.pipeline_state = {
                **(visit.pipeline_state or {}),
                step: step_data,
            }
            db.commit()


def run_step(visit_id: str, state_key: str, step_name: str, task_func):
    """Run a single pipeline step with error handling."""
    try:
        logger.info(f"Running step: {step_name} for visit {visit_id}")
        update_pipeline_state(visit_id, state_key, "processing")
        
        result = task_func(visit_id=visit_id)
        
        update_pipeline_state(visit_id, state_key, "completed")
        logger.info(f"Completed step: {step_name} for visit {visit_id}")
        return (state_key, True, None)
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Step {step_name} failed for visit {visit_id}: {error_msg}")
        update_pipeline_state(visit_id, state_key, "failed", error_msg)
        return (state_key, False, error_msg)


@celery_app.task(
    name="tasks.full_pipeline.run_full_pipeline",
    bind=True,
    autoretry_for=(ConnectionError, TimeoutError, OSError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 2},
)
def run_full_pipeline(self, visit_id: str):
    """
    Run the complete processing pipeline for a visit:

    1. Transcribe (Deepgram Nova-3 — separates speakers inline)
    2. Bill, then Note, then Contract (sequential — contract uses billables)
    """
    logger.info(f"Starting full pipeline for visit {visit_id}")
    
    # =========================================================================
    # CLEAR OLD DATA - Ensure fresh processing for this visit
    # =========================================================================
    logger.info(f"Clearing old pipeline data for visit {visit_id}")
    try:
        with get_db_session() as db:
            from models import TranscriptSegment, BillableItem
            
            # Clear ALL old transcript segments for this visit
            # We always want fresh transcription when running the pipeline
            deleted_segments = db.query(TranscriptSegment).filter(
                TranscriptSegment.visit_id == visit_id
            ).delete(synchronize_session=False)
            
            # Clear old billable items
            deleted_billables = db.query(BillableItem).filter(
                BillableItem.visit_id == visit_id
            ).delete(synchronize_session=False)
            
            # Reset pipeline state to fresh
            visit = db.query(Visit).filter(Visit.id == visit_id).first()
            if visit:
                visit.pipeline_state = {
                    "full_pipeline": {"status": "processing"},
                    "transcription": {"status": "pending"},
                    "billing": {"status": "pending"},
                    "note": {"status": "pending"},
                    "contract": {"status": "pending"},
                }
            
            db.commit()
            logger.info(f"Cleared {deleted_segments} segments and {deleted_billables} billables")
    except Exception as e:
        logger.warning(f"Failed to clear old data (continuing anyway): {e}")
    
    # =========================================================================
    # TRANSCRIPTION (Deepgram diarizes speakers inline)
    # =========================================================================
    run_step(visit_id, "transcription", "transcribe", transcribe_visit)
    
    # =========================================================================
    # Billing then Note then Contract (sequential - contract uses billables)
    # =========================================================================
    logger.info(f"Billing & contract generation for visit {visit_id}")
    
    # Run billing first
    run_step(visit_id, "billing", "bill", generate_billables)
    
    # Generate visit note
    run_step(visit_id, "note", "generate_note", generate_visit_note)
    
    # Then generate contract (uses billing data)
    run_step(visit_id, "contract", "generate_contract", generate_service_contract)
    
    # =========================================================================
    # COMPLETE
    # =========================================================================
    update_pipeline_state(visit_id, "full_pipeline", "completed")
    
    # Check if any critical steps failed before marking as pending_review
    has_failures = False
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if visit and visit.pipeline_state:
            for step_key in ["transcription", "billing", "note", "contract"]:
                step_state = visit.pipeline_state.get(step_key, {})
                if isinstance(step_state, dict) and step_state.get("status") == "failed":
                    has_failures = True
                    break
            visit.status = "pipeline_failed" if has_failures else "pending_review"
            db.commit()
    
    if has_failures:
        logger.warning(f"Pipeline completed with failures for visit {visit_id}")
    else:
        logger.info(f"Full pipeline completed for visit {visit_id}")
    
    return {"status": "completed" if not has_failures else "completed_with_failures", "visit_id": visit_id}
