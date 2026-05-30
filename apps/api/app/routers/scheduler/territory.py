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

class TerritoryAssignment(BaseModel):
    states: List[str]


@router.get("/territories")
def get_territories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get calling territories for all team members (and self)."""
    if user.role not in ("admin", "admin_team"):
        raise HTTPException(403, "Admin access required")

    members = db.query(User).filter(
        User.is_active == True,
        or_(User.role == "admin", User.role == "admin_team"),
    ).all()

    team = []
    for m in members:
        assigned = m.calling_states or []
        lead_count = 0
        if assigned:
            lead_count = db.query(func.count(SalesLead.id)).filter(
                SalesLead.state.in_(assigned)
            ).scalar() or 0

        team.append({
            "user_id": str(m.id),
            "name": m.full_name,
            "title": m.executive_title or "",
            "states": assigned,
            "lead_count": lead_count,
        })

    return {
        "team": team,
        "all_states": [{
            "code": s,
            "name": STATE_NAMES.get(s, s),
            "region": _region_for_state(s),
        } for s in ALL_STATES],
        "regions": {k: v for k, v in STATE_REGIONS.items()},
    }


@router.put("/territories/{user_id}")
def assign_territories(
    user_id: str,
    body: TerritoryAssignment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign calling states to a team member (or self)."""
    if current_user.role not in ("admin", "admin_team"):
        raise HTTPException(403, "Admin access required")

    if user_id == "me" or user_id == str(current_user.id):
        target = current_user
    else:
        target = db.query(User).filter(User.id == user_id).first()
        if not target:
            raise HTTPException(404, "User not found")

    valid_states = [s.upper().strip() for s in body.states if s.upper().strip() in STATE_NAMES]
    target.calling_states = valid_states
    db.commit()

    lead_count = 0
    if valid_states:
        lead_count = db.query(func.count(SalesLead.id)).filter(
            SalesLead.state.in_(valid_states)
        ).scalar() or 0

    return {
        "ok": True,
        "user_id": str(target.id),
        "name": target.full_name,
        "states": valid_states,
        "lead_count": lead_count,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CRM SEARCH (autocomplete)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/crm-search", response_model=List[CrmSearchResult])
def crm_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Search leads and investors by name, email, or phone for autocomplete."""
    pattern = f"%{q}%"
    results: list[CrmSearchResult] = []

    leads = (
        db.query(SalesLead)
        .filter(
            or_(
                SalesLead.provider_name.ilike(pattern),
                SalesLead.contact_email.ilike(pattern),
                SalesLead.contact_name.ilike(pattern),
                SalesLead.phone.ilike(pattern),
                SalesLead.city.ilike(pattern),
            )
        )
        .limit(10)
        .all()
    )
    for l in leads:
        results.append(CrmSearchResult(
            id=str(l.id), type="lead",
            name=l.provider_name or l.contact_name or "",
            email=l.contact_email, phone=l.phone,
            company=l.provider_name, city=l.city, state=l.state,
            status=l.status,
        ))

    investors = (
        db.query(Investor)
        .filter(
            or_(
                Investor.fund_name.ilike(pattern),
                Investor.contact_email.ilike(pattern),
                Investor.contact_name.ilike(pattern),
            )
        )
        .limit(10)
        .all()
    )
    for i in investors:
        results.append(CrmSearchResult(
            id=str(i.id), type="investor",
            name=i.fund_name or i.contact_name or "",
            email=i.contact_email, phone=None,
            company=i.fund_name, city=i.location, state=None,
            status=i.status,
        ))

    return results[:15]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
