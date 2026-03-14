"""
PalmCare AI Agent — Claude-powered command center automation.

Accepts natural language instructions and executes outreach operations:
send emails, mark calls, assign leads, check stats, search, etc.
"""

import os
import json
import logging
import time as _time
from datetime import datetime, timezone, date, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.core.deps import get_current_user, require_permission

logger = logging.getLogger(__name__)

router = APIRouter()

AGENT_MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are Palm, the AI operations agent for PalmCare AI — a voice-to-contract platform for home healthcare agencies.

You help the CEO (Muse) manage daily outreach operations: sending emails to agencies and investors, tracking phone calls, managing callbacks, assigning work to team members, and monitoring progress.

CURRENT CONTEXT:
- Today is {today}
- The outreach system runs Mon-Fri. Week 1 started Tuesday March 10, 2026.
- Agencies are home healthcare providers we're selling to (50 emails/day, 25 calls/day).
- Investors are VCs/angels we're fundraising from (10 emails/day).
- Past days show actual data. Future days show planned work from unsent/uncalled pools.

RULES:
1. Always confirm before sending emails or making bulk changes. Say what you'll do first.
2. When asked to "send emails", use the batch_send tool with the right types.
3. Be concise but informative. Show counts and key details.
4. If something fails, explain the error clearly and suggest a fix.
5. Use markdown for formatting responses.
6. Never expose API keys, passwords, or internal system details.
7. For stats, always pull fresh data — don't guess.
"""


TOOLS = [
    {
        "name": "get_outreach_stats",
        "description": "Get current outreach statistics: total leads, emails sent, calls made, investors contacted, callbacks pending, team assignments.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "get_weekly_summary",
        "description": "Get a summary of the current week's outreach: emails sent/pending per day, calls made/pending per day, investor emails sent/pending.",
        "input_schema": {
            "type": "object",
            "properties": {
                "week_offset": {
                    "type": "integer",
                    "description": "0 = current week, 1 = next week, -1 = last week. Default 0.",
                },
            },
            "required": [],
        },
    },
    {
        "name": "batch_send_emails",
        "description": "Send all pending emails for today. Types: 'agency' (outreach to home care agencies), 'investor' (pitch to VCs/angels). Can send one or both.",
        "input_schema": {
            "type": "object",
            "properties": {
                "types": {
                    "type": "array",
                    "items": {"type": "string", "enum": ["agency", "investor"]},
                    "description": "Which email types to send. E.g. ['agency', 'investor'] for both.",
                },
            },
            "required": ["types"],
        },
    },
    {
        "name": "mark_call_done",
        "description": "Mark a specific lead as called with optional notes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_name": {
                    "type": "string",
                    "description": "Name (or partial name) of the agency/lead to mark as called.",
                },
                "notes": {
                    "type": "string",
                    "description": "Call notes to record.",
                },
                "callback": {
                    "type": "boolean",
                    "description": "If true, also mark this lead for a callback.",
                },
            },
            "required": ["lead_name"],
        },
    },
    {
        "name": "search_leads",
        "description": "Search sales leads (agencies) by name, state, status, or other criteria.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term — matches against provider name, city, state, notes.",
                },
                "state": {
                    "type": "string",
                    "description": "Filter by US state abbreviation (e.g. 'FL', 'TX').",
                },
                "status": {
                    "type": "string",
                    "description": "Filter by status: 'new', 'contacted', 'email_sent', 'interested', 'demo_scheduled'.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 10).",
                },
            },
            "required": [],
        },
    },
    {
        "name": "search_investors",
        "description": "Search investors by fund name, type, location, or focus area.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term — matches fund name, contact name, location, sectors.",
                },
                "has_email": {
                    "type": "boolean",
                    "description": "If true, only return investors with contact emails.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results (default 10).",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_callbacks",
        "description": "Get all leads marked for callback, with their phone numbers and notes.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "add_lead_notes",
        "description": "Add notes to a specific lead (by name search).",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_name": {
                    "type": "string",
                    "description": "Name (or partial name) of the agency/lead.",
                },
                "notes": {
                    "type": "string",
                    "description": "Notes to append.",
                },
            },
            "required": ["lead_name", "notes"],
        },
    },
    {
        "name": "assign_leads_to_team",
        "description": "Assign a batch of leads (calls or emails) to a team member.",
        "input_schema": {
            "type": "object",
            "properties": {
                "team_member_email": {
                    "type": "string",
                    "description": "Email of the team member to assign to.",
                },
                "assign_type": {
                    "type": "string",
                    "enum": ["call", "email"],
                    "description": "Type of assignment.",
                },
                "count": {
                    "type": "integer",
                    "description": "Number of leads to assign (default 20).",
                },
                "states": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by US states (e.g. ['FL', 'TX', 'CA']).",
                },
            },
            "required": ["team_member_email", "assign_type"],
        },
    },
    {
        "name": "get_pending_work",
        "description": "Get a summary of all pending work: unsent emails, uncalled leads, callbacks, assignments.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "send_single_email",
        "description": "Send an email to a single specific agency or investor by name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Name of the agency or investor fund.",
                },
                "type": {
                    "type": "string",
                    "enum": ["agency", "investor"],
                    "description": "Whether this is an agency or investor.",
                },
            },
            "required": ["name", "type"],
        },
    },
]


# ── Tool Implementations ──────────────────────────────────────────────

def _today_eastern() -> date:
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("America/New_York")).date()


def _tool_get_outreach_stats(db: Session) -> dict:
    total_leads = db.query(func.count(SalesLead.id)).scalar() or 0
    leads_with_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
    ).scalar() or 0
    leads_emailed = db.query(func.count(SalesLead.id)).filter(
        SalesLead.email_send_count > 0,
    ).scalar() or 0
    leads_contacted = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,
    ).scalar() or 0
    leads_uncalled = db.query(func.count(SalesLead.id)).filter(
        SalesLead.phone.isnot(None), SalesLead.phone != "",
        SalesLead.is_contacted != True,
    ).scalar() or 0
    unsent_agencies = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
    ).scalar() or 0

    total_investors = db.query(func.count(Investor.id)).scalar() or 0
    investors_with_email = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
    ).scalar() or 0
    investors_emailed = db.query(func.count(Investor.id)).filter(
        Investor.email_send_count > 0,
    ).scalar() or 0
    unsent_investors = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
    ).scalar() or 0

    callbacks = db.query(func.count(SalesLead.id)).filter(
        SalesLead.callback_requested == True,
    ).scalar() or 0

    return {
        "total_leads": total_leads,
        "leads_with_email": leads_with_email,
        "leads_emailed": leads_emailed,
        "leads_contacted_by_phone": leads_contacted,
        "leads_uncalled": leads_uncalled,
        "unsent_agency_emails": unsent_agencies,
        "total_investors": total_investors,
        "investors_with_email": investors_with_email,
        "investors_emailed": investors_emailed,
        "unsent_investor_emails": unsent_investors,
        "callbacks_pending": callbacks,
    }


def _tool_get_weekly_summary(db: Session, week_offset: int = 0) -> dict:
    from app.routers.outreach import _week_work_days, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY, BUSINESS_TZ
    today = _today_eastern()
    work_days = _week_work_days(week_offset)
    days_summary = []

    for day_name, day_date in work_days:
        day_start_utc = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
        day_end_utc = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)

        agencies_sent = db.query(func.count(SalesLead.id)).filter(
            SalesLead.last_email_sent_at >= day_start_utc,
            SalesLead.last_email_sent_at <= day_end_utc,
        ).scalar() or 0

        investors_sent = db.query(func.count(Investor.id)).filter(
            Investor.last_email_sent_at >= day_start_utc,
            Investor.last_email_sent_at <= day_end_utc,
        ).scalar() or 0

        calls_made = db.query(func.count(SalesLead.id)).filter(
            SalesLead.is_contacted == True,
            SalesLead.called_at >= day_start_utc,
            SalesLead.called_at <= day_end_utc,
        ).scalar() or 0

        is_past = day_date < today
        is_today = day_date == today
        days_summary.append({
            "day": day_name,
            "date": day_date.isoformat(),
            "is_past": is_past,
            "is_today": is_today,
            "agencies_sent": agencies_sent,
            "agencies_target": EMAILS_PER_DAY if not is_past else agencies_sent,
            "investors_sent": investors_sent,
            "investors_target": INVESTORS_PER_DAY if not is_past else investors_sent,
            "calls_made": calls_made,
            "calls_target": CALLS_PER_DAY if not is_past else calls_made,
        })

    return {
        "week_offset": week_offset,
        "week_start": work_days[0][1].isoformat() if work_days else None,
        "week_end": work_days[-1][1].isoformat() if work_days else None,
        "days": days_summary,
    }


def _tool_batch_send_emails(db: Session, user: User, types: list) -> dict:
    from app.routers.outreach import (
        EMAILS_PER_DAY, INVESTORS_PER_DAY,
        EXCLUDED_LEAD_STATUSES, EXCLUDED_INVESTOR_STATUSES,
        PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER,
        _build_agency_html, _build_investor_text,
    )
    from app.services.email_service import email_service

    today = _today_eastern()
    now = datetime.now(timezone.utc)
    results = {"agencies": {"sent": 0, "skipped": 0, "failed": 0}, "investors": {"sent": 0, "skipped": 0, "failed": 0}}

    if "agency" in types:
        unsent = (
            db.query(SalesLead)
            .filter(
                SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
            )
            .order_by(PRIORITY_ORDER, SalesLead.created_at)
            .limit(EMAILS_PER_DAY)
            .all()
        )
        for lead in unsent:
            if lead.last_email_sent_at and lead.last_email_sent_at.date() >= today:
                results["agencies"]["skipped"] += 1
                continue
            subj, body_html = _build_agency_html(lead.provider_name, lead.city or "your area", lead.state or "US")
            result = email_service.send_email(
                to=lead.contact_email, subject=subj, html=body_html,
                reply_to="sales@palmtai.com", sender="Muse Ibrahim <sales@send.palmtai.com>",
            )
            if result.get("success"):
                lead.last_email_sent_at = now
                lead.last_email_subject = subj
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.status = "email_sent"
                lead.updated_at = now
                activity = list(lead.activity_log or [])
                activity.append({"action": "email_sent", "timestamp": now.isoformat(), "subject": subj, "by": user.email})
                lead.activity_log = activity
                results["agencies"]["sent"] += 1
            else:
                results["agencies"]["failed"] += 1
            _time.sleep(0.6)

    if "investor" in types:
        unsent_inv = (
            db.query(Investor)
            .filter(
                Investor.contact_email.isnot(None), Investor.contact_email != "",
                Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
            )
            .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
            .limit(INVESTORS_PER_DAY)
            .all()
        )
        for inv in unsent_inv:
            if inv.last_email_sent_at and inv.last_email_sent_at.date() >= today:
                results["investors"]["skipped"] += 1
                continue
            focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
            subj, body_text = _build_investor_text(inv.fund_name, inv.contact_name or "", focus)
            html = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{body_text}</pre>"
            result = email_service.send_email(
                to=inv.contact_email, subject=subj, html=html, text=body_text,
                reply_to="invest@palmtai.com", sender="Muse Ibrahim <invest@send.palmtai.com>",
            )
            if result.get("success"):
                inv.last_email_sent_at = now
                inv.last_email_subject = subj
                inv.email_send_count = (inv.email_send_count or 0) + 1
                inv.status = "email_sent"
                inv.updated_at = now
                activity = list(inv.activity_log or [])
                activity.append({"action": "email_sent", "timestamp": now.isoformat(), "subject": subj, "by": user.email})
                inv.activity_log = activity
                results["investors"]["sent"] += 1
            else:
                results["investors"]["failed"] += 1
            _time.sleep(0.6)

    db.commit()
    return results


def _tool_mark_call_done(db: Session, user: User, lead_name: str, notes: str = "", callback: bool = False) -> dict:
    lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{lead_name}%")).first()
    if not lead:
        return {"error": f"No lead found matching '{lead_name}'"}

    now = datetime.now(timezone.utc)
    lead.is_contacted = True
    lead.status = "contacted"
    lead.called_at = now
    lead.updated_at = now
    if notes:
        existing = lead.notes or ""
        timestamp = now.strftime("[%Y-%m-%d %H:%M]")
        lead.notes = f"{existing}\n{timestamp} Call: {notes}".strip()
    if callback:
        lead.callback_requested = True
        lead.callback_notes = notes

    activity = list(lead.activity_log or [])
    activity.append({"action": "called", "timestamp": now.isoformat(), "notes": notes, "by": user.email})
    lead.activity_log = activity
    db.commit()

    return {"ok": True, "lead": lead.provider_name, "phone": lead.phone, "state": lead.state, "callback": callback}


def _tool_search_leads(db: Session, query: str = "", state: str = "", status: str = "", limit: int = 10) -> dict:
    q = db.query(SalesLead)
    if query:
        pattern = f"%{query}%"
        q = q.filter(
            SalesLead.provider_name.ilike(pattern)
            | SalesLead.city.ilike(pattern)
            | SalesLead.notes.ilike(pattern)
        )
    if state:
        q = q.filter(SalesLead.state == state.upper())
    if status:
        q = q.filter(SalesLead.status == status)
    leads = q.limit(limit).all()
    return {
        "count": len(leads),
        "leads": [
            {
                "name": l.provider_name, "state": l.state, "city": l.city,
                "phone": l.phone, "email": l.contact_email, "status": l.status,
                "priority": l.priority, "contacted": l.is_contacted,
                "emails_sent": l.email_send_count or 0,
                "notes": (l.notes or "")[:200],
            }
            for l in leads
        ],
    }


def _tool_search_investors(db: Session, query: str = "", has_email: bool = False, limit: int = 10) -> dict:
    q = db.query(Investor)
    if query:
        pattern = f"%{query}%"
        q = q.filter(
            Investor.fund_name.ilike(pattern)
            | Investor.contact_name.ilike(pattern)
            | Investor.location.ilike(pattern)
        )
    if has_email:
        q = q.filter(Investor.contact_email.isnot(None), Investor.contact_email != "")
    investors = q.limit(limit).all()
    return {
        "count": len(investors),
        "investors": [
            {
                "fund_name": i.fund_name, "type": i.investor_type,
                "contact_name": i.contact_name, "email": i.contact_email,
                "location": i.location, "stages": i.focus_stages or [],
                "sectors": i.focus_sectors or [], "status": i.status,
                "emails_sent": i.email_send_count or 0,
                "check_size": i.check_size_display,
            }
            for i in investors
        ],
    }


def _tool_get_callbacks(db: Session) -> dict:
    leads = (
        db.query(SalesLead)
        .filter(SalesLead.callback_requested == True)
        .order_by(SalesLead.callback_date.asc().nullslast(), SalesLead.updated_at.desc())
        .all()
    )
    return {
        "count": len(leads),
        "callbacks": [
            {
                "name": l.provider_name, "phone": l.phone,
                "state": l.state, "city": l.city,
                "callback_notes": l.callback_notes,
                "notes": (l.notes or "")[:200],
                "callback_date": l.callback_date.isoformat() if l.callback_date else None,
            }
            for l in leads
        ],
    }


def _tool_add_lead_notes(db: Session, user: User, lead_name: str, notes: str) -> dict:
    lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{lead_name}%")).first()
    if not lead:
        return {"error": f"No lead found matching '{lead_name}'"}

    now = datetime.now(timezone.utc)
    timestamp = now.strftime("[%Y-%m-%d %H:%M]")
    existing = lead.notes or ""
    lead.notes = f"{existing}\n{timestamp} Note: {notes}".strip()
    lead.updated_at = now

    activity = list(lead.activity_log or [])
    activity.append({"action": "note_added", "timestamp": now.isoformat(), "notes": notes, "by": user.email})
    lead.activity_log = activity
    db.commit()

    return {"ok": True, "lead": lead.provider_name, "notes_added": notes}


def _tool_assign_leads(db: Session, user: User, team_member_email: str, assign_type: str, count: int = 20, states: list = None) -> dict:
    team_member = db.query(User).filter(User.email == team_member_email, User.is_active == True).first()
    if not team_member:
        return {"error": f"No active team member found with email '{team_member_email}'"}

    q = db.query(SalesLead).filter(SalesLead.assigned_to.is_(None))

    if assign_type == "call":
        q = q.filter(SalesLead.phone.isnot(None), SalesLead.phone != "", SalesLead.is_contacted != True)
    else:
        q = q.filter(
            SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
            (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
        )

    if states:
        q = q.filter(SalesLead.state.in_([s.upper() for s in states]))

    leads = q.limit(count).all()
    now = datetime.now(timezone.utc)
    for lead in leads:
        lead.assigned_to = str(team_member.id)
        lead.assigned_type = assign_type
        lead.updated_at = now

    db.commit()
    return {
        "ok": True,
        "assigned": len(leads),
        "to": team_member.full_name or team_member.email,
        "type": assign_type,
        "states": states,
    }


def _tool_get_pending_work(db: Session) -> dict:
    unsent_agencies = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
    ).scalar() or 0

    unsent_investors = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
    ).scalar() or 0

    uncalled = db.query(func.count(SalesLead.id)).filter(
        SalesLead.phone.isnot(None), SalesLead.phone != "",
        SalesLead.is_contacted != True,
    ).scalar() or 0

    callbacks = db.query(func.count(SalesLead.id)).filter(
        SalesLead.callback_requested == True,
    ).scalar() or 0

    unassigned_calls = db.query(func.count(SalesLead.id)).filter(
        SalesLead.phone.isnot(None), SalesLead.phone != "",
        SalesLead.is_contacted != True,
        SalesLead.assigned_to.is_(None),
    ).scalar() or 0

    return {
        "unsent_agency_emails": unsent_agencies,
        "unsent_investor_emails": unsent_investors,
        "uncalled_leads": uncalled,
        "callbacks_pending": callbacks,
        "unassigned_calls": unassigned_calls,
    }


def _tool_send_single_email(db: Session, user: User, name: str, entity_type: str) -> dict:
    from app.routers.outreach import _build_agency_html, _build_investor_text
    from app.services.email_service import email_service

    now = datetime.now(timezone.utc)

    if entity_type == "agency":
        lead = db.query(SalesLead).filter(SalesLead.provider_name.ilike(f"%{name}%")).first()
        if not lead:
            return {"error": f"No agency found matching '{name}'"}
        if not lead.contact_email:
            return {"error": f"{lead.provider_name} has no contact email"}

        subj, body_html = _build_agency_html(lead.provider_name, lead.city or "your area", lead.state or "US")
        result = email_service.send_email(
            to=lead.contact_email, subject=subj, html=body_html,
            reply_to="sales@palmtai.com", sender="Muse Ibrahim <sales@send.palmtai.com>",
        )
        if result.get("success"):
            lead.last_email_sent_at = now
            lead.email_send_count = (lead.email_send_count or 0) + 1
            lead.status = "email_sent"
            lead.updated_at = now
            activity = list(lead.activity_log or [])
            activity.append({"action": "email_sent", "timestamp": now.isoformat(), "subject": subj, "by": user.email})
            lead.activity_log = activity
            db.commit()
            return {"ok": True, "sent_to": lead.contact_email, "name": lead.provider_name, "subject": subj}
        return {"error": f"Failed to send: {result.get('error', 'unknown')}"}

    elif entity_type == "investor":
        inv = db.query(Investor).filter(Investor.fund_name.ilike(f"%{name}%")).first()
        if not inv:
            return {"error": f"No investor found matching '{name}'"}
        if not inv.contact_email:
            return {"error": f"{inv.fund_name} has no contact email"}

        focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
        subj, body_text = _build_investor_text(inv.fund_name, inv.contact_name or "", focus)
        html = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{body_text}</pre>"
        result = email_service.send_email(
            to=inv.contact_email, subject=subj, html=html, text=body_text,
            reply_to="invest@palmtai.com", sender="Muse Ibrahim <invest@send.palmtai.com>",
        )
        if result.get("success"):
            inv.last_email_sent_at = now
            inv.email_send_count = (inv.email_send_count or 0) + 1
            inv.status = "email_sent"
            inv.updated_at = now
            activity = list(inv.activity_log or [])
            activity.append({"action": "email_sent", "timestamp": now.isoformat(), "subject": subj, "by": user.email})
            inv.activity_log = activity
            db.commit()
            return {"ok": True, "sent_to": inv.contact_email, "name": inv.fund_name, "subject": subj}
        return {"error": f"Failed to send: {result.get('error', 'unknown')}"}

    return {"error": f"Unknown type: {entity_type}"}


def _execute_tool(tool_name: str, tool_input: dict, db: Session, user: User) -> str:
    """Route tool calls to implementations and return JSON string."""
    try:
        if tool_name == "get_outreach_stats":
            result = _tool_get_outreach_stats(db)
        elif tool_name == "get_weekly_summary":
            result = _tool_get_weekly_summary(db, tool_input.get("week_offset", 0))
        elif tool_name == "batch_send_emails":
            result = _tool_batch_send_emails(db, user, tool_input["types"])
        elif tool_name == "mark_call_done":
            result = _tool_mark_call_done(db, user, tool_input["lead_name"], tool_input.get("notes", ""), tool_input.get("callback", False))
        elif tool_name == "search_leads":
            result = _tool_search_leads(db, tool_input.get("query", ""), tool_input.get("state", ""), tool_input.get("status", ""), tool_input.get("limit", 10))
        elif tool_name == "search_investors":
            result = _tool_search_investors(db, tool_input.get("query", ""), tool_input.get("has_email", False), tool_input.get("limit", 10))
        elif tool_name == "get_callbacks":
            result = _tool_get_callbacks(db)
        elif tool_name == "add_lead_notes":
            result = _tool_add_lead_notes(db, user, tool_input["lead_name"], tool_input["notes"])
        elif tool_name == "assign_leads_to_team":
            result = _tool_assign_leads(db, user, tool_input["team_member_email"], tool_input["assign_type"], tool_input.get("count", 20), tool_input.get("states"))
        elif tool_name == "get_pending_work":
            result = _tool_get_pending_work(db)
        elif tool_name == "send_single_email":
            result = _tool_send_single_email(db, user, tool_input["name"], tool_input["type"])
        else:
            result = {"error": f"Unknown tool: {tool_name}"}
    except Exception as e:
        logger.error(f"Tool execution error [{tool_name}]: {e}")
        result = {"error": str(e)}

    return json.dumps(result, default=str)


# ── API Models ────────────────────────────────────────────────────────

class AgentMessage(BaseModel):
    role: str
    content: str


class AgentChatRequest(BaseModel):
    message: str
    history: List[AgentMessage] = []


class AgentChatResponse(BaseModel):
    response: str
    tool_calls: List[dict] = []


# ── Main Chat Endpoint ───────────────────────────────────────────────

@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    body: AgentChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Chat with the PalmCare AI agent. Supports natural language commands
    for outreach automation: send emails, track calls, manage team, etc."""
    import anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI agent is not configured")

    client = anthropic.Anthropic(api_key=api_key)
    today = _today_eastern()

    system = SYSTEM_PROMPT.format(today=today.strftime("%A, %B %d, %Y"))

    messages = []
    for msg in body.history[-20:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.message})

    tool_calls_log = []
    max_iterations = 5

    for _ in range(max_iterations):
        response = client.messages.create(
            model=AGENT_MODEL,
            max_tokens=4096,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            assistant_content = []

            for block in response.content:
                if block.type == "text":
                    assistant_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    assistant_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
                    logger.info(f"Agent tool call: {block.name}({json.dumps(block.input, default=str)[:200]})")

                    result_str = _execute_tool(block.name, block.input, db, user)
                    tool_calls_log.append({"tool": block.name, "input": block.input, "result": json.loads(result_str)})

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_str,
                    })

            messages.append({"role": "assistant", "content": assistant_content})
            messages.append({"role": "user", "content": tool_results})
            continue

        text_parts = [block.text for block in response.content if block.type == "text"]
        final_response = "\n".join(text_parts)
        return AgentChatResponse(response=final_response, tool_calls=tool_calls_log)

    text_parts = [block.text for block in response.content if block.type == "text"]
    return AgentChatResponse(
        response="\n".join(text_parts) or "I've completed the requested operations.",
        tool_calls=tool_calls_log,
    )
