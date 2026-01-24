from typing import Optional, Any, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    user_id: Optional[UUID],
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    description: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
):
    """Log an audit action."""
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(audit_log)
    db.commit()
    return audit_log
