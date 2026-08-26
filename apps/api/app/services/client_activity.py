from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.client_activity import ClientActivity


def log_client_activity(
    db: Session,
    *,
    client_id: UUID,
    activity_type: str,
    title: str,
    description: Optional[str] = None,
    created_by: Optional[UUID] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> ClientActivity:
    row = ClientActivity(
        client_id=client_id,
        created_by=created_by,
        activity_type=activity_type,
        title=title,
        description=description,
        metadata_json=metadata,
    )
    db.add(row)
    return row
