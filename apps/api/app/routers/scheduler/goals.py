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

@router.get("/goals")
def list_goals(
    user_id: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List goals. Admin sees all; team members see their own."""
    goals = list(_team_goals.values())
    is_ceo = user.role == "admin" and (user.email or "").endswith("@palmtai.com")
    if user_id:
        goals = [g for g in goals if g.get("user_id") == user_id]
    elif not is_ceo:
        goals = [g for g in goals if g.get("user_id") == str(user.id)]
    return {"goals": sorted(goals, key=lambda g: g.get("created_at", ""), reverse=True)}


@router.post("/goals")
def create_goal(
    body: GoalCreate,
    user: User = Depends(get_current_user),
):
    """Create a goal for the current user (or auto-generated)."""
    goal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    goal = {
        "id": goal_id,
        "user_id": str(user.id),
        "user_name": user.full_name or user.email,
        "title": body.title,
        "description": body.description,
        "goal_type": body.goal_type,
        "target_value": body.target_value,
        "current_value": 0,
        "area": body.area,
        "due_date": body.due_date,
        "status": "active",
        "inspiring_message": random.choice(INSPIRING_MESSAGES),
        "created_at": now.isoformat(),
        "completed_at": None,
    }
    _team_goals[goal_id] = goal
    return {"ok": True, "goal": goal}


@router.put("/goals/{goal_id}/progress")
def update_goal_progress(
    goal_id: str,
    body: GoalUpdate,
    user: User = Depends(get_current_user),
):
    """Update goal progress."""
    if goal_id not in _team_goals:
        raise HTTPException(404, "Goal not found")
    goal = _team_goals[goal_id]
    if body.current_value is not None:
        goal["current_value"] = body.current_value
    if body.status:
        goal["status"] = body.status
    if goal["current_value"] >= goal["target_value"] and goal["status"] == "active":
        goal["status"] = "completed"
        goal["completed_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True, "goal": goal}


@router.post("/goals/{goal_id}/complete")
def complete_goal(
    goal_id: str,
    user: User = Depends(get_current_user),
):
    """Mark a goal as completed."""
    if goal_id not in _team_goals:
        raise HTTPException(404, "Goal not found")
    goal = _team_goals[goal_id]
    goal["status"] = "completed"
    goal["current_value"] = goal["target_value"]
    goal["completed_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True, "goal": goal}


@router.post("/goals/auto-generate")
def auto_generate_goals(
    area: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Auto-generate goals based on assigned calling area."""
    now = datetime.now(timezone.utc)
    states = []
    if area and area in STATE_REGIONS:
        states = STATE_REGIONS[area]
    elif area and len(area) == 2:
        states = [area.upper()]

    lead_count = 0
    if states:
        lead_count = db.query(func.count(SalesLead.id)).filter(
            SalesLead.state.in_(states),
            SalesLead.contact_email.isnot(None),
            SalesLead.status.notin_(("converted", "not_interested", "email_bounced")),
        ).scalar() or 0

    region_label = area.replace("_", " ").title() if area else "All Regions"
    goals = []

    templates = [
        {"title": f"Make {min(lead_count, 20)} outreach calls in {region_label}",
         "type": "calls", "target": min(lead_count, 20),
         "desc": f"Reach out to {min(lead_count, 20)} agencies across {region_label}. Focus on warm leads first."},
        {"title": f"Book {min(max(lead_count // 5, 3), 8)} demos this week",
         "type": "demos", "target": min(max(lead_count // 5, 3), 8),
         "desc": "Convert cold calls into live product demonstrations."},
        {"title": f"Send {min(lead_count, 30)} personalized emails",
         "type": "emails", "target": min(lead_count, 30),
         "desc": f"Send targeted outreach emails to agencies in {region_label}."},
        {"title": "Get 2 trial signups this week",
         "type": "conversions", "target": 2,
         "desc": "Guide interested agencies through their first trial signup."},
    ]

    for t in templates:
        gid = str(uuid.uuid4())
        goal = {
            "id": gid,
            "user_id": str(user.id),
            "user_name": user.full_name or user.email,
            "title": t["title"],
            "description": t["desc"],
            "goal_type": t["type"],
            "target_value": t["target"],
            "current_value": 0,
            "area": area,
            "due_date": (now + timedelta(days=7)).strftime("%Y-%m-%d"),
            "status": "active",
            "inspiring_message": random.choice(INSPIRING_MESSAGES),
            "created_at": now.isoformat(),
            "completed_at": None,
        }
        _team_goals[gid] = goal
        goals.append(goal)

    return {
        "ok": True,
        "goals": goals,
        "lead_count": lead_count,
        "region": region_label,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
