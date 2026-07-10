"""
Celery Worker Configuration

This is the main entry point for the Celery worker.
"""

import os
import json
import logging
import urllib.request

from celery import Celery
from config import settings

logger = logging.getLogger(__name__)


def _send_dead_letter_alert(task_name: str, task_id: str, kwargs: dict, exc: Exception) -> None:
    """Best-effort alert when a pipeline task fails after all retries.

    Solves the "silent retry loop you'd only catch in the logs" problem: a
    permanently failing job now pages a human. Env-gated on RESEND_API_KEY so
    it's a no-op in local/dev.
    """
    summary = f"[DEAD-LETTER] {task_name} failed permanently — task_id={task_id} kwargs={kwargs} error={type(exc).__name__}: {exc}"
    logger.critical(summary)

    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        return
    admin_email = os.getenv("ADMIN_NOTIFICATION_EMAIL", "sales@palmtai.com")
    sender = os.getenv("ALERT_SENDER_EMAIL", "alerts@send.palmtai.com")
    try:
        payload = json.dumps({
            "from": sender,
            "to": [admin_email],
            "subject": f"PalmCare pipeline failure: {task_name}",
            "html": (
                f"<p>A background pipeline task failed after all retries.</p>"
                f"<ul><li><b>Task:</b> {task_name}</li>"
                f"<li><b>Task ID:</b> {task_id}</li>"
                f"<li><b>Args:</b> {kwargs}</li>"
                f"<li><b>Error:</b> {type(exc).__name__}: {exc}</li></ul>"
            ),
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:  # never let alerting break the worker
        logger.warning(f"Dead-letter alert email failed: {type(e).__name__}: {e}")


# Create Celery app
app = Celery(
    "palmcare_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "tasks.transcribe",
        "tasks.diarize",
        "tasks.bill",
        "tasks.generate_note",
        "tasks.generate_contract",
        "tasks.full_pipeline",
    ],
)


class PipelineBaseTask(app.Task):
    """Default base task: bounded auto-retry + dead-letter alert on final failure.

    `autoretry_for` / `max_retries` / `retry_backoff` are honored by Celery when
    set as base-class attributes, so every @app.task gets them without per-task
    boilerplate. Retries are capped to avoid the "thousands of silent retries"
    cost trap.
    """
    autoretry_for = (Exception,)
    max_retries = 1            # 2 attempts total — bounded, no runaway loops
    retry_backoff = 15         # seconds, exponential
    retry_backoff_max = 300
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        _send_dead_letter_alert(self.name, task_id, kwargs, exc)
        super().on_failure(exc, task_id, args, kwargs, einfo)


# Make every task use the hardened base by default.
app.Task = PipelineBaseTask

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
