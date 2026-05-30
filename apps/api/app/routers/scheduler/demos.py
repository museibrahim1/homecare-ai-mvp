import os
import uuid
import logging
import random
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, asc, func, or_, and_, case
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor

from .common import (
    _scheduled_demos, _team_goals, _marketing_assets,
    INSPIRING_MESSAGES, STATE_REGIONS, _region_for_state, ALL_STATES, STATE_NAMES,
)
from .schemas import (
    ScheduledDemoCreate, ScheduledDemoUpdate, CrmSearchResult,
    GoalCreate, GoalUpdate, MarketingAssetCreate,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/demos")
def list_scheduled_demos(
    user: User = Depends(get_current_user),
):
    """List all scheduled demos for the team."""
    demos = sorted(
        _scheduled_demos.values(),
        key=lambda d: (d.get("scheduled_date", ""), d.get("scheduled_time", "")),
    )
    return {"demos": demos, "total": len(demos)}


@router.post("/demos")
def create_scheduled_demo(
    body: ScheduledDemoCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new scheduled demo. Auto-links CRM data if lead_id/investor_id provided."""
    demo_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    demo = {
        "id": demo_id,
        "contact_name": body.contact_name,
        "contact_email": body.contact_email,
        "contact_phone": body.contact_phone,
        "company_name": body.company_name,
        "scheduled_date": body.scheduled_date,
        "scheduled_time": body.scheduled_time,
        "duration_minutes": body.duration_minutes,
        "notes": body.notes,
        "lead_id": body.lead_id,
        "investor_id": body.investor_id,
        "source": body.source,
        "status": "scheduled",
        "booked_by": user.full_name or user.email,
        "booked_by_id": str(user.id),
        "created_at": now.isoformat(),
    }

    if body.lead_id:
        lead = db.query(SalesLead).filter(SalesLead.id == body.lead_id).first()
        if lead:
            demo["crm_data"] = {
                "provider_name": lead.provider_name,
                "city": lead.city, "state": lead.state,
                "phone": lead.phone, "email": lead.contact_email,
                "ownership_type": lead.ownership_type,
                "years_in_operation": lead.years_in_operation,
                "star_rating": lead.star_rating,
                "status": lead.status,
            }
            if lead.status not in ("meeting_scheduled", "demo_given", "converted"):
                lead.status = "meeting_scheduled"
                lead.updated_at = now
                db.commit()

    if body.investor_id:
        inv = db.query(Investor).filter(Investor.id == body.investor_id).first()
        if inv:
            demo["crm_data"] = {
                "fund_name": inv.fund_name,
                "contact_name": inv.contact_name,
                "location": inv.location,
                "focus_sectors": inv.focus_sectors,
                "check_size_display": inv.check_size_display,
                "status": inv.status,
            }

    _scheduled_demos[demo_id] = demo
    return {"ok": True, "demo": demo}


@router.put("/demos/{demo_id}")
def update_scheduled_demo(
    demo_id: str,
    body: ScheduledDemoUpdate,
    user: User = Depends(get_current_user),
):
    """Update a scheduled demo."""
    if demo_id not in _scheduled_demos:
        raise HTTPException(404, "Demo not found")
    demo = _scheduled_demos[demo_id]
    for field, val in body.dict(exclude_none=True).items():
        demo[field] = val
    demo["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True, "demo": demo}


@router.delete("/demos/{demo_id}")
def delete_scheduled_demo(
    demo_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a scheduled demo."""
    if demo_id not in _scheduled_demos:
        raise HTTPException(404, "Demo not found")
    del _scheduled_demos[demo_id]
    return {"ok": True}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
