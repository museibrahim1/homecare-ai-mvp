"""
Scheduler & Goals Router — Team-level demo scheduling, auto-tasks, and goal tracking.

Accessible to admin and admin_team users. Demos are shared across the team and
visible in the CEO admin scheduler. Goals auto-generate based on assigned calling
areas and can be shared to team chat upon completion.
"""

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

logger = logging.getLogger(__name__)
router = APIRouter()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PYDANTIC SCHEMAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ScheduledDemoCreate(BaseModel):
    contact_name: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    company_name: Optional[str] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    duration_minutes: int = 30
    notes: Optional[str] = None
    lead_id: Optional[str] = None
    investor_id: Optional[str] = None
    source: str = "cold_call"  # cold_call | inbound | referral


class ScheduledDemoUpdate(BaseModel):
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    company_name: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class CrmSearchResult(BaseModel):
    id: str
    type: str  # "lead" | "investor"
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goal_type: str = "calls"  # calls | demos | emails | conversions
    target_value: int = 10
    area: Optional[str] = None  # state or region
    due_date: Optional[str] = None


class GoalUpdate(BaseModel):
    current_value: Optional[int] = None
    status: Optional[str] = None


class MarketingAssetCreate(BaseModel):
    asset_type: str  # email_template | social_post | flyer | call_script
    title: str
    content: str
    target_audience: Optional[str] = None
    tags: List[str] = []


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IN-MEMORY STORES (persisted via localStorage on frontend, DB-backed demos)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_scheduled_demos: dict[str, dict] = {}
_team_goals: dict[str, dict] = {}
_marketing_assets: dict[str, dict] = {}

INSPIRING_MESSAGES = [
    "Every call is a chance to change someone's care journey. You've got this!",
    "Small consistent actions create massive results. Keep pushing!",
    "You're not just selling software — you're transforming healthcare.",
    "One more call could be the one that changes everything.",
    "The agencies you're reaching out to NEED what we're building.",
    "Your persistence today creates the revenue that fuels our mission.",
    "Champions aren't born — they're made one call at a time.",
    "Think about the caregivers who'll get their evenings back because of your work.",
    "Every 'no' gets you closer to the next 'yes'. Stay hungry.",
    "The team is counting on you — and you always deliver.",
    "You're building the future of home care. Own it.",
    "Picture the agency owner who'll thank you in 6 months. That call is today.",
]

STATE_REGIONS = {
    "northeast": ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"],
    "southeast": ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"],
    "midwest": ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
    "southwest": ["AZ", "NM", "OK", "TX"],
    "west": ["AK", "CA", "CO", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY"],
    "mid_atlantic": ["DC", "DE", "MD"],
}


def _region_for_state(state: str) -> str:
    st = state.upper().strip()
    for region, states in STATE_REGIONS.items():
        if st in states:
            return region
    return "other"


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
# SCHEDULED DEMOS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
# TEAM GOALS & AUTO-TASKS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
# MARKETING ASSETS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/marketing-assets")
def list_marketing_assets(
    asset_type: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    """List marketing assets."""
    assets = list(_marketing_assets.values())
    if asset_type:
        assets = [a for a in assets if a.get("asset_type") == asset_type]
    return {"assets": sorted(assets, key=lambda a: a.get("created_at", ""), reverse=True)}


@router.post("/marketing-assets")
def create_marketing_asset(
    body: MarketingAssetCreate,
    user: User = Depends(get_current_user),
):
    """Create a marketing asset (email template, social post, call script, etc.)."""
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    asset = {
        "id": asset_id,
        "asset_type": body.asset_type,
        "title": body.title,
        "content": body.content,
        "target_audience": body.target_audience,
        "tags": body.tags,
        "created_by": user.full_name or user.email,
        "created_by_id": str(user.id),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    _marketing_assets[asset_id] = asset
    return {"ok": True, "asset": asset}


@router.put("/marketing-assets/{asset_id}")
def update_marketing_asset(
    asset_id: str,
    body: MarketingAssetCreate,
    user: User = Depends(get_current_user),
):
    """Update a marketing asset."""
    if asset_id not in _marketing_assets:
        raise HTTPException(404, "Asset not found")
    asset = _marketing_assets[asset_id]
    asset["title"] = body.title
    asset["content"] = body.content
    asset["target_audience"] = body.target_audience
    asset["tags"] = body.tags
    asset["asset_type"] = body.asset_type
    asset["updated_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True, "asset": asset}


@router.delete("/marketing-assets/{asset_id}")
def delete_marketing_asset(
    asset_id: str,
    user: User = Depends(get_current_user),
):
    """Delete a marketing asset."""
    if asset_id not in _marketing_assets:
        raise HTTPException(404, "Asset not found")
    del _marketing_assets[asset_id]
    return {"ok": True}


@router.post("/marketing-assets/ai-generate")
def ai_generate_marketing(
    asset_type: str = Query(...),
    topic: str = Query(...),
    audience: str = Query(default="home care agency owners"),
    user: User = Depends(get_current_user),
):
    """Use AI to generate a marketing asset draft."""
    try:
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise HTTPException(503, "AI generation unavailable — no API key configured")

        type_instructions = {
            "email_template": "Write a professional cold outreach email. Keep it under 200 words, conversational, with a clear CTA.",
            "social_post": "Write a LinkedIn post. Keep it engaging, under 150 words, with relevant hashtags.",
            "flyer": "Write copy for a marketing flyer. Include a headline, 3 key benefits, and a call to action.",
            "call_script": "Write a cold call script. Include an opener, value proposition, objection handling, and close.",
        }
        instruction = type_instructions.get(asset_type, "Write compelling marketing copy.")

        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""You are a marketing copywriter for PalmCare AI, an AI-powered CRM for home healthcare agencies.

Product: PalmCare AI turns voice recordings of patient assessments into complete care plans, SOAP notes, and service contracts automatically. It saves agencies 15-20 hours/week on documentation.

Target audience: {audience}
Topic: {topic}
Asset type: {asset_type}

{instruction}

Write ONLY the content, no meta-commentary. Brand voice: professional, warm, confident. Brand color: teal."""
            }],
        )
        content = msg.content[0].text if msg.content else ""
        return {"ok": True, "content": content, "asset_type": asset_type}

    except ImportError:
        raise HTTPException(503, "AI generation unavailable — anthropic not installed")
    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        raise HTTPException(500, f"AI generation failed: {str(e)}")
