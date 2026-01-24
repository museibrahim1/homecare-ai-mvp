"""
Celery Worker Configuration

This is the main entry point for the Celery worker.
"""

from celery import Celery
from config import settings

# Create Celery app
app = Celery(
    "homecare_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.transcribe",
        "tasks.diarize",
        "tasks.align",
        "tasks.bill",
        "tasks.generate_note",
        "tasks.generate_contract",
    ],
)

# Configure Celery
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3000,  # 50 minutes soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

if __name__ == "__main__":
    app.start()
