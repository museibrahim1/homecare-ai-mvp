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


class AgencyDraftItem(BaseModel):
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
    draft_subject: str
    draft_body: str
    is_html: bool


class InvestorDraftItem(BaseModel):
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
    draft_subject: str
    draft_body: str
    is_html: bool


class WeeklyDayPlan(BaseModel):
    date: str
    day_name: str
    is_today: bool
    agency_drafts: List[AgencyDraftItem]
    investor_drafts: List[InvestorDraftItem]
    calls: List[AgencyCallItem]


class WeeklyPlanResponse(BaseModel):
    days: List[WeeklyDayPlan]
    stats: OutreachStats
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


AGENCY_SUBJECT_HOOKS = [
    "Quick question about your documentation process",
    "Are your caregivers still filling out paper forms?",
    "What if assessments took 60 seconds instead of 60 minutes?",
    "The documentation tool agencies in {state} are switching to",
    "Your staff shouldn't be doing this manually",
    "How much time does your team spend on paperwork?",
    "This is changing how agencies handle assessments",
    "Saw you're in {state} — thought this might help",
    "30 seconds to see why agencies are ditching paper",
    "A question for the team at your agency",
]

SITE_URL = "https://palmcareai.com"


def _build_agency_html(provider_name: str, city: str, state: str) -> tuple[str, str]:
    """Generate a clean, personal-looking email for an agency lead with app screenshots."""
    import hashlib
    idx = int(hashlib.md5(provider_name.encode()).hexdigest(), 16) % len(AGENCY_SUBJECT_HOOKS)
    subject = AGENCY_SUBJECT_HOOKS[idx].format(state=state or "your state")

    body = f"""\
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;">
<div style="max-width:580px;margin:0 auto;padding:20px;">

<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">I'm Muse — I built PalmCare AI specifically for home care agencies like yours in {city or "your area"}, {state}.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">The short version: launch our app, hit the <strong>Palm It</strong> button to start an assessment while with a client, and our AI automatically generates the care plan, contract, billables, and compliance docs. The whole process takes about 60 seconds.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Agencies using PalmCare are saving 15+ hours a week on documentation. It handles all 50 states' regulations, supports Medicaid, Medicare, and private pay, and the AI cost per assessment is under $0.40.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px;">I'd love to show you a quick demo — 15 minutes, no commitment. You can book one directly on our site:</p>

<p style="margin:0 0 24px;">
<a href="{SITE_URL}/#book-demo" style="display:inline-block;background:#0d9488;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Book a Demo</a>
</p>

<a href="{SITE_URL}/#book-demo" style="text-decoration:none;">
<img src="{SITE_URL}/screenshots/email/app_interface.png" width="580" style="width:100%;max-width:580px;border-radius:12px;border:1px solid #e5e5e5;margin:0 0 24px;" alt="PalmCare AI — Designed for Care Professionals" />
</a>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Visit our website @ <a href="{SITE_URL}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a></p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;">Warm regards,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.5;margin:0 0 4px;"><strong>Muse Ibrahim</strong></p>
<p style="font-size:13px;color:#888;line-height:1.5;margin:0;">Founder &amp; CEO, Palm Technologies Inc.<br/>
<a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a></p>

</div>
</body>
</html>"""
    return subject, body


PITCH_DECK_URL = f"{SITE_URL}/PalmCare_Full_v4.pdf"


def _build_investor_text(fund_name: str, contact_name: str, focus_areas: str) -> tuple[str, str]:
    """Generate the investor pitch email using the founder's voice."""
    greeting = f"Hi {contact_name}" if contact_name else f"Hi {fund_name} Team"
    subject = "Pre-Seed: Defining the Future of Home Care Operations"
    body = f"""{greeting},

I hope you're well. I'm reaching out to share what we're building at Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates the patient assessment, care planning, and contracting workflow for home care agencies.

One of the strongest signals that this market is ready for disruption is how little has changed. Home care is a $343B industry processing millions of Medicaid and private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, and legacy software built two decades ago. The incumbents — WellSky, AxisCare, and CareTime — proved that agencies will pay for software. What they never delivered was intelligence. Not one of them has touched AI in a meaningful way, meaning agencies are still leaving deals on the table and losing trust through slow, error-prone processes.

What the incumbents validated was the willingness to pay. What agencies are urgently asking for now is a platform that actually thinks — one that eliminates the documentation burden consuming 40-60% of their staff's time and replaces it with automation. That is the gap PalmCare AI is filling.

We are raising a $450K seed round via SAFE or convertible note at a $1.8M pre-money valuation. This capital will fund our first AI engineering hire, go-to-market execution, and compliance infrastructure as we scale to 700 agencies by the end of 2027.

Why this market and why now:
- LLMs and voice AI are now production-ready at the cost structures vertical SaaS requires; this window just opened
- 10,000 Americans turn 65 every day through 2030, accelerating home-based care demand
- Medicaid and Medicare Advantage are actively shifting reimbursement toward home care over institutional settings
- No competitor has an AI roadmap; this is a greenfield opportunity inside a mature, paying market

PalmCare AI Highlights:
- Full platform built and live today — AI assessment pipeline, voice documentation engine, CRM
- $399/mo blended ARPU across mobile and full platform tiers
- 82% gross margin driven by low AI pipeline cost
- Structural retention: agencies run daily operations through the platform, switching cost is high by design
- Founder with a rare combination: software engineer, B2B sales professional, and former home care experience
- Clean cap table — 100% bootstrapped, no prior dilution

I've attached our deck below. I'd welcome the chance to walk you through what we're building and get your feedback.

Deck: {PITCH_DECK_URL}

Visit our website @ palmcareai.com

Warm regards,
Muse Ibrahim
Founder & CEO, Palm Technologies Inc.
213-569-7693 | invest@palmtai.com"""
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


@router.get("/weekly-plan", response_model=WeeklyPlanResponse)
def get_weekly_plan(
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    """Return the full Mon–Fri weekly plan with pre-generated email drafts."""
    today = datetime.now(timezone.utc).date()
    week_start, week_end = _week_bounds()

    agency_q = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None),
            SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .limit(250)
        .all()
    )

    investor_q = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None),
            Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .limit(50)
        .all()
    )

    call_q = (
        db.query(SalesLead)
        .filter(
            (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
            SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
        )
        .order_by(PRIORITY_ORDER)
        .limit(50)
        .all()
    )

    days: List[WeeklyDayPlan] = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
    monday = (week_start).date()

    for i, day_name in enumerate(day_names):
        day_date = monday + timedelta(days=i)

        a_start = i * 50
        a_end = a_start + 50
        day_agencies = agency_q[a_start:a_end]

        inv_start = i * 10
        inv_end = inv_start + 10
        day_investors = investor_q[inv_start:inv_end]

        c_start = i * 10
        c_end = c_start + 10
        day_calls = call_q[c_start:c_end]

        agency_drafts = []
        for lead in day_agencies:
            subj, body = _build_agency_html(
                lead.provider_name,
                lead.city or "your area",
                lead.state or "US",
            )
            agency_drafts.append(AgencyDraftItem(
                id=lead.id, provider_name=lead.provider_name,
                state=lead.state, city=lead.city,
                contact_email=lead.contact_email, contact_name=lead.contact_name,
                phone=lead.phone, status=lead.status, priority=lead.priority,
                email_send_count=lead.email_send_count or 0,
                last_email_sent_at=lead.last_email_sent_at,
                draft_subject=subj, draft_body=body, is_html=True,
            ))

        investor_drafts = []
        for inv in day_investors:
            focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
            subj, body = _build_investor_text(
                inv.fund_name,
                inv.contact_name or "",
                focus,
            )
            investor_drafts.append(InvestorDraftItem(
                id=inv.id, fund_name=inv.fund_name,
                investor_type=inv.investor_type,
                contact_name=inv.contact_name, contact_email=inv.contact_email,
                location=inv.location, focus_stages=inv.focus_stages or [],
                check_size_display=inv.check_size_display,
                status=inv.status, priority=inv.priority,
                email_send_count=inv.email_send_count or 0,
                last_email_sent_at=inv.last_email_sent_at,
                draft_subject=subj, draft_body=body, is_html=False,
            ))

        calls = [
            AgencyCallItem(
                id=l.id, provider_name=l.provider_name, state=l.state,
                city=l.city, phone=l.phone, status=l.status,
                priority=l.priority, is_contacted=l.is_contacted or False,
                notes=l.notes,
            )
            for l in day_calls
        ]

        days.append(WeeklyDayPlan(
            date=day_date.isoformat(),
            day_name=day_name,
            is_today=(day_date == today),
            agency_drafts=agency_drafts,
            investor_drafts=investor_drafts,
            calls=calls,
        ))

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

    return WeeklyPlanResponse(
        days=days,
        stats=stats,
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=week_end.strftime("%Y-%m-%d"),
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
            sender="Muse Ibrahim <sales@send.palmtai.com>",
        )
    else:
        html_plain = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{email_body}</pre>"
        attachments = None
        if target_type == "investor":
            attachments = [{"filename": "PalmCare_AI_Pitch_Deck.pdf", "path": PITCH_DECK_URL}]
        result = email_service.send_email(
            to=to_email,
            subject=subject,
            html=html_plain,
            text=email_body,
            reply_to="invest@palmtai.com" if target_type == "investor" else "sales@palmtai.com",
            attachments=attachments,
            sender="Muse Ibrahim <invest@send.palmtai.com>" if target_type == "investor" else "Muse Ibrahim <sales@send.palmtai.com>",
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
