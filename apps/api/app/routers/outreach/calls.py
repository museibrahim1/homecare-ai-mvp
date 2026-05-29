import logging
import os
import uuid as _uuid
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, case, and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

from .common import (
    _drafts,
    EXCLUDED_LEAD_STATUSES, EXCLUDED_CALL_STATUSES, EXCLUDED_INVESTOR_STATUSES,
    PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER, TZ_ORDER,
    BUSINESS_TZ, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY,
    FULL_WORK_DAYS, LAUNCH_DATE,
    EASTERN_STATES, CENTRAL_STATES, MOUNTAIN_STATES, PACIFIC_STATES,
    AGENCY_SUBJECT_HOOKS, AGENCY_TEMPLATES, AGENCY_FOOTER, SITE_URL, IMG, PITCH_DECK_URL,
    _now_eastern, _today_eastern, _today_start, _week_bounds,
    _build_agency_html, _build_investor_text,
    _week_work_days, _cumulative_days_before,
)
from .schemas import (
    AgencyEmailItem, AgencyCallItem, InvestorEmailItem, OutreachStats,
    WeekDayProgress, DailyPlanResponse, MarkCalledBody, GenerateDraftBody,
    DraftResponse, ApproveDraftBody, WeeklySummaryResponse,
    AgencyDraftItem, InvestorDraftItem, WeeklyDayPlan, WeeklyPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/mark-called/{lead_id}")
def mark_called(
    lead_id: UUID,
    body: MarkCalledBody = MarkCalledBody(),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.is_contacted = True
    lead.status = "contacted"
    lead.called_at = now
    lead.updated_at = now

    log_entry = {
        "action": "called",
        "timestamp": now.isoformat(),
        "notes": body.notes or "",
        "by": user.email,
    }
    activity = list(lead.activity_log or [])
    activity.append(log_entry)
    lead.activity_log = activity

    if body.notes:
        existing = lead.notes or ""
        lead.notes = f"{existing}\n[{now.strftime('%Y-%m-%d %H:%M')}] Call: {body.notes}".strip()

    db.commit()
    db.refresh(lead)
    return {"ok": True, "lead_id": str(lead.id), "status": lead.status}


class MarkCallbackBody(BaseModel):
    callback_date: Optional[str] = None
    callback_notes: Optional[str] = None


@router.post("/mark-callback/{lead_id}")
def mark_callback(
    lead_id: UUID,
    body: MarkCallbackBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Flag a lead for callback."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.callback_requested = True
    if body.callback_notes:
        lead.callback_notes = body.callback_notes
    if body.callback_date:
        lead.callback_date = datetime.fromisoformat(body.callback_date)
    lead.updated_at = datetime.now(timezone.utc)

    activity = list(lead.activity_log or [])
    activity.append({
        "action": "callback_requested",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": body.callback_notes or "",
        "by": user.email,
    })
    lead.activity_log = activity
    db.commit()
    return {"ok": True, "lead_id": str(lead.id)}


@router.get("/callbacks")
def list_callbacks(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """List all leads that need callbacks."""
    leads = (
        db.query(SalesLead)
        .filter(SalesLead.callback_requested == True)  # noqa: E712
        .order_by(SalesLead.callback_date.asc().nullslast(), SalesLead.updated_at.desc())
        .all()
    )
    return [
        {
            "id": str(l.id),
            "provider_name": l.provider_name,
            "phone": l.phone,
            "state": l.state,
            "city": l.city,
            "contact_name": l.contact_name,
            "contact_email": l.contact_email,
            "callback_date": l.callback_date.isoformat() if l.callback_date else None,
            "callback_notes": l.callback_notes,
            "notes": l.notes,
            "priority": l.priority,
            "status": l.status,
            "called_at": l.called_at.isoformat() if l.called_at else None,
        }
        for l in leads
    ]


@router.post("/callbacks/{lead_id}/complete")
def complete_callback(
    lead_id: UUID,
    body: MarkCalledBody = MarkCalledBody(),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Mark a callback as completed."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.callback_requested = False
    lead.callback_date = None
    lead.is_contacted = True
    lead.called_at = now
    lead.updated_at = now

    activity = list(lead.activity_log or [])
    activity.append({
        "action": "callback_completed",
        "timestamp": now.isoformat(),
        "notes": body.notes or "",
        "by": user.email,
    })
    lead.activity_log = activity

    if body.notes:
        existing = lead.notes or ""
        lead.notes = f"{existing}\n[{now.strftime('%Y-%m-%d %H:%M')}] Callback: {body.notes}".strip()

    db.commit()
    return {"ok": True, "lead_id": str(lead.id)}


class AssignLeadsBody(BaseModel):
    user_id: str
    lead_ids: Optional[List[str]] = None
    assign_type: str = "call"
    count: int = 25
    states: Optional[List[str]] = None


@router.post("/assign")
def assign_leads_to_team(
    body: AssignLeadsBody,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_permission("command_center")),
):
    """Assign a batch of leads to a team member for calls or emails.
    If lead_ids is provided, assigns those specific leads.
    Otherwise, auto-selects `count` unassigned leads with optional state filter."""

    target_user = db.query(User).filter(User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    if body.lead_ids:
        leads = db.query(SalesLead).filter(SalesLead.id.in_(body.lead_ids)).all()
    else:
        q = db.query(SalesLead).filter(
            SalesLead.assigned_to.is_(None),
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )

        if body.assign_type == "call":
            q = q.filter(
                SalesLead.phone.isnot(None),
                SalesLead.phone != "",
                SalesLead.is_contacted != True,  # noqa: E712
            )
        elif body.assign_type == "email":
            q = q.filter(
                SalesLead.contact_email.isnot(None),
                SalesLead.contact_email != "",
            )

        if body.states:
            q = q.filter(SalesLead.state.in_(body.states))

        q = q.order_by(PRIORITY_ORDER, SalesLead.created_at)
        leads = q.limit(body.count).all()

    now = datetime.now(timezone.utc)
    assigned = 0
    for lead in leads:
        lead.assigned_to = body.user_id
        lead.assigned_type = body.assign_type
        lead.updated_at = now
        activity = list(lead.activity_log or [])
        activity.append({
            "action": "assigned",
            "timestamp": now.isoformat(),
            "assigned_to": target_user.email,
            "assign_type": body.assign_type,
            "by": ceo.email,
        })
        lead.activity_log = activity
        assigned += 1

    db.commit()
    return {
        "ok": True,
        "assigned": assigned,
        "user_id": body.user_id,
        "user_name": target_user.full_name,
        "assign_type": body.assign_type,
    }


@router.post("/unassign")
def unassign_leads(
    body: dict,
    db: Session = Depends(get_db),
    ceo: User = Depends(require_permission("command_center")),
):
    """Unassign leads from a team member. Provide lead_ids or user_id to clear all."""
    lead_ids = body.get("lead_ids", [])
    user_id = body.get("user_id")

    if lead_ids:
        leads = db.query(SalesLead).filter(SalesLead.id.in_(lead_ids)).all()
    elif user_id:
        leads = db.query(SalesLead).filter(SalesLead.assigned_to == user_id).all()
    else:
        raise HTTPException(status_code=400, detail="Provide lead_ids or user_id")

    for lead in leads:
        lead.assigned_to = None
        lead.assigned_type = None

    db.commit()
    return {"ok": True, "unassigned": len(leads)}


@router.get("/assignments")
def list_assignments(
    user_id: Optional[str] = None,
    assign_type: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """List assigned leads, with optional filters."""
    q = db.query(SalesLead).filter(SalesLead.assigned_to.isnot(None))

    if user_id:
        q = q.filter(SalesLead.assigned_to == user_id)
    if assign_type:
        q = q.filter(SalesLead.assigned_type == assign_type)
    if state:
        q = q.filter(SalesLead.state == state)

    leads = q.order_by(PRIORITY_ORDER, SalesLead.created_at).all()

    return [
        {
            "id": str(l.id),
            "provider_name": l.provider_name,
            "phone": l.phone,
            "state": l.state,
            "city": l.city,
            "contact_name": l.contact_name,
            "contact_email": l.contact_email,
            "priority": l.priority,
            "status": l.status,
            "assigned_to": l.assigned_to,
            "assigned_type": l.assigned_type,
            "is_contacted": l.is_contacted or False,
            "callback_requested": l.callback_requested or False,
            "notes": l.notes,
        }
        for l in leads
    ]


@router.get("/my-assignments")
def my_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the current user's assigned leads (for team member dashboards)."""
    leads = (
        db.query(SalesLead)
        .filter(SalesLead.assigned_to == str(user.id))
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .all()
    )

    calls = [l for l in leads if l.assigned_type == "call"]
    emails = [l for l in leads if l.assigned_type == "email"]

    def _lead_dict(l):
        return {
            "id": str(l.id),
            "provider_name": l.provider_name,
            "phone": l.phone,
            "state": l.state,
            "city": l.city,
            "contact_name": l.contact_name,
            "contact_email": l.contact_email,
            "priority": l.priority,
            "status": l.status,
            "assigned_type": l.assigned_type,
            "is_contacted": l.is_contacted or False,
            "callback_requested": l.callback_requested or False,
            "callback_notes": l.callback_notes,
            "notes": l.notes,
        }

    return {
        "calls": [_lead_dict(l) for l in calls],
        "emails": [_lead_dict(l) for l in emails],
        "total_calls": len(calls),
        "total_emails": len(emails),
        "calls_completed": sum(1 for l in calls if l.is_contacted),
        "emails_sent": sum(1 for l in emails if l.last_email_sent_at is not None),
    }


@router.get("/available-states")
def available_states(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Get all states with lead counts for the assignment filter."""
    from sqlalchemy import distinct
    rows = (
        db.query(SalesLead.state, func.count(SalesLead.id))
        .filter(
            SalesLead.state.isnot(None),
            SalesLead.assigned_to.is_(None),
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .group_by(SalesLead.state)
        .order_by(SalesLead.state)
        .all()
    )
    return [{"state": r[0], "count": r[1]} for r in rows]


class BulkMarkCalledItem(BaseModel):
    phone: str
    notes: Optional[str] = None
    follow_up: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    called_at: Optional[str] = None
    callback: bool = False
    callback_notes: Optional[str] = None


@router.post("/cron/bulk-mark-called")
def cron_bulk_mark_called(
    request: Request,
    items: List[BulkMarkCalledItem],
    db: Session = Depends(get_db),
):
    """Bulk mark leads as called via internal key. Also updates contact info if provided."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    now = datetime.now(timezone.utc)
    results = []
    for item in items:
        phone_clean = item.phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        lead = db.query(SalesLead).filter(
            func.replace(func.replace(func.replace(func.replace(
                SalesLead.phone, " ", ""), "-", ""), "(", ""), ")", "") == phone_clean
        ).first()

        if not lead:
            results.append({"phone": item.phone, "status": "not_found"})
            continue

        call_time = datetime.fromisoformat(item.called_at) if item.called_at else now
        lead.is_contacted = True
        lead.status = "contacted"
        lead.called_at = call_time
        lead.updated_at = now

        if item.contact_name:
            lead.contact_name = item.contact_name
        if item.contact_email:
            lead.contact_email = item.contact_email

        if item.callback:
            lead.callback_requested = True
            lead.callback_notes = item.callback_notes or item.notes

        log_entry = {
            "action": "called",
            "timestamp": call_time.isoformat(),
            "notes": item.notes or "",
            "by": "system/bulk",
        }
        activity = list(lead.activity_log or [])
        activity.append(log_entry)
        lead.activity_log = activity

        if item.notes:
            ts = call_time.strftime('%Y-%m-%d %H:%M')
            existing = lead.notes or ""
            lead.notes = f"{existing}\n[{ts}] Call: {item.notes}".strip()

        if item.follow_up:
            ts = call_time.strftime('%Y-%m-%d %H:%M')
            existing = lead.notes or ""
            lead.notes = f"{existing}\n[{ts}] Follow-up: {item.follow_up}".strip()

        results.append({
            "phone": item.phone,
            "status": "marked",
            "provider_name": lead.provider_name,
            "lead_id": str(lead.id),
        })

    db.commit()
    marked = sum(1 for r in results if r["status"] == "marked")
    return {"marked": marked, "not_found": len(results) - marked, "results": results}


