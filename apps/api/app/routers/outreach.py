"""
Outreach Router — CEO-ONLY

Daily outreach plan, draft generation, and send tracking
for agency sales leads and investor fundraising.
Only accessible to platform admin accounts (@palmtai.com).
"""

import logging
import uuid as _uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory draft store (keyed by draft_id)
_drafts: Dict[str, dict] = {}

EXCLUDED_LEAD_STATUSES = ("converted", "not_interested")
EXCLUDED_CALL_STATUSES = ("converted", "not_interested", "no_response")
EXCLUDED_INVESTOR_STATUSES = ("passed", "not_relevant", "committed")

PRIORITY_ORDER = case(
    (SalesLead.priority == "high", 1),
    (SalesLead.priority == "medium", 2),
    else_=3,
)
INVESTOR_PRIORITY_ORDER = case(
    (Investor.priority == "high", 1),
    (Investor.priority == "medium", 2),
    else_=3,
)


# ─── Auth ───

def require_ceo(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if not current_user.email.endswith("@palmtai.com"):
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


# ─── Schemas ───

class AgencyEmailItem(BaseModel):
    id: UUID
    provider_name: str
    state: Optional[str]
    city: Optional[str]
    contact_email: Optional[str]
    contact_name: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]


class AgencyCallItem(BaseModel):
    id: UUID
    provider_name: str
    state: Optional[str]
    city: Optional[str]
    phone: Optional[str]
    status: str
    priority: str
    is_contacted: bool
    notes: Optional[str]


class InvestorEmailItem(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    location: Optional[str]
    focus_stages: list
    check_size_display: Optional[str]
    status: str
    priority: str
    email_send_count: int
    last_email_sent_at: Optional[datetime]
    relevance_reason: Optional[str]


class OutreachStats(BaseModel):
    total_leads: int
    leads_with_email: int
    leads_contacted: int
    leads_remaining_email: int
    leads_no_email: int
    calls_remaining: int
    total_investors: int
    investors_with_email: int
    investors_contacted: int
    investors_remaining: int


class WeekDayProgress(BaseModel):
    day: str
    emails_sent: int
    calls_made: int
    investor_emails_sent: int


class DailyPlanResponse(BaseModel):
    agency_emails: List[AgencyEmailItem]
    agency_calls: List[AgencyCallItem]
    investor_emails: List[InvestorEmailItem]
    stats: OutreachStats
    week_progress: List[WeekDayProgress]


class MarkCalledBody(BaseModel):
    notes: Optional[str] = None


class GenerateDraftBody(BaseModel):
    target_type: str  # "agency" | "investor"
    target_id: UUID


class DraftResponse(BaseModel):
    draft_id: str
    target_type: str
    target_id: str
    target_name: str
    to_email: str
    subject: str
    body: str
    is_html: bool


class ApproveDraftBody(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None


class WeeklySummaryResponse(BaseModel):
    emails_sent: int
    calls_made: int
    investor_emails_sent: int
    conversions: int
    week_start: str
    week_end: str


# ─── Helpers ───

def _today_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _week_bounds() -> tuple[datetime, datetime]:
    """Return (Monday 00:00, Sunday 23:59:59) of the current week in UTC."""
    now = datetime.now(timezone.utc)
    monday = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday, sunday


def _build_agency_html(provider_name: str, city: str, state: str) -> tuple[str, str]:
    """Generate a branded HTML email for an agency lead."""
    subject = f"Reduce Paperwork by 80% — PalmCare AI for {provider_name}"
    body = f"""\
<html>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f7f7f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
  <tr>
    <td style="background:#0d9488;padding:28px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">PalmCare AI</h1>
      <p style="color:#ccfbf1;margin:6px 0 0;font-size:13px;">Where care meets intelligence</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;">
      <p style="font-size:15px;color:#1a1a1a;line-height:1.6;">
        Hi {provider_name} team,
      </p>
      <p style="font-size:15px;color:#333;line-height:1.6;">
        I'm Muse Ibrahim, CEO of <strong>PalmCare AI</strong>. We help home care agencies
        in <strong>{city}, {state}</strong> eliminate paperwork and get paid faster using
        voice-powered AI.
      </p>
      <ul style="font-size:14px;color:#333;line-height:1.8;">
        <li>Voice-to-contract in under 60 seconds</li>
        <li>Auto-generated OASIS-compliant documentation</li>
        <li>Real-time billing capture — average $0.37/assessment</li>
        <li>50-state regulatory knowledge built in</li>
      </ul>
      <p style="font-size:15px;color:#333;line-height:1.6;">
        We're already serving agencies across {state} and would love to show you a
        quick 15-minute demo.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="background:#0d9488;border-radius:6px;padding:12px 28px;">
            <a href="https://palmcareai.com/#demo" style="color:#fff;text-decoration:none;font-weight:bold;font-size:15px;">
              Book a Free Demo
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size:14px;color:#666;line-height:1.5;">
        Best regards,<br/>
        <strong>Muse Ibrahim</strong><br/>
        President &amp; CEO, Palm Technologies<br/>
        <a href="mailto:sales@palmtai.com" style="color:#0d9488;">sales@palmtai.com</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f0fdfa;padding:16px 32px;text-align:center;font-size:12px;color:#999;">
      Palm Technologies, INC. &middot; palmcareai.com
    </td>
  </tr>
</table>
</body>
</html>"""
    return subject, body


def _build_investor_text(fund_name: str, contact_name: str, focus_areas: str) -> tuple[str, str]:
    """Generate a plain-text investor pitch email."""
    greeting = f"Dear {contact_name}" if contact_name else f"Dear {fund_name} Team"
    subject = f"PalmCare AI — Voice-Powered AI for Home Healthcare ($92K ARR, Pre-Seed)"
    body = f"""{greeting},

I'm Muse Ibrahim, CEO of PalmCare AI (Palm Technologies, INC.). Given your focus on {focus_areas}, I wanted to reach out directly.

PalmCare AI converts voice into compliant home-care contracts in under 60 seconds using Deepgram Nova-3 and Claude. We're live with paying customers at $92K ARR and a cost of $0.37 per assessment.

Key metrics:
- $92K ARR, growing month-over-month
- 163+ agency leads across 48 states
- $450K SAFE round at $2.25M post-money valuation
- 50-state regulatory knowledge base built in

We're raising a pre-seed round to scale sales and expand our AI pipeline. I'd welcome a 15-minute call to share more.

Best regards,
Muse Ibrahim
President & CEO, Palm Technologies, INC.
sales@palmtai.com | palmcareai.com"""
    return subject, body


# ─── Routes ───

@router.get("/daily-plan", response_model=DailyPlanResponse)
def get_daily_plan(
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    today = _today_start()
    week_start, week_end = _week_bounds()

    # --- Agency emails: has email, not emailed today ---
    agency_email_q = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None),
            SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .filter(
            (SalesLead.last_email_sent_at.is_(None)) | (SalesLead.last_email_sent_at < today)
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .limit(50)
        .all()
    )
    agency_emails = [
        AgencyEmailItem(
            id=l.id, provider_name=l.provider_name, state=l.state, city=l.city,
            contact_email=l.contact_email, contact_name=l.contact_name,
            phone=l.phone, status=l.status, priority=l.priority,
            email_send_count=l.email_send_count or 0,
            last_email_sent_at=l.last_email_sent_at,
        )
        for l in agency_email_q
    ]

    # --- Agency calls: no email, has phone ---
    agency_call_q = (
        db.query(SalesLead)
        .filter(
            (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
            SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
        )
        .order_by(PRIORITY_ORDER)
        .limit(10)
        .all()
    )
    agency_calls = [
        AgencyCallItem(
            id=l.id, provider_name=l.provider_name, state=l.state, city=l.city,
            phone=l.phone, status=l.status, priority=l.priority,
            is_contacted=l.is_contacted or False, notes=l.notes,
        )
        for l in agency_call_q
    ]

    # --- Investor emails ---
    investor_q = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None),
            Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .limit(10)
        .all()
    )
    investor_emails = [
        InvestorEmailItem(
            id=i.id, fund_name=i.fund_name, investor_type=i.investor_type,
            contact_name=i.contact_name, contact_email=i.contact_email,
            location=i.location, focus_stages=i.focus_stages or [],
            check_size_display=i.check_size_display, status=i.status,
            priority=i.priority, email_send_count=i.email_send_count or 0,
            last_email_sent_at=i.last_email_sent_at,
            relevance_reason=i.relevance_reason,
        )
        for i in investor_q
    ]

    # --- Stats ---
    total_leads = db.query(func.count(SalesLead.id)).scalar() or 0
    leads_with_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
    ).scalar() or 0
    leads_contacted = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,  # noqa: E712
    ).scalar() or 0
    leads_remaining_email = db.query(func.count(SalesLead.id)).filter(
        SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        (SalesLead.last_email_sent_at.is_(None)) | (SalesLead.last_email_sent_at < today),
    ).scalar() or 0
    leads_no_email = db.query(func.count(SalesLead.id)).filter(
        (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
    ).scalar() or 0
    calls_remaining = db.query(func.count(SalesLead.id)).filter(
        (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
        SalesLead.phone.isnot(None), SalesLead.phone != "",
        SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
    ).scalar() or 0
    total_investors = db.query(func.count(Investor.id)).scalar() or 0
    investors_with_email = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
    ).scalar() or 0
    investors_contacted = db.query(func.count(Investor.id)).filter(
        Investor.email_send_count > 0,
    ).scalar() or 0
    investors_remaining = db.query(func.count(Investor.id)).filter(
        Investor.contact_email.isnot(None), Investor.contact_email != "",
        Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
    ).scalar() or 0

    stats = OutreachStats(
        total_leads=total_leads, leads_with_email=leads_with_email,
        leads_contacted=leads_contacted, leads_remaining_email=leads_remaining_email,
        leads_no_email=leads_no_email, calls_remaining=calls_remaining,
        total_investors=total_investors, investors_with_email=investors_with_email,
        investors_contacted=investors_contacted, investors_remaining=investors_remaining,
    )

    # --- Week progress (Mon–Fri) ---
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    week_progress: List[WeekDayProgress] = []
    for i, day_name in enumerate(day_names):
        day_start = week_start + timedelta(days=i)
        day_end = day_start + timedelta(hours=23, minutes=59, seconds=59)

        emails_sent = db.query(func.count(SalesLead.id)).filter(
            SalesLead.last_email_sent_at >= day_start,
            SalesLead.last_email_sent_at <= day_end,
        ).scalar() or 0

        calls_made = db.query(func.count(SalesLead.id)).filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.updated_at >= day_start,
            SalesLead.updated_at <= day_end,
        ).scalar() or 0

        inv_emails_sent = db.query(func.count(Investor.id)).filter(
            Investor.last_email_sent_at >= day_start,
            Investor.last_email_sent_at <= day_end,
        ).scalar() or 0

        week_progress.append(WeekDayProgress(
            day=day_name, emails_sent=emails_sent,
            calls_made=calls_made, investor_emails_sent=inv_emails_sent,
        ))

    return DailyPlanResponse(
        agency_emails=agency_emails,
        agency_calls=agency_calls,
        investor_emails=investor_emails,
        stats=stats,
        week_progress=week_progress,
    )


@router.post("/mark-called/{lead_id}")
def mark_called(
    lead_id: UUID,
    body: MarkCalledBody = MarkCalledBody(),
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.is_contacted = True
    lead.status = "contacted"
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


@router.post("/generate-draft", response_model=DraftResponse)
def generate_draft(
    body: GenerateDraftBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    draft_id = str(_uuid.uuid4())[:8]

    if body.target_type == "agency":
        lead = db.query(SalesLead).filter(SalesLead.id == body.target_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        if not lead.contact_email:
            raise HTTPException(status_code=400, detail="Lead has no email address")

        subject, html_body = _build_agency_html(
            lead.provider_name,
            lead.city or "your area",
            lead.state or "US",
        )
        draft = {
            "draft_id": draft_id,
            "target_type": "agency",
            "target_id": str(lead.id),
            "target_name": lead.provider_name,
            "to_email": lead.contact_email,
            "subject": subject,
            "body": html_body,
            "is_html": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.email,
        }

    elif body.target_type == "investor":
        inv = db.query(Investor).filter(Investor.id == body.target_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Investor not found")
        if not inv.contact_email:
            raise HTTPException(status_code=400, detail="Investor has no email address")

        focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
        subject, text_body = _build_investor_text(
            inv.fund_name,
            inv.contact_name or "",
            focus,
        )
        draft = {
            "draft_id": draft_id,
            "target_type": "investor",
            "target_id": str(inv.id),
            "target_name": inv.fund_name,
            "to_email": inv.contact_email,
            "subject": subject,
            "body": text_body,
            "is_html": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user.email,
        }

    else:
        raise HTTPException(status_code=400, detail="target_type must be 'agency' or 'investor'")

    _drafts[draft_id] = draft
    return DraftResponse(**{k: draft[k] for k in DraftResponse.__fields__})


@router.get("/drafts")
def list_drafts(user: User = Depends(require_ceo)):
    return list(_drafts.values())


@router.post("/approve-draft/{draft_id}")
def approve_draft(
    draft_id: str,
    body: ApproveDraftBody = ApproveDraftBody(),
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    draft = _drafts.get(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    subject = body.subject or draft["subject"]
    email_body = body.body or draft["body"]
    to_email = draft["to_email"]
    is_html = draft["is_html"]
    target_type = draft["target_type"]
    target_id = draft["target_id"]

    if is_html:
        result = email_service.send_email(
            to=to_email,
            subject=subject,
            html=email_body,
            reply_to="sales@palmtai.com",
        )
    else:
        html_plain = f"<pre style='font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;'>{email_body}</pre>"
        result = email_service.send_email(
            to=to_email,
            subject=subject,
            html=html_plain,
            text=email_body,
            reply_to="sales@palmtai.com",
        )

    now = datetime.now(timezone.utc)

    if target_type == "agency":
        lead = db.query(SalesLead).filter(SalesLead.id == target_id).first()
        if lead:
            lead.last_email_sent_at = now
            lead.last_email_subject = subject
            lead.email_send_count = (lead.email_send_count or 0) + 1
            lead.status = "email_sent"
            lead.updated_at = now
            activity = list(lead.activity_log or [])
            activity.append({
                "action": "email_sent",
                "timestamp": now.isoformat(),
                "subject": subject,
                "by": user.email,
            })
            lead.activity_log = activity
    elif target_type == "investor":
        inv = db.query(Investor).filter(Investor.id == target_id).first()
        if inv:
            inv.last_email_sent_at = now
            inv.last_email_subject = subject
            inv.email_send_count = (inv.email_send_count or 0) + 1
            inv.status = "email_sent"
            inv.updated_at = now
            activity = list(inv.activity_log or [])
            activity.append({
                "action": "email_sent",
                "timestamp": now.isoformat(),
                "subject": subject,
                "by": user.email,
            })
            inv.activity_log = activity

    db.commit()
    del _drafts[draft_id]

    return {
        "ok": True,
        "draft_id": draft_id,
        "to": to_email,
        "subject": subject,
        "send_result": result,
    }


@router.delete("/drafts/{draft_id}")
def delete_draft(draft_id: str, user: User = Depends(require_ceo)):
    if draft_id not in _drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    del _drafts[draft_id]
    return {"ok": True, "draft_id": draft_id}


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def get_weekly_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    week_start, week_end = _week_bounds()

    emails_sent = db.query(func.count(SalesLead.id)).filter(
        SalesLead.last_email_sent_at >= week_start,
        SalesLead.last_email_sent_at <= week_end,
    ).scalar() or 0

    calls_made = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,  # noqa: E712
        SalesLead.updated_at >= week_start,
        SalesLead.updated_at <= week_end,
    ).scalar() or 0

    investor_emails_sent = db.query(func.count(Investor.id)).filter(
        Investor.last_email_sent_at >= week_start,
        Investor.last_email_sent_at <= week_end,
    ).scalar() or 0

    conversions = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_converted == True,  # noqa: E712
        SalesLead.converted_at >= week_start,
        SalesLead.converted_at <= week_end,
    ).scalar() or 0

    return WeeklySummaryResponse(
        emails_sent=emails_sent,
        calls_made=calls_made,
        investor_emails_sent=investor_emails_sent,
        conversions=conversions,
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=week_end.strftime("%Y-%m-%d"),
    )
