"""
Shared internal-API-key validator for cron/scripts.

Single source of truth so we can't accidentally re-introduce the
"empty key matches empty env var" bypass.
"""

import os
import logging

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


def require_internal_key(request: Request) -> None:
    """Validate the caller's internal key against INTERNAL_API_KEY or CRON_SECRET.

    Fail-closed: if neither env var is set we refuse all callers rather than
    matching an empty string (the historical bug). Empty caller keys are
    also rejected even when one of the env vars happens to be empty.
    """
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    cron_secret = os.getenv("CRON_SECRET", "")

    if not expected_key and not cron_secret:
        logger.error(
            "Internal auth misconfigured: both INTERNAL_API_KEY and CRON_SECRET are empty"
        )
        raise HTTPException(
            status_code=503,
            detail="Internal auth is not configured on this deployment",
        )

    provided_key = (
        request.headers.get("X-Internal-Key", "")
        or request.query_params.get("key", "")
    )

    # Reject empty caller keys outright — never allow `?key=` to succeed.
    if not provided_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    if expected_key and provided_key == expected_key:
        return
    if cron_secret and provided_key == cron_secret:
        return

    raise HTTPException(status_code=401, detail="Invalid or missing API key")
