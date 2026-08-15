"""
Full Pipeline Task - Runs all processing steps automatically.

Steps:
- Transcription (Deepgram Nova-3, which also separates speakers inline)
- Classify recording kind (cheap heuristic / tiny LLM)
- Billing + Note in parallel; Contract starts when billing finishes (overlaps note)
- Compact contract extraction (skips heavy LLM when out of scope)

Speaker-name identification is an opt-in step (the "Speakers" action), not part
of the automatic pipeline.
"""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from worker import app as celery_app
from db import get_db_session
from models import Visit

# Import all task functions
from tasks.transcribe import transcribe_visit
from tasks.bill import generate_billables
from tasks.generate_note import generate_visit_note
from tasks.generate_contract import generate_service_contract

logger = logging.getLogger(__name__)


def update_pipeline_state(visit_id: str, step: str, status: str, error: str = None, **extra):
    """Update the pipeline state for a specific step."""
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if visit:
            step_data = {"status": status, **extra}
            if error:
                step_data["error"] = error
            visit.pipeline_state = {
                **(visit.pipeline_state or {}),
                step: step_data,
            }
            db.commit()


def run_step(visit_id: str, state_key: str, step_name: str, task_func):
    """Run a single pipeline step with error handling and timing."""
    started = datetime.now(timezone.utc)
    t0 = time.monotonic()
    try:
        logger.info(f"Running step: {step_name} for visit {visit_id}")
        update_pipeline_state(
            visit_id,
            state_key,
            "processing",
            started_at=started.isoformat(),
        )

        result = task_func(visit_id=visit_id)
        duration_ms = int((time.monotonic() - t0) * 1000)

        update_pipeline_state(
            visit_id,
            state_key,
            "completed",
            started_at=started.isoformat(),
            finished_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
        )
        logger.info(f"Completed step: {step_name} for visit {visit_id} in {duration_ms}ms")
        return (state_key, True, None, duration_ms)

    except Exception as e:
        error_msg = str(e)
        duration_ms = int((time.monotonic() - t0) * 1000)
        logger.error(f"Step {step_name} failed for visit {visit_id}: {error_msg}")
        update_pipeline_state(
            visit_id,
            state_key,
            "failed",
            error_msg,
            started_at=started.isoformat(),
            finished_at=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
        )
        return (state_key, False, error_msg, duration_ms)


def _load_transcript_text(visit_id: str) -> str:
    with get_db_session() as db:
        from models import TranscriptSegment

        segments = (
            db.query(TranscriptSegment)
            .filter(TranscriptSegment.visit_id == visit_id)
            .order_by(TranscriptSegment.start_ms)
            .all()
        )
        return "\n".join(
            f"{s.speaker_label or 'Speaker'}: {s.text}" for s in segments
        )


def _set_conversation_kind(visit_id: str, kind: str, classify_ms: int):
    with get_db_session() as db:
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            return
        visit.pipeline_state = {
            **(visit.pipeline_state or {}),
            "conversation_kind": kind,
            "classify": {
                "status": "completed",
                "conversation_kind": kind,
                "duration_ms": classify_ms,
            },
        }
        db.commit()


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
    2. Classify recording kind
    3. Bill + Note in parallel; Contract starts when billing finishes (overlaps note)
    4. Compact contract extraction (skips heavy LLM when out of scope)
    """
    logger.info(f"Starting full pipeline for visit {visit_id}")

    # =========================================================================
    # CLEAR OLD DATA - Ensure fresh processing for this visit
    # =========================================================================
    logger.info(f"Clearing old pipeline data for visit {visit_id}")
    try:
        with get_db_session() as db:
            from models import TranscriptSegment, BillableItem

            deleted_segments = db.query(TranscriptSegment).filter(
                TranscriptSegment.visit_id == visit_id
            ).delete(synchronize_session=False)

            deleted_billables = db.query(BillableItem).filter(
                BillableItem.visit_id == visit_id
            ).delete(synchronize_session=False)

            visit = db.query(Visit).filter(Visit.id == visit_id).first()
            if visit:
                visit.pipeline_state = {
                    "full_pipeline": {"status": "processing"},
                    "transcription": {"status": "pending"},
                    "classify": {"status": "pending"},
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
    # CLASSIFY — decide whether to run the expensive home-care LLM stack
    # =========================================================================
    from libs.pipeline_efficiency import classify_recording

    t_classify = time.monotonic()
    try:
        kind = classify_recording(_load_transcript_text(visit_id))
    except Exception as e:
        logger.warning(f"Classify failed, defaulting to intake: {e}")
        kind = "home_care_intake"
    classify_ms = int((time.monotonic() - t_classify) * 1000)
    _set_conversation_kind(visit_id, kind, classify_ms)
    logger.info(f"Classified visit {visit_id} as {kind} in {classify_ms}ms")

    # =========================================================================
    # Billing + Note in parallel; start Contract as soon as billing finishes
    # so note and contract overlap (largest wall-clock win for in-scope visits).
    # Out-of-scope still uses the same shape: empty bill is cheap, contract is
    # cheap, note is the slow step.
    # =========================================================================
    logger.info(f"Running billing + note in parallel for visit {visit_id}")
    with ThreadPoolExecutor(max_workers=3) as pool:
        bill_fut = pool.submit(run_step, visit_id, "billing", "bill", generate_billables)
        note_fut = pool.submit(run_step, visit_id, "note", "generate_note", generate_visit_note)
        contract_fut = None

        for fut in as_completed([bill_fut, note_fut]):
            step_key, ok, err, _duration_ms = fut.result()
            if not ok:
                logger.error(f"Parallel step {step_key} failed: {err}")
            if fut is bill_fut and ok and contract_fut is None:
                logger.info(
                    f"Billing done; overlapping contract with note for visit {visit_id}"
                )
                contract_fut = pool.submit(
                    run_step,
                    visit_id,
                    "contract",
                    "generate_contract",
                    generate_service_contract,
                )

        if contract_fut is not None:
            step_key, ok, err, _duration_ms = contract_fut.result()
            if not ok:
                logger.error(f"Parallel step {step_key} failed: {err}")
        else:
            # Billing failed; still attempt contract for a reviewable artifact.
            run_step(visit_id, "contract", "generate_contract", generate_service_contract)

    # =========================================================================
    # COMPLETE
    # =========================================================================
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
            timings = {
                k: (visit.pipeline_state.get(k) or {}).get("duration_ms")
                for k in ("transcription", "classify", "billing", "note", "contract")
            }
            visit.pipeline_state = {
                **(visit.pipeline_state or {}),
                "full_pipeline": {
                    "status": "failed" if has_failures else "completed",
                    "failed_step": next(
                        (
                            k for k in ("transcription", "billing", "note", "contract")
                            if isinstance((visit.pipeline_state or {}).get(k), dict)
                            and (visit.pipeline_state or {}).get(k, {}).get("status") == "failed"
                        ),
                        None,
                    ) if has_failures else None,
                    "conversation_kind": kind,
                    "timings_ms": timings,
                },
            }
            db.commit()

    if has_failures:
        logger.warning(f"Pipeline completed with failures for visit {visit_id}")
    else:
        logger.info(f"Full pipeline completed for visit {visit_id}")

    return {
        "status": "completed" if not has_failures else "completed_with_failures",
        "visit_id": visit_id,
        "conversation_kind": kind,
    }
