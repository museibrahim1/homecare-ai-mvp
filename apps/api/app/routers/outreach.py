"""
Outreach Router — CEO-ONLY

Daily outreach plan, draft generation, and send tracking
for agency sales leads and investor fundraising.
Only accessible to platform admin accounts (@palmtai.com).
"""

import logging
import os
import uuid as _uuid
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
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
    week_offset: int
    total_weeks: int
    all_contacts_covered: bool


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
    "Saw you're in {state}, thought this might help",
    "30 seconds to see why agencies are ditching paper",
    "Three steps to zero paperwork",
]

SITE_URL = "https://palmcareai.com"
IMG = f"{SITE_URL}/screenshots"

_S = "border-radius:8px;border:1px solid #e5e7eb;"

AGENCY_TEMPLATES = [
    # Template 0: Three Steps pitch (mirrors landing page "How It Works")
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">I'm Muse, I built PalmCare AI specifically for home care agencies like yours in {city or "your area"}, {state}.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Here's how it works, three steps, zero paperwork:</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">1. Open the app</strong>, your caregiver launches PalmCare and hits the <strong>Palm It</strong> button to start an assessment while with a client.</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">2. AI transcribes everything</strong>, the conversation is transcribed in real time. Speakers are identified. Every care need and billable item is extracted automatically.</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">3. Contract is ready</strong>, a complete assessment, care plan, and service agreement is generated, ready to review, send, and sign.</td></tr>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/recording_screen.png" width="280" style="width:100%;{_S}" alt="Voice Assessment" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/contract_view.png" width="280" style="width:100%;{_S}" alt="AI-Generated Contract" /></a></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Record an assessment → AI generates the contract</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">It handles Medicaid, Medicare, and private pay across all 50 states, and agencies are saving 15+ hours a week on documentation.</p>""",

    # Template 1: Problem/Solution pitch (mirrors landing page features)
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">I'm Muse, founder of PalmCare AI. I'm reaching out because I know agencies in {city or "your area"}, {state} are dealing with the same problem we built our platform to solve.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">40 to 60% of your staff's time is going to documentation, billing, and manual paperwork. Assessment to onboarding is slow, manual, and inconsistent. Your team is probably using 3 to 5 disconnected tools with no integration between them.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">PalmCare AI replaces all of that with one platform. Launch the app, hit <strong>Palm It</strong>, and AI handles the rest, voice transcription, speaker identification, care plan generation, contract creation, and billing extraction. All in about 60 seconds.</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding-bottom:6px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_dashboard.png" width="580" style="width:100%;{_S}" alt="Agency Operations Dashboard" /></a></td></tr>
<tr><td style="font-size:11px;color:#999;text-align:center;padding-bottom:8px;">Real-time agency dashboard, clients, assessments, revenue at a glance</td></tr>
<tr>
<td><table cellpadding="0" cellspacing="0" width="100%"><tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_clients.png" width="280" style="width:100%;{_S}" alt="Client CRM" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_pipeline.png" width="280" style="width:100%;{_S}" alt="Deals Pipeline" /></a></td>
</tr></table></td>
</tr>
<tr><td style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Client CRM &amp; visual pipeline, track every client from first contact through active care</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Everything you need to run your agency, built for care professionals, not retrofitted from generic software.</p>""",

    # Template 2: Social proof pitch (mirrors testimonials section)
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">I'm Muse from PalmCare AI. Agencies across the country are switching from paper-based workflows to our AI-powered platform, and I thought your team in {city or "your area"}, {state} might want to see why.</p>

<p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 4px;padding:12px 16px;background:#f8fafb;border-left:3px solid #0d9488;border-radius:0 8px 8px 0;"><em>"PalmCare AI cut our contract generation time from hours to minutes. We went from 3 hours of paperwork per client to under 10 minutes."</em></p>
<p style="font-size:13px;color:#888;margin:0 0 16px;padding-left:16px;">Sarah Mitchell, Agency Owner, Sunrise Home Care TX</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Here's the short version: your caregiver opens our app, hits <strong>Palm It</strong> to start an assessment, and the AI automatically generates the care plan, contract, billables, and compliance docs. One tap, AI does the rest.</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_assessments.png" width="280" style="width:100%;{_S}" alt="Assessment Tracking" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_contract.png" width="280" style="width:100%;{_S}" alt="Contract Preview" /></a></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Assessment tracking &amp; AI-generated contracts, all in one platform</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">We support Medicaid, Medicare, and private pay across all 50 states. Agencies are seeing 95% less time on documentation and 80% fewer billing errors.</p>""",
]

AGENCY_FOOTER = f"""\
<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px;">I'd love to show you a quick demo, 15 minutes, no commitment:</p>

<p style="margin:0 0 24px;">
<a href="{SITE_URL}/#book-demo" style="display:inline-block;background:#0d9488;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Book a Demo</a>
</p>

<a href="{SITE_URL}/#book-demo" style="text-decoration:none;">
<img src="{IMG}/email/app_interface.png" width="580" style="width:100%;max-width:580px;border-radius:12px;border:1px solid #e5e5e5;margin:0 0 24px;" alt="PalmCare AI, Designed for Care Professionals" />
</a>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Visit our website @ <a href="{SITE_URL}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a></p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;">Warm regards,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.5;margin:0 0 4px;"><strong>Muse Ibrahim</strong></p>
<p style="font-size:13px;color:#888;line-height:1.5;margin:0;">Founder &amp; CEO, Palm Technologies Inc.<br/>
<a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a></p>"""


def _build_agency_html(provider_name: str, city: str, state: str) -> tuple[str, str]:
    """Generate a clean, personal email with rotating templates drawn from landing page messaging."""
    import hashlib
    h = int(hashlib.md5(provider_name.encode()).hexdigest(), 16)
    subj_idx = h % len(AGENCY_SUBJECT_HOOKS)
    tmpl_idx = h % len(AGENCY_TEMPLATES)
    subject = AGENCY_SUBJECT_HOOKS[subj_idx].format(state=state or "your state")

    body_content = AGENCY_TEMPLATES[tmpl_idx](city, state)

    body = f"""\
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;">
<div style="max-width:580px;margin:0 auto;padding:20px;">
{body_content}
{AGENCY_FOOTER}
</div>
</body>
</html>"""
    return subject, body


PITCH_DECK_URL = f"{SITE_URL}/PalmCare_Full_v4.pdf"


def _build_investor_text(fund_name: str, contact_name: str, focus_areas: str) -> tuple[str, str]:
    """Generate the investor pitch email using the founder's voice."""
    first_name = contact_name.split()[0] if contact_name and contact_name.strip() else ""
    greeting = f"Hi {first_name}" if first_name else f"Hi {fund_name} Team"
    subject = "Pre-Seed: Defining the Future of Home Care Operations"
    body = f"""{greeting},

I hope you're well. I'm reaching out to share what we're building at Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates the patient assessment, care planning, and contracting workflow for home care agencies.

One of the strongest signals that this market is ready for disruption is how little has changed. Home care is a $343B industry processing millions of Medicaid and private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, and legacy software built two decades ago. The incumbents (WellSky, AxisCare, and CareTime) proved that agencies will pay for software. What they never delivered was intelligence. Not one of them has touched AI in a meaningful way, meaning agencies are still leaving deals on the table and losing trust through slow, error-prone processes.

What the incumbents validated was the willingness to pay. What agencies are urgently asking for now is a platform that actually thinks, one that eliminates the documentation burden consuming 40-60% of their staff's time and replaces it with automation. That is the gap PalmCare AI is filling.

We are raising a $450K seed round via SAFE or convertible note at a $1.8M pre-money valuation. This capital will fund our first AI engineering hire, go-to-market execution, and compliance infrastructure as we scale to 700 agencies by the end of 2027.

Why this market and why now:
- LLMs and voice AI are now production-ready at the cost structures vertical SaaS requires; this window just opened
- 10,000 Americans turn 65 every day through 2030, accelerating home-based care demand
- Medicaid and Medicare Advantage are actively shifting reimbursement toward home care over institutional settings
- No competitor has an AI roadmap; this is a greenfield opportunity inside a mature, paying market

PalmCare AI Highlights:
- Full platform built and live today, AI assessment pipeline, voice documentation engine, CRM
- $399/mo blended ARPU across mobile and full platform tiers
- 82% gross margin with strong unit economics
- Structural retention: agencies run daily operations through the platform, switching cost is high by design
- Founder with a rare combination: software engineer, B2B sales professional, and former home care experience
- Clean cap table, 100% bootstrapped, no prior dilution

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
        SalesLead.is_contacted != True,  # noqa: E712
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


EMAILS_PER_DAY = 50
INVESTORS_PER_DAY = 10
CALLS_PER_DAY = 25
FULL_WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

# Week 0 (launched Mar 10 2026) starts on Tuesday since Monday was off.
# All subsequent weeks are normal Mon-Fri.
LAUNCH_DATE = date(2026, 3, 10)

# Timezone regions for call ordering: East Coast first (morning), West Coast last (afternoon)
EASTERN_STATES = {"CT", "DC", "DE", "FL", "GA", "MA", "MD", "ME", "NC", "NH", "NJ", "NY", "OH", "PA", "RI", "SC", "VA", "VT", "WV"}
CENTRAL_STATES = {"AL", "AR", "IA", "IL", "IN", "KS", "KY", "LA", "MI", "MN", "MO", "MS", "ND", "NE", "OK", "SD", "TN", "TX", "WI"}
MOUNTAIN_STATES = {"AZ", "CO", "ID", "MT", "NM", "UT", "WY"}
PACIFIC_STATES = {"AK", "CA", "HI", "NV", "OR", "WA"}

TZ_ORDER = case(
    (SalesLead.state.in_(EASTERN_STATES), 1),
    (SalesLead.state.in_(CENTRAL_STATES), 2),
    (SalesLead.state.in_(MOUNTAIN_STATES), 3),
    (SalesLead.state.in_(PACIFIC_STATES), 4),
    else_=2,
)


def _week_work_days(week_offset: int) -> list[tuple[str, date]]:
    """Return list of (day_name, date) for working days in the given week."""
    today = datetime.now(timezone.utc).date()
    days_since_monday = today.weekday()
    this_monday = today - timedelta(days=days_since_monday)
    target_monday = this_monday + timedelta(weeks=week_offset)

    if week_offset == 0 and target_monday <= LAUNCH_DATE:
        return [
            (FULL_WORK_DAYS[i], target_monday + timedelta(days=i))
            for i in range(5)
            if (target_monday + timedelta(days=i)) >= LAUNCH_DATE
        ]

    return [
        (FULL_WORK_DAYS[i], target_monday + timedelta(days=i))
        for i in range(5)
    ]


def _cumulative_days_before(week_offset: int) -> int:
    """Count total working days scheduled before this week."""
    total = 0
    for w in range(week_offset):
        total += len(_week_work_days(w))
    return total


@router.get("/weekly-plan", response_model=WeeklyPlanResponse)
def get_weekly_plan(
    week_offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    """Return weekly plan with pre-generated drafts. Flows Mon-Fri across weeks until everyone is reached."""
    today = datetime.now(timezone.utc).date()
    work_days = _week_work_days(week_offset)

    all_agencies = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None),
            SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .all()
    )

    all_investors = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None),
            Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .all()
    )

    # All contacted leads (shown on past days, regardless of email status)
    all_contacted = (
        db.query(SalesLead)
        .filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
        )
        .order_by(SalesLead.updated_at)
        .all()
    )

    # Uncalled leads pool for today + future (timezone-ordered)
    uncalled_pool = (
        db.query(SalesLead)
        .filter(
            (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
            SalesLead.is_contacted != True,  # noqa: E712
        )
        .order_by(PRIORITY_ORDER, TZ_ORDER, SalesLead.created_at)
        .all()
    )

    import math
    total_days_agencies = math.ceil(len(all_agencies) / EMAILS_PER_DAY) if all_agencies else 1
    total_days_investors = math.ceil(len(all_investors) / INVESTORS_PER_DAY) if all_investors else 1
    total_days_calls = math.ceil(len(uncalled_pool) / CALLS_PER_DAY) if uncalled_pool else 1
    total_days_needed = max(total_days_agencies, total_days_investors, total_days_calls, 1)

    days_accum = len(_week_work_days(0))
    total_weeks = 1
    while days_accum < total_days_needed:
        total_weeks += 1
        days_accum += 5

    global_day_offset = _cumulative_days_before(week_offset)

    days: List[WeeklyDayPlan] = []
    contacted_idx = 0
    uncalled_idx = 0
    for i, (day_name, day_date) in enumerate(work_days):
        global_idx = global_day_offset + i

        a_start = global_idx * EMAILS_PER_DAY
        day_agencies = all_agencies[a_start:a_start + EMAILS_PER_DAY]

        inv_start = global_idx * INVESTORS_PER_DAY
        day_investors = all_investors[inv_start:inv_start + INVESTORS_PER_DAY]

        if day_date < today:
            # Past day: show completed calls (batch of contacted leads)
            day_calls = all_contacted[contacted_idx:contacted_idx + CALLS_PER_DAY]
            contacted_idx += len(day_calls)
        elif day_date == today:
            # Today: any remaining contacted + fill with uncalled
            remaining_contacted = all_contacted[contacted_idx:]
            contacted_idx = len(all_contacted)
            fill = max(CALLS_PER_DAY - len(remaining_contacted), 0)
            day_calls = list(remaining_contacted) + uncalled_pool[uncalled_idx:uncalled_idx + fill]
            uncalled_idx += fill
        else:
            # Future: next batch from uncalled pool
            day_calls = uncalled_pool[uncalled_idx:uncalled_idx + CALLS_PER_DAY]
            uncalled_idx += CALLS_PER_DAY

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
        SalesLead.is_contacted != True,  # noqa: E712
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

    all_covered = (
        global_day_offset + len(work_days) >= total_days_needed
    )

    week_start_date = work_days[0][1] if work_days else today
    week_end_date = work_days[-1][1] if work_days else today

    return WeeklyPlanResponse(
        days=days,
        stats=stats,
        week_start=week_start_date.isoformat(),
        week_end=week_end_date.isoformat(),
        week_offset=week_offset,
        total_weeks=total_weeks,
        all_contacts_covered=all_covered,
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


class BulkMarkCalledItem(BaseModel):
    phone: str
    notes: Optional[str] = None
    follow_up: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None


@router.post("/cron/bulk-mark-called")
def cron_bulk_mark_called(
    request: Request,
    items: List[BulkMarkCalledItem],
    db: Session = Depends(get_db),
):
    """Bulk mark leads as called via internal key. Also updates contact info if provided."""
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    cron_secret = os.getenv("CRON_SECRET", "palmcare-cron-2026")
    provided_key = request.headers.get("X-Internal-Key", "") or request.query_params.get("key", "")
    if not ((expected_key and provided_key == expected_key) or (provided_key == cron_secret)):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

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

        lead.is_contacted = True
        lead.status = "contacted"
        lead.updated_at = now

        if item.contact_name:
            lead.contact_name = item.contact_name
        if item.contact_email:
            lead.contact_email = item.contact_email

        log_entry = {
            "action": "called",
            "timestamp": now.isoformat(),
            "notes": item.notes or "",
            "by": "system/bulk",
        }
        activity = list(lead.activity_log or [])
        activity.append(log_entry)
        lead.activity_log = activity

        if item.notes:
            existing = lead.notes or ""
            lead.notes = f"{existing}\n[{now.strftime('%Y-%m-%d %H:%M')}] Call: {item.notes}".strip()

        if item.follow_up:
            existing = lead.notes or ""
            lead.notes = f"{existing}\n[{now.strftime('%Y-%m-%d %H:%M')}] Follow-up: {item.follow_up}".strip()

        results.append({
            "phone": item.phone,
            "status": "marked",
            "provider_name": lead.provider_name,
            "lead_id": str(lead.id),
        })

    db.commit()
    marked = sum(1 for r in results if r["status"] == "marked")
    return {"marked": marked, "not_found": len(results) - marked, "results": results}


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


# ─── Daily Digest Email ───

CEO_EMAILS = ["museibrahim@palmtai.com"]


def _get_todays_plan_data(db: Session) -> dict:
    """Extract today's calls, emails, and investor emails from the weekly plan."""
    today = datetime.now(timezone.utc).date()
    work_days = _week_work_days(0)
    global_day_offset = _cumulative_days_before(0)

    today_idx = None
    for i, (day_name, day_date) in enumerate(work_days):
        if day_date == today:
            today_idx = i
            break

    if today_idx is None:
        return {"calls": [], "agencies": [], "investors": [], "day_name": today.strftime("%A"), "date": today.isoformat()}

    global_idx = global_day_offset + today_idx

    # Count contacted leads assigned to past days
    all_contacted = (
        db.query(SalesLead)
        .filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
        )
        .order_by(SalesLead.updated_at)
        .all()
    )
    past_days_count = sum(1 for _, d in work_days[:today_idx] if d < today)
    past_slots = past_days_count * CALLS_PER_DAY
    remaining_contacted = all_contacted[past_slots:]

    uncalled = (
        db.query(SalesLead)
        .filter(
            (SalesLead.contact_email.is_(None)) | (SalesLead.contact_email == ""),
            SalesLead.phone.isnot(None),
            SalesLead.phone != "",
            SalesLead.is_contacted != True,  # noqa: E712
        )
        .order_by(PRIORITY_ORDER, TZ_ORDER, SalesLead.created_at)
        .all()
    )
    fill = max(CALLS_PER_DAY - len(remaining_contacted), 0)
    day_calls = list(remaining_contacted) + uncalled[:fill]

    agencies = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None),
            SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .all()
    )
    day_agencies = agencies[global_idx * EMAILS_PER_DAY:(global_idx + 1) * EMAILS_PER_DAY]

    investors = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None),
            Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .all()
    )
    day_investors = investors[global_idx * INVESTORS_PER_DAY:(global_idx + 1) * INVESTORS_PER_DAY]

    return {
        "calls": day_calls,
        "agencies": day_agencies,
        "investors": day_investors,
        "day_name": work_days[today_idx][0],
        "date": today.isoformat(),
    }


def _build_daily_digest_html(data: dict) -> str:
    """Build a clean, professional daily digest email."""
    day_name = data["day_name"]
    date_str = data["date"]
    calls = data["calls"]
    agencies = data["agencies"]
    investors = data["investors"]

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(day_name, day_name)

    call_rows = ""
    for i, lead in enumerate(calls, 1):
        services = []
        if lead.offers_nursing:
            services.append("Nursing")
        if lead.offers_pt:
            services.append("PT")
        if lead.offers_ot:
            services.append("OT")
        if lead.offers_speech:
            services.append("Speech")
        if lead.offers_aide:
            services.append("Aide")
        if lead.offers_social:
            services.append("Social Work")
        svc_str = ", ".join(services) if services else "Home Care"

        ownership = lead.ownership_type or "N/A"
        years = f"{lead.years_in_operation:.0f} yrs" if lead.years_in_operation else "N/A"
        star = lead.star_rating or "N/A"
        city_state = f"{lead.city or '—'}, {lead.state or '—'}"
        priority_color = "#dc2626" if lead.priority == "high" else "#f59e0b" if lead.priority == "medium" else "#6b7280"
        priority_badge = f'<span style="background:{priority_color};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">{lead.priority.upper()}</span>'

        call_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 12px;font-size:14px;color:#64748b;font-weight:600;">{i}</td>
            <td style="padding:14px 12px;">
                <div style="font-size:14px;font-weight:600;color:#1e293b;">{lead.provider_name}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">{city_state}</div>
            </td>
            <td style="padding:14px 12px;">
                <a href="tel:{lead.phone}" style="font-size:14px;color:#0d9488;font-weight:600;text-decoration:none;">{lead.phone}</a>
            </td>
            <td style="padding:14px 12px;font-size:12px;color:#475569;">{svc_str}</td>
            <td style="padding:14px 12px;font-size:12px;color:#475569;">{ownership}<br/>{years} · ★ {star}</td>
            <td style="padding:14px 12px;text-align:center;">{priority_badge}</td>
        </tr>"""

    agency_email_rows = ""
    for i, lead in enumerate(agencies[:10], 1):
        city_state = f"{lead.city or '—'}, {lead.state or '—'}"
        agency_email_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;color:#1e293b;">{lead.provider_name}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{city_state}</td>
            <td style="padding:10px 12px;font-size:13px;color:#0d9488;">{lead.contact_email or '—'}</td>
        </tr>"""

    investor_rows = ""
    for i, inv in enumerate(investors, 1):
        sectors = ", ".join(inv.focus_sectors or [])[:40]
        investor_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1e293b;">{inv.fund_name}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.contact_name or '—'}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.location or '—'}</td>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">{inv.check_size_display or '—'}</td>
        </tr>"""

    remaining_agencies = max(0, len(agencies) - 10)
    agency_note = f"<p style='font-size:12px;color:#94a3b8;margin:8px 0 0 12px;'>+ {remaining_agencies} more queued for email today</p>" if remaining_agencies > 0 else ""

    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:24px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);border-radius:16px 16px 0 0;padding:32px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td><span style="font-size:28px;">🌴</span></td>
        <td style="text-align:right;">
            <span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;">{day_full}</span>
        </td>
    </tr>
    <tr><td colspan="2" style="padding-top:16px;">
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Daily Task Digest</h1>
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">{date_str} · PalmCare AI Outreach</p>
    </td></tr>
    </table>
</td></tr>

<!-- Summary Cards -->
<tr><td style="background:#fff;padding:24px 32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#f0fdfa;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#0d9488;">{len(calls)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Calls to Make</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#eff6ff;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#2563eb;">{len(agencies)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Emails to Send</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#faf5ff;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#7c3aed;">{len(investors)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Investor Emails</div>
        </td>
    </tr>
    </table>
</td></tr>

<!-- Calls Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">📞 Phone Calls</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Agencies without email, call to pitch PalmCare AI</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>#</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Phone</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Services</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Details</th><th style='padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Priority</th></tr>" + call_rows + "</table>" if calls else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No calls scheduled for today</div>"}
</td></tr>

<!-- Agency Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">📧 Agency Emails</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Queued for outreach, approve in Command Center</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Location</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Email</th></tr>" + agency_email_rows + "</table>" + agency_note if agencies else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No agency emails for today</div>"}
</td></tr>

<!-- Investor Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">💼 Investor Outreach</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Fundraising emails queued, approve in Command Center</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Fund</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Contact</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Location</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Check Size</th></tr>" + investor_rows + "</table>" if investors else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No investor emails for today</div>"}
</td></tr>

<!-- CTA -->
<tr><td style="background:#fff;padding:8px 32px 32px;border-radius:0 0 16px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:center;padding:16px 0;">
        <a href="https://palmcareai.com/admin/command-center" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">Open Command Center →</a>
    </td></tr>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">🌴 PalmCare AI · Daily Outreach Digest</p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Palm Technologies, INC. · Where care meets intelligence</p>
</td></tr>

</table>
</td></tr>
</table>

</body>
</html>"""
    return html


@router.post("/send-daily-digest")
def send_daily_digest(
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    """Build and send today's daily task digest email to the CEO."""
    data = _get_todays_plan_data(db)
    html = _build_daily_digest_html(data)

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(data["day_name"], data["day_name"])

    subject = f"🌴 {day_full} Task List: {len(data['calls'])} Calls, {len(data['agencies'])} Emails, {len(data['investors'])} Investors"

    result = email_service.send_email(
        to=CEO_EMAILS,
        subject=subject,
        html=html,
        sender="PalmCare AI <onboarding@resend.dev>",
        reply_to="sales@palmtai.com",
    )

    return {
        "ok": result.get("success", False),
        "subject": subject,
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "date": data["date"],
        "send_result": result,
    }


@router.get("/daily-digest-preview")
def daily_digest_preview(
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    """Preview today's daily digest without sending."""
    data = _get_todays_plan_data(db)
    return {
        "date": data["date"],
        "day_name": data["day_name"],
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "call_details": [
            {
                "provider_name": c.provider_name,
                "phone": c.phone,
                "city": c.city,
                "state": c.state,
                "priority": c.priority,
                "ownership_type": c.ownership_type,
                "services": [
                    s for s, has in [
                        ("Nursing", c.offers_nursing), ("PT", c.offers_pt),
                        ("OT", c.offers_ot), ("Speech", c.offers_speech),
                        ("Aide", c.offers_aide), ("Social Work", c.offers_social),
                    ] if has
                ],
            }
            for c in data["calls"]
        ],
        "investor_details": [
            {
                "fund_name": inv.fund_name,
                "contact_name": inv.contact_name,
                "contact_email": inv.contact_email,
                "location": inv.location,
                "check_size": inv.check_size_display,
                "relevance": inv.relevance_reason,
            }
            for inv in data["investors"]
        ],
    }


@router.get("/cron/daily-data")
def cron_daily_data(
    request: Request,
    db: Session = Depends(get_db),
    day_index: Optional[int] = None,
):
    """Return outreach data for a specific day. day_index=0 is first work day of week."""
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    cron_secret = os.getenv("CRON_SECRET", "palmcare-cron-2026")
    provided_key = request.headers.get("X-Internal-Key", "") or request.query_params.get("key", "")

    key_valid = (expected_key and provided_key == expected_key) or (provided_key == cron_secret)
    if not key_valid:
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")

    if day_index is not None:
        work_days = _week_work_days(0)
        global_day_offset = _cumulative_days_before(0)
        if day_index < 0 or day_index >= len(work_days):
            raise HTTPException(status_code=400, detail="Invalid day_index")
        day_name, day_date = work_days[day_index]
        global_idx = global_day_offset + day_index
        agencies = (
            db.query(SalesLead)
            .filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                    SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES))
            .order_by(PRIORITY_ORDER, SalesLead.created_at)
            .all()
        )
        day_agencies = agencies[global_idx * EMAILS_PER_DAY:(global_idx + 1) * EMAILS_PER_DAY]
        investors = (
            db.query(Investor)
            .filter(Investor.contact_email.isnot(None), Investor.contact_email != "",
                    Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES))
            .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
            .all()
        )
        day_investors = investors[global_idx * INVESTORS_PER_DAY:(global_idx + 1) * INVESTORS_PER_DAY]
        data = {"calls": [], "agencies": day_agencies, "investors": day_investors,
                "day_name": day_name, "date": day_date.isoformat()}
    else:
        data = _get_todays_plan_data(db)
    calls = data["calls"]
    agencies = data["agencies"]
    investors = data["investors"]

    return {
        "date": data["date"],
        "day_name": data["day_name"],
        "calls": [
            {
                "provider_name": c.provider_name,
                "phone": c.phone,
                "city": c.city,
                "state": c.state,
                "address": c.address,
                "zip_code": c.zip_code,
                "priority": c.priority,
                "ownership_type": c.ownership_type,
                "years_in_operation": c.years_in_operation,
                "star_rating": c.star_rating,
                "offers_nursing": c.offers_nursing,
                "offers_pt": c.offers_pt,
                "offers_ot": c.offers_ot,
                "offers_speech": c.offers_speech,
                "offers_aide": c.offers_aide,
                "offers_social": c.offers_social,
                "status": c.status,
                "is_contacted": c.is_contacted,
            }
            for c in calls
        ],
        "agencies": [
            {
                "id": str(a.id),
                "provider_name": a.provider_name,
                "city": a.city,
                "state": a.state,
                "contact_email": a.contact_email,
                "contact_name": a.contact_name,
                "priority": a.priority,
                "status": a.status,
                "email_send_count": a.email_send_count or 0,
                "last_email_sent_at": a.last_email_sent_at.isoformat() if a.last_email_sent_at else None,
            }
            for a in agencies
        ],
        "agency_count": len(agencies),
        "investors": [
            {
                "fund_name": inv.fund_name,
                "contact_name": inv.contact_name,
                "contact_email": inv.contact_email,
                "location": inv.location,
                "check_size_display": inv.check_size_display,
                "focus_sectors": inv.focus_sectors or [],
                "relevance_reason": inv.relevance_reason,
            }
            for inv in investors
        ],
    }


@router.post("/cron/mark-emails-sent")
def cron_mark_emails_sent(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
):
    """Mark or unmark agency/investor leads as email_sent by ID list."""
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    cron_secret = os.getenv("CRON_SECRET", "palmcare-cron-2026")
    provided_key = request.headers.get("X-Internal-Key", "") or request.query_params.get("key", "")
    key_valid = (expected_key and provided_key == expected_key) or (provided_key == cron_secret)
    if not key_valid:
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")

    now = datetime.now(timezone.utc)
    action = body.get("action", "mark")
    lead_ids = body.get("lead_ids", [])
    investor_ids = body.get("investor_ids", [])
    updated = 0

    if action == "unmark":
        for lid in lead_ids:
            lead = db.query(SalesLead).filter(SalesLead.id == lid).first()
            if lead and lead.status == "email_sent":
                lead.status = "new"
                lead.last_email_sent_at = None
                lead.email_send_count = max((lead.email_send_count or 1) - 1, 0)
                updated += 1
        for iid in investor_ids:
            inv = db.query(Investor).filter(Investor.id == iid).first()
            if inv and inv.status == "email_sent":
                inv.status = "new"
                inv.last_email_sent_at = None
                inv.email_send_count = max((inv.email_send_count or 1) - 1, 0)
                updated += 1
    else:
        for lid in lead_ids:
            lead = db.query(SalesLead).filter(SalesLead.id == lid).first()
            if lead and lead.status != "email_sent":
                lead.status = "email_sent"
                lead.last_email_sent_at = now
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.updated_at = now
                updated += 1
        for iid in investor_ids:
            inv = db.query(Investor).filter(Investor.id == iid).first()
            if inv and inv.status != "email_sent":
                inv.status = "email_sent"
                inv.last_email_sent_at = now
                inv.email_send_count = (inv.email_send_count or 0) + 1
                inv.updated_at = now
            updated += 1
    db.commit()
    return {"ok": True, "updated": updated}


@router.post("/cron/daily-digest")
def cron_daily_digest(
    request: Request,
    db: Session = Depends(get_db),
):
    """Cron-accessible daily digest. Requires X-Internal-Key header or CRON_SECRET query param."""
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    cron_secret = os.getenv("CRON_SECRET", "palmcare-cron-2026")
    provided_key = request.headers.get("X-Internal-Key", "") or request.query_params.get("key", "")

    key_valid = (expected_key and provided_key == expected_key) or (provided_key == cron_secret)
    if not key_valid:
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")

    data = _get_todays_plan_data(db)

    if not data["calls"] and not data["agencies"] and not data["investors"]:
        return {"ok": True, "skipped": True, "reason": "No tasks for today (weekend or no data)"}

    html = _build_daily_digest_html(data)

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(data["day_name"], data["day_name"])

    subject = f"🌴 {day_full} Task List: {len(data['calls'])} Calls, {len(data['agencies'])} Emails, {len(data['investors'])} Investors"

    result = email_service.send_email(
        to=CEO_EMAILS,
        subject=subject,
        html=html,
        sender="PalmCare AI <onboarding@resend.dev>",
        reply_to="sales@palmtai.com",
    )

    return {
        "ok": result.get("success", False),
        "subject": subject,
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "date": data["date"],
    }
