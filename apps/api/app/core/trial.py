"""Shared subscription / trial constants and helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

# Must match App Store Connect introductory offer (ONE_MONTH free trial)
# on com.palmcareai.app.starter.monthly.
TRIAL_DAYS = 30


def trial_end_from_now(*, days: int = TRIAL_DAYS) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)
