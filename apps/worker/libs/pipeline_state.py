"""Thread-safe visit.pipeline_state updates for parallel pipeline steps."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm.attributes import flag_modified


def patch_pipeline_step(db, visit_id, step: str, **step_data: Any) -> None:
    """Merge one step into pipeline_state under a row lock.

    Parallel bill/note/contract writers must use this so sibling keys are not
    clobbered by last-write-wins JSONB assignment.
    """
    from models import Visit

    vid = visit_id if isinstance(visit_id, UUID) else UUID(str(visit_id))
    visit = db.query(Visit).filter(Visit.id == vid).with_for_update().first()
    if not visit:
        return

    current = dict(visit.pipeline_state or {})
    existing_step = current.get(step) if isinstance(current.get(step), dict) else {}
    current[step] = {**existing_step, **step_data}
    visit.pipeline_state = current
    flag_modified(visit, "pipeline_state")
