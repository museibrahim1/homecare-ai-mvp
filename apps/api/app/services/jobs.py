import uuid
from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "homecare_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    worker_prefetch_multiplier=1,
)


def enqueue_task(task_name: str, **kwargs) -> str:
    """Enqueue a task to Celery."""
    task_id = str(uuid.uuid4())
    
    # Map task names to Celery task paths
    task_mapping = {
        "transcribe": "tasks.transcribe.transcribe_visit",
        "diarize": "tasks.diarize.diarize_visit",
        "align": "tasks.align.align_visit",
        "bill": "tasks.bill.generate_billables",
        "generate_note": "tasks.generate_note.generate_visit_note",
        "generate_contract": "tasks.generate_contract.generate_service_contract",
        "full_pipeline": "tasks.full_pipeline.run_full_pipeline",
    }
    
    task_path = task_mapping.get(task_name)
    if not task_path:
        raise ValueError(f"Unknown task: {task_name}")
    
    celery_app.send_task(task_path, kwargs=kwargs, task_id=task_id)
    
    return task_id


def get_task_status(task_id: str) -> dict:
    """Get the status of a Celery task."""
    result = celery_app.AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
        "error": str(result.result) if result.failed() else None,
    }


def submit_call_recording_for_processing(call_id: str) -> str:
    """
    Submit a Twilio call recording for processing through the audio pipeline.
    
    This will:
    1. Download the recording from Twilio
    2. Create an audio asset
    3. Run the full transcription/contract pipeline
    
    Args:
        call_id: The Call record ID (UUID)
        
    Returns:
        task_id: The Celery task ID for tracking
    """
    task_id = str(uuid.uuid4())
    
    celery_app.send_task(
        "tasks.process_call_recording.process_call_recording",
        kwargs={"call_id": call_id},
        task_id=task_id,
    )
    
    return task_id
