"""
Full Pipeline Task - Runs all processing steps automatically.

Optimized for speed:
- Phase 1: Transcription + Diarization run in PARALLEL
- Phase 2: Alignment (needs both transcription + diarization)
- Phase 3: Billing then Contract (sequential - contract needs billables)
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from worker import app as celery_app
from db import get_db_session
from models import Visit
from config import settings

# Import all task functions
from tasks.transcribe import transcribe_visit
from tasks.diarize import diarize_visit
from tasks.align import align_visit
from tasks.bill import generate_billables
from tasks.generate_contract import generate_service_contract

logger = logging.getLogger(__name__)


def update_pipeline_state(visit_id: str, step: str, status: str, error: str = None):
    """Update the pipeline state for a specific step."""
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if visit:
            state = visit.pipeline_state or {}
            state[step] = {"status": status}
            if error:
                state[step]["error"] = error
            visit.pipeline_state = state
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


def run_steps_parallel(visit_id: str, steps: list):
    """Run multiple steps in parallel using ThreadPoolExecutor."""
    results = []
    with ThreadPoolExecutor(max_workers=len(steps)) as executor:
        futures = {
            executor.submit(run_step, visit_id, state_key, step_name, task_func): state_key
            for state_key, step_name, task_func in steps
        }
        for future in as_completed(futures):
            results.append(future.result())
    return results


@celery_app.task(
    name="tasks.full_pipeline.run_full_pipeline",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 2},
)
def run_full_pipeline(self, visit_id: str):
    """
    Run the complete processing pipeline for a visit with parallel optimization:
    
    PHASE 1 (Parallel): Transcribe + Diarize
    PHASE 2 (Sequential): Align (needs both phase 1 outputs)
    PHASE 3 (Parallel): Bill + Note + Contract
    """
    logger.info(f"Starting optimized full pipeline for visit {visit_id}")
    
    use_parallel = settings.parallel_pipeline
    skip_diarization = settings.skip_diarization
    
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
                    "diarization": {"status": "pending"},
                    "alignment": {"status": "pending"},
                    "billing": {"status": "pending"},
                    "note": {"status": "pending"},
                    "contract": {"status": "pending"},
                }
            
            db.commit()
            logger.info(f"Cleared {deleted_segments} segments and {deleted_billables} billables")
    except Exception as e:
        logger.warning(f"Failed to clear old data (continuing anyway): {e}")
    
    # =========================================================================
    # PHASE 1: Transcription + Diarization (can run in parallel)
    # =========================================================================
    logger.info(f"Phase 1: Audio processing for visit {visit_id}")
    
    # Always run transcription - we cleared old data above
    skip_transcription = False
    
    if skip_transcription:
        logger.info(f"Transcript was imported, skipping Phase 1")
        update_pipeline_state(visit_id, "transcription", "skipped")
        update_pipeline_state(visit_id, "diarization", "skipped")
    else:
        # Always run transcription for audio uploads (transcribe.py will clear old segments)
        logger.info(f"Running transcription for visit {visit_id}")
        phase1_steps = [("transcription", "transcribe", transcribe_visit)]
        
        if not skip_diarization:
            phase1_steps.append(("diarization", "diarize", diarize_visit))
        else:
            update_pipeline_state(visit_id, "diarization", "skipped")
        
        if use_parallel and len(phase1_steps) > 1:
            run_steps_parallel(visit_id, phase1_steps)
        else:
            for state_key, step_name, task_func in phase1_steps:
                run_step(visit_id, state_key, step_name, task_func)
    
    # =========================================================================
    # PHASE 2: Alignment (needs transcription + diarization)
    # =========================================================================
    logger.info(f"Phase 2: Alignment for visit {visit_id}")
    
    if not skip_diarization and not skip_transcription:
        run_step(visit_id, "alignment", "align", align_visit)
    else:
        logger.info(f"Skipping alignment (diarization skipped or transcript imported)")
        update_pipeline_state(visit_id, "alignment", "skipped")
    
    # =========================================================================
    # PHASE 3: Billing then Contract (sequential - contract uses billables)
    # =========================================================================
    logger.info(f"Phase 3: Billing & contract generation for visit {visit_id}")
    
    # Run billing first
    run_step(visit_id, "billing", "bill", generate_billables)
    
    # Then generate contract (uses billing data)
    run_step(visit_id, "contract", "generate_contract", generate_service_contract)
    
    # =========================================================================
    # COMPLETE
    # =========================================================================
    update_pipeline_state(visit_id, "full_pipeline", "completed")
    
    # Update visit status
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if visit:
            visit.status = "pending_review"
            db.commit()
    
    logger.info(f"Full pipeline completed for visit {visit_id}")
    
    return {"status": "completed", "visit_id": visit_id}
