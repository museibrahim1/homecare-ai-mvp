"""
Centralized rate limiting using slowapi.

Limits are applied per-IP for public endpoints and per-user for
authenticated endpoints. Redis is preferred for multi-worker
deployments; falls back to in-memory if unavailable.
"""

import os
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def _get_key(request: Request) -> str:
    """Per-user key if auth header present, otherwise IP."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer ") and len(auth) > 20:
        # Hash the token to avoid storing it in Redis
        import hashlib
        return "user:" + hashlib.sha256(auth.encode()).hexdigest()[:16]
    return get_remote_address(request)


def _build_limiter() -> Limiter:
    redis_url = os.getenv("REDIS_URL", "")
    storage_uri = None
    if redis_url:
        try:
            import redis
            r = redis.from_url(redis_url, socket_connect_timeout=2)
            r.ping()
            r.close()
            storage_uri = redis_url
            logger.info("Rate limiter using Redis backend")
        except Exception:
            logger.warning("Redis unavailable for rate limiting; using in-memory")
    return Limiter(
        key_func=_get_key,
        storage_uri=storage_uri,
        default_limits=["200/minute"],
    )


limiter = _build_limiter()


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_seconds = "60"
    try:
        detail = str(exc.detail)
        if " per " in detail:
            window = detail.split(" per ")[1].strip()
            if "second" in window:
                retry_seconds = "1"
            elif "minute" in window:
                retry_seconds = "60"
            elif "hour" in window:
                retry_seconds = "3600"
            else:
                import re
                nums = re.findall(r'\d+', window)
                if nums:
                    retry_seconds = str(int(nums[0]) * 60)
    except Exception:
        pass
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
        headers={"Retry-After": retry_seconds},
    )
