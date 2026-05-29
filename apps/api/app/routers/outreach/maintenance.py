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

class LogPastCallItem(BaseModel):
    phone: str
    notes: Optional[str] = None
    called_at: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    callback: bool = False
    callback_notes: Optional[str] = None


@router.post("/log-past-calls")
def log_past_calls(
    items: List[LogPastCallItem],
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Log calls with specific timestamps (for data correction)."""
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

        call_time = datetime.fromisoformat(item.called_at)
        lead.is_contacted = True
        lead.status = "contacted"
        lead.called_at = call_time
        lead.updated_at = datetime.now(timezone.utc)

        if item.contact_name:
            lead.contact_name = item.contact_name
        if item.contact_email:
            lead.contact_email = item.contact_email
        if item.callback:
            lead.callback_requested = True
            lead.callback_notes = item.callback_notes or item.notes

        activity = list(lead.activity_log or [])
        activity.append({
            "action": "called",
            "timestamp": call_time.isoformat(),
            "notes": item.notes or "",
            "by": user.email,
        })
        lead.activity_log = activity

        if item.notes:
            ts = call_time.strftime('%Y-%m-%d %H:%M')
            existing = lead.notes or ""
            lead.notes = f"{existing}\n[{ts}] Call: {item.notes}".strip()

        results.append({
            "phone": item.phone,
            "status": "logged",
            "provider_name": lead.provider_name,
            "lead_id": str(lead.id),
            "called_at": call_time.isoformat(),
        })

    db.commit()
    logged = sum(1 for r in results if r["status"] == "logged")
    return {"logged": logged, "not_found": len(results) - logged, "results": results}


@router.post("/fix-thursday-data")
def fix_thursday_data(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """One-time fix: reset called_at for leads that were falsely marked on Thursday
    due to updated_at being bumped by non-call updates (migrations, code changes)."""
    today = _today_eastern()
    eastern_today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=BUSINESS_TZ)
    utc_today_start = eastern_today_start.astimezone(timezone.utc)

    falsely_marked = (
        db.query(SalesLead)
        .filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.called_at >= utc_today_start,
        )
        .all()
    )

    fixed = 0
    for lead in falsely_marked:
        has_real_call_today = False
        for entry in (lead.activity_log or []):
            if entry.get("action") == "called":
                try:
                    entry_time = datetime.fromisoformat(entry["timestamp"])
                    if entry_time >= utc_today_start:
                        has_real_call_today = True
                        break
                except (ValueError, KeyError):
                    pass

        if not has_real_call_today:
            lead.called_at = None
            fixed += 1

    db.commit()
    return {"ok": True, "fixed": fixed, "checked": len(falsely_marked)}


@router.post("/cron/fix-all-call-data")
def cron_fix_all_call_data(
    request: Request,
    db: Session = Depends(get_db),
):
    """Comprehensive fix: recalculate called_at for ALL contacted leads using activity_log.
    Also detects callbacks from notes and marks callback_requested.
    Accessible via cron key."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    all_contacted = (
        db.query(SalesLead)
        .filter(SalesLead.is_contacted == True)  # noqa: E712
        .all()
    )

    fixed_called_at = 0
    cleared_called_at = 0
    callbacks_found = 0
    details = []

    for lead in all_contacted:
        activity = lead.activity_log or []

        call_entries = [
            e for e in activity
            if e.get("action") == "called" and e.get("timestamp")
        ]

        if call_entries:
            try:
                first_call = min(
                    call_entries,
                    key=lambda e: datetime.fromisoformat(e["timestamp"]),
                )
                correct_time = datetime.fromisoformat(first_call["timestamp"])
                if not correct_time.tzinfo:
                    correct_time = correct_time.replace(tzinfo=timezone.utc)

                if lead.called_at != correct_time:
                    old_val = lead.called_at.isoformat() if lead.called_at else "None"
                    lead.called_at = correct_time
                    fixed_called_at += 1
                    details.append({
                        "provider_name": lead.provider_name,
                        "action": "fixed_called_at",
                        "old": old_val,
                        "new": correct_time.isoformat(),
                    })
            except (ValueError, KeyError):
                pass
        else:
            if lead.called_at:
                details.append({
                    "provider_name": lead.provider_name,
                    "action": "cleared_called_at",
                    "reason": "no call entries in activity_log",
                    "old": lead.called_at.isoformat(),
                })
                lead.called_at = None
                cleared_called_at += 1

        notes_lower = (lead.notes or "").lower()
        callback_notes_lower = (lead.callback_notes or "").lower()
        has_callback_mention = any(phrase in notes_lower for phrase in [
            "call back", "callback", "call me back", "wants info",
            "send info", "follow up", "interested",
        ])

        if has_callback_mention and not lead.callback_requested:
            lead.callback_requested = True
            if not lead.callback_notes:
                for line in (lead.notes or "").split("\n"):
                    line_lower = line.lower()
                    if any(p in line_lower for p in ["call back", "callback", "send info", "follow up", "interested"]):
                        lead.callback_notes = line.strip()
                        break
            callbacks_found += 1
            details.append({
                "provider_name": lead.provider_name,
                "phone": lead.phone,
                "action": "marked_callback",
                "notes_excerpt": (lead.callback_notes or lead.notes or "")[:100],
            })

    ghost_contacted = 0
    ghost_leads = (
        db.query(SalesLead)
        .filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.called_at.is_(None),
        )
        .all()
    )
    for lead in ghost_leads:
        activity = lead.activity_log or []
        has_any_call = any(e.get("action") == "called" for e in activity)
        if not has_any_call:
            lead.is_contacted = False
            lead.status = "new" if lead.status == "contacted" else lead.status
            ghost_contacted += 1
            details.append({
                "provider_name": lead.provider_name,
                "action": "reset_is_contacted",
                "reason": "no call activity and no called_at",
            })

    db.commit()

    return {
        "ok": True,
        "total_contacted": len(all_contacted),
        "fixed_called_at": fixed_called_at,
        "cleared_called_at": cleared_called_at,
        "ghost_contacted_reset": ghost_contacted,
        "callbacks_found": callbacks_found,
        "details": details,
    }


@router.get("/cron/call-data-audit")
def cron_call_data_audit(
    request: Request,
    db: Session = Depends(get_db),
):
    """Audit called_at data — shows how many calls per day and flags issues."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    all_contacted = (
        db.query(SalesLead)
        .filter(SalesLead.is_contacted == True)  # noqa: E712
        .all()
    )

    calls_by_date = {}
    no_called_at = []
    no_activity = []

    for lead in all_contacted:
        if lead.called_at:
            day = lead.called_at.strftime("%Y-%m-%d")
            calls_by_date.setdefault(day, [])
            calls_by_date[day].append(lead.provider_name)
        else:
            no_called_at.append(lead.provider_name)

        activity = lead.activity_log or []
        call_entries = [e for e in activity if e.get("action") == "called"]
        if not call_entries:
            no_activity.append(lead.provider_name)

    investors_with_email = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
    ).scalar() or 0
    investors_no_email = db.query(func.count(Investor.id)).filter(
        (Investor.contact_email.is_(None)) | (Investor.contact_email == ""),
    ).scalar() or 0

    callbacks = db.query(SalesLead).filter(
        SalesLead.callback_requested == True  # noqa: E712
    ).count()

    callback_in_notes = 0
    for lead in all_contacted:
        notes_lower = (lead.notes or "").lower()
        if any(p in notes_lower for p in ["call back", "callback", "send info", "follow up"]):
            callback_in_notes += 1

    return {
        "total_contacted": len(all_contacted),
        "calls_by_date": {k: {"count": len(v), "leads": v[:5]} for k, v in sorted(calls_by_date.items())},
        "no_called_at": {"count": len(no_called_at), "leads": no_called_at[:10]},
        "no_call_in_activity_log": {"count": len(no_activity), "leads": no_activity[:10]},
        "callbacks_flagged": callbacks,
        "callback_mentions_in_notes": callback_in_notes,
        "investors_with_email": investors_with_email,
        "investors_no_email": investors_no_email,
    }


def _require_cron_or_auth(request: Request, user=None):
    """Accept either JWT auth or X-Internal-Key / CRON_SECRET."""
    if user:
        return
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)


@router.get("/sequence-status")
def get_sequence_status(
    request: Request,
    db: Session = Depends(get_db),
):
    """Diagnostic: show how many leads are in each sequence state.
    Accepts X-Internal-Key / CRON_SECRET."""
    _require_cron_or_auth(request)
    total_leads = db.query(func.count(SalesLead.id)).scalar() or 0
    with_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
    ).scalar() or 0
    emailed_at_least_once = db.query(func.count(SalesLead.id)).filter(
        SalesLead.email_send_count > 0,
    ).scalar() or 0
    in_sequence = db.query(func.count(SalesLead.id)).filter(
        SalesLead.sequence_step > 0,
        SalesLead.sequence_completed != True,
    ).scalar() or 0
    sequence_completed = db.query(func.count(SalesLead.id)).filter(
        SalesLead.sequence_completed == True,
    ).scalar() or 0
    emailed_no_sequence = db.query(func.count(SalesLead.id)).filter(
        SalesLead.email_send_count > 0,
        (SalesLead.sequence_step.is_(None)) | (SalesLead.sequence_step == 0),
        SalesLead.sequence_completed != True,
    ).scalar() or 0
    due_for_next = db.query(func.count(SalesLead.id)).filter(
        SalesLead.next_email_scheduled_at.isnot(None),
        SalesLead.next_email_scheduled_at <= datetime.now(timezone.utc),
        SalesLead.sequence_completed != True,
    ).scalar() or 0
    never_emailed = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
    ).scalar() or 0

    by_step = {}
    for step in range(0, 6):
        cnt = db.query(func.count(SalesLead.id)).filter(
            SalesLead.sequence_step == step,
        ).scalar() or 0
        by_step[f"step_{step}"] = cnt

    return {
        "total_leads": total_leads,
        "with_email": with_email,
        "emailed_at_least_once": emailed_at_least_once,
        "in_active_sequence": in_sequence,
        "sequence_completed": sequence_completed,
        "emailed_but_no_sequence": emailed_no_sequence,
        "due_for_next_email": due_for_next,
        "never_emailed": never_emailed,
        "by_step": by_step,
    }


@router.post("/fix-sequences")
def fix_missing_sequences(
    request: Request,
    db: Session = Depends(get_db),
):
    """Retroactively start sequences for all emailed leads that aren't in one.
    Accepts X-Internal-Key / CRON_SECRET."""
    _require_cron_or_auth(request)
    from app.routers.sales_leads import _auto_start_sequence

    leads = db.query(SalesLead).filter(
        SalesLead.email_send_count > 0,
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
        (SalesLead.sequence_step.is_(None)) | (SalesLead.sequence_step == 0),
        SalesLead.sequence_completed != True,
        SalesLead.status.notin_(["not_interested", "converted", "responded", "email_bounced"]),
    ).all()

    started = 0
    for lead in leads:
        _auto_start_sequence(lead, lead.campaign_tag or "retroactive-sequence", db)
        started += 1

    db.commit()
    return {
        "message": f"Started sequences for {started} leads that were emailed but had no active sequence",
        "started": started,
    }
