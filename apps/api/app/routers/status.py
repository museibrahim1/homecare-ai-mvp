"""
Status Page Router

Public endpoints for service status and incidents.
Admin endpoints for creating/updating incidents.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.incident import Incident, IncidentUpdate
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdateCreate,
    IncidentResponse,
    IncidentUpdateResponse,
    StatusOverview,
)

logger = logging.getLogger(__name__)
router = APIRouter()

SERVICES = [
    "PalmCare AI Platform",
    "API",
    "Authentication",
    "AI Pipeline",
    "File Storage",
]

VALID_STATUSES = ["investigating", "identified", "monitoring", "resolved"]
VALID_IMPACTS = ["none", "minor", "major", "critical", "maintenance"]


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if not current_user.email.endswith("@palmtai.com"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")
    return current_user


# ── Public endpoints ──────────────────────────────────────────────────────────

@router.get("/overview", response_model=StatusOverview)
def get_status_overview(db: Session = Depends(get_db)):
    """Public endpoint — returns current status of all services."""
    active = (
        db.query(Incident)
        .options(joinedload(Incident.updates))
        .filter(Incident.status != "resolved")
        .order_by(desc(Incident.created_at))
        .all()
    )

    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    recent = (
        db.query(Incident)
        .options(joinedload(Incident.updates))
        .filter(Incident.status == "resolved", Incident.created_at >= cutoff)
        .order_by(desc(Incident.created_at))
        .all()
    )

    affected_services = {i.service_name for i in active}
    worst_impact = "none"
    impact_order = {"none": 0, "maintenance": 1, "minor": 2, "major": 3, "critical": 4}
    for inc in active:
        if impact_order.get(inc.impact, 0) > impact_order.get(worst_impact, 0):
            worst_impact = inc.impact

    services = []
    for svc in SERVICES:
        svc_incidents = [i for i in active if i.service_name == svc]
        if svc_incidents:
            svc_impact = max(svc_incidents, key=lambda i: impact_order.get(i.impact, 0)).impact
        else:
            svc_impact = "none"
        services.append({"name": svc, "status": "operational" if svc_impact == "none" else svc_impact})

    overall = "operational" if worst_impact == "none" else worst_impact

    return StatusOverview(
        overall_status=overall,
        overall_impact=worst_impact,
        services=services,
        active_incidents=[IncidentResponse.model_validate(i) for i in active],
        recent_incidents=[IncidentResponse.model_validate(i) for i in recent],
    )


@router.get("/incidents", response_model=List[IncidentResponse])
def list_incidents(
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Public — list incidents from the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    incidents = (
        db.query(Incident)
        .options(joinedload(Incident.updates))
        .filter(Incident.created_at >= cutoff)
        .order_by(desc(Incident.created_at))
        .all()
    )
    return incidents


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: UUID, db: Session = Depends(get_db)):
    """Public — get a single incident with updates."""
    incident = (
        db.query(Incident)
        .options(joinedload(Incident.updates))
        .filter(Incident.id == incident_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.post("/incidents", response_model=IncidentResponse, status_code=201)
def create_incident(
    data: IncidentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Admin — create a new incident with an initial update."""
    if data.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {VALID_STATUSES}")
    if data.impact not in VALID_IMPACTS:
        raise HTTPException(400, f"Invalid impact. Must be one of: {VALID_IMPACTS}")

    now = datetime.now(timezone.utc)
    incident = Incident(
        title=data.title,
        status=data.status,
        impact=data.impact,
        service_name=data.service_name,
        created_at=now,
        updated_at=now,
    )
    db.add(incident)
    db.flush()

    update = IncidentUpdate(
        incident_id=incident.id,
        status=data.status,
        message=data.message,
        created_at=now,
        updated_at=now,
    )
    db.add(update)
    db.commit()
    db.refresh(incident)

    logger.info("Incident created: %s by %s", incident.title, admin.email)
    return incident


@router.post("/incidents/{incident_id}/updates", response_model=IncidentUpdateResponse, status_code=201)
def add_incident_update(
    incident_id: UUID,
    data: IncidentUpdateCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Admin — post an update to an existing incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if data.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {VALID_STATUSES}")

    now = datetime.now(timezone.utc)
    incident.status = data.status
    incident.updated_at = now
    if data.status == "resolved":
        incident.resolved_at = now

    update = IncidentUpdate(
        incident_id=incident.id,
        status=data.status,
        message=data.message,
        created_at=now,
        updated_at=now,
    )
    db.add(update)
    db.commit()
    db.refresh(update)

    logger.info("Incident update added to %s by %s", incident.title, admin.email)
    return update


@router.delete("/incidents/{incident_id}", status_code=204)
def delete_incident(
    incident_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_platform_admin),
):
    """Admin — delete an incident and all its updates."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.delete(incident)
    db.commit()
    logger.info("Incident deleted: %s by %s", incident.title, admin.email)
