"""
Per-plan-tier rate limits for expensive AI endpoints.

The global slowapi limiter caps raw request volume per user/IP; this module
adds a second, plan-aware cap so higher tiers get more AI throughput:

    free          5 AI requests / minute
    starter      15 AI requests / minute
    growth       40 AI requests / minute
    professional 40 AI requests / minute (legacy tier)
    enterprise  120 AI requests / minute

Counters live in Redis when REDIS_URL is configured (multi-worker safe),
otherwise in process memory.
"""

import logging
import os
import time
from threading import Lock

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User

logger = logging.getLogger(__name__)

TIER_AI_LIMITS_PER_MINUTE: dict[str, int] = {
    "free": 5,
    "starter": 15,
    "growth": 40,
    "professional": 40,
    "enterprise": 120,
}

_WINDOW_SECONDS = 60

_redis = None
_redis_checked = False
_local_counts: dict[str, tuple[int, int]] = {}  # key -> (window_start, count)
_local_lock = Lock()


def _get_redis():
    global _redis, _redis_checked
    if _redis_checked:
        return _redis
    _redis_checked = True
    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        try:
            import redis

            client = redis.from_url(redis_url, socket_connect_timeout=2)
            client.ping()
            _redis = client
            logger.info("Tier rate limiter using Redis backend")
        except Exception:
            logger.warning("Redis unavailable for tier rate limiting; using in-memory")
    return _redis


def _increment(key: str) -> int:
    """Increment the fixed-window counter for `key` and return the new count."""
    window = int(time.time()) // _WINDOW_SECONDS
    redis_client = _get_redis()
    if redis_client is not None:
        try:
            redis_key = f"tier_ai:{key}:{window}"
            pipe = redis_client.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, _WINDOW_SECONDS * 2)
            count, _ = pipe.execute()
            return int(count)
        except Exception:
            pass  # fall through to in-memory on transient Redis errors
    with _local_lock:
        start, count = _local_counts.get(key, (window, 0))
        if start != window:
            start, count = window, 0
        count += 1
        _local_counts[key] = (start, count)
        # Opportunistic cleanup so the dict doesn't grow unbounded.
        if len(_local_counts) > 10_000:
            _local_counts.clear()
        return count


def _resolve_tier(db: Session, user: User) -> str:
    from app.routers.visits import _get_user_subscription

    try:
        return _get_user_subscription(db, user).get("tier", "free")
    except Exception:
        return "free"


async def enforce_ai_tier_limit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """FastAPI dependency: caps AI requests per minute based on plan tier."""
    tier = _resolve_tier(db, current_user)
    # Unknown tiers (e.g. the promo "complete" tier) get the enterprise cap.
    limit = TIER_AI_LIMITS_PER_MINUTE.get(tier, TIER_AI_LIMITS_PER_MINUTE["enterprise"])
    count = _increment(str(current_user.id))
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail=(
                f"AI request limit reached for your plan ({limit} per minute). "
                "Please wait a moment and try again."
            ),
            headers={"Retry-After": str(_WINDOW_SECONDS)},
        )
