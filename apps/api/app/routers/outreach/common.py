"""
Shared constants, helpers, and email templates for the outreach package.

Split out of the original monolithic outreach.py. Some names here are
re-exported from app.routers.outreach (see __init__.py) because agent.py
imports them directly (_week_work_days, EMAILS_PER_DAY, _build_agency_html, etc.).
"""

import logging
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import case

from app.models.sales_lead import SalesLead
from app.models.investor import Investor

logger = logging.getLogger(__name__)

# In-memory draft store (keyed by draft_id), shared across the drafts routes.
_drafts: Dict[str, dict] = {}

# ─── Status filters & priority ordering ───

EXCLUDED_LEAD_STATUSES = ("converted", "not_interested", "email_bounced")
EXCLUDED_CALL_STATUSES = ("converted", "not_interested", "no_response")
EXCLUDED_INVESTOR_STATUSES = ("passed", "not_relevant", "committed", "email_bounced")

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

# ─── Business timezone, email templates & builders ───

BUSINESS_TZ = ZoneInfo("America/New_York")


def _now_eastern() -> datetime:
    """Current time in US Eastern (business timezone)."""
    return datetime.now(BUSINESS_TZ)


def _today_eastern() -> date:
    """Today's date in US Eastern."""
    return _now_eastern().date()


def _today_start() -> datetime:
    """Start of today in US Eastern, converted to UTC for DB queries."""
    eastern_now = _now_eastern()
    eastern_midnight = eastern_now.replace(hour=0, minute=0, second=0, microsecond=0)
    return eastern_midnight.astimezone(timezone.utc)


def _week_bounds() -> tuple[datetime, datetime]:
    """Return (Monday 00:00, Sunday 23:59:59) of the current week in Eastern, as UTC."""
    eastern_now = _now_eastern()
    monday_eastern = (eastern_now - timedelta(days=eastern_now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    sunday_eastern = monday_eastern + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday_eastern.astimezone(timezone.utc), sunday_eastern.astimezone(timezone.utc)


AGENCY_SUBJECT_HOOKS = [
    "How many systems is {provider_name} juggling right now?",
    "{provider_name}, still using separate systems for intake, docs, and billing?",
    "What if {provider_name} could onboard a client in 10 minutes?",
    "One platform for your entire agency. {state} agencies are switching.",
    "The management tool replacing 3-5 disconnected systems",
    "{provider_name}, your team shouldn't need 5 apps to run an agency",
    "What agencies in {state} are replacing first",
    "Onboard a client in one visit. Here's how.",
    "{provider_name} is losing 15 hours a week to this",
    "Everything your agency needs, one platform",
]

SITE_URL = "https://palmcareai.com"
IMG = f"{SITE_URL}/screenshots"

_S = "border-radius:8px;border:1px solid #e5e7eb;"

AGENCY_TEMPLATES = [
    # Template 0: "Your tools are costing you clients"
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Most home care agencies are running 3 to 5 disconnected systems. One for scheduling, one for documentation, another for billing, maybe a spreadsheet for client intake, and a filing cabinet for contracts.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">None of them talk to each other. Things fall through the cracks. Onboarding a new client takes days instead of hours. And every week, your team loses 15+ hours to paperwork that should be automated.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;"><strong>PalmCare AI replaces all of it with one platform:</strong></p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Client Management</strong>: every client, contact, and case in one place</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Assessment Pipeline</strong>: intake to signed contract in minutes, not days</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Automated Care Plans</strong>: generated from the assessment, compliant across all 50 states</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Contracts &amp; Signatures</strong>: service agreements created and sent instantly</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Reports &amp; Billing</strong>: exportable, audit-ready, no manual entry</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;">&bull; <strong style="color:#0d9488;">Mobile App</strong>: your staff can work from the field, not the office</td></tr>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_dashboard.png" width="280" style="width:100%;{_S}" alt="Agency Dashboard" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_pipeline.png" width="280" style="width:100%;{_S}" alt="Client Pipeline" /></a></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Agency dashboard and client pipeline. Everything at a glance.</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Agencies using PalmCare are cutting onboarding time by 80% and eliminating the admin bottleneck that costs them clients.</p>""",

    # Template 1: "One dashboard for your entire agency"
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Quick question. Is your team still copying client info between systems, printing forms for assessments, or chasing signatures by email?</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">PalmCare AI is a single platform built specifically for home care agencies in {city or "your area"}, {state}. Everything your office and field staff need, in one place:</p>

<p style="font-size:15px;color:#0d9488;font-weight:700;margin:0 0 8px;">For your office:</p>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Full CRM dashboard with clients, leads, pipeline, and status tracking</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Assessment and care plan generation with no templates to fill out manually</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Contracts created automatically from each assessment</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; One-click reports for compliance, billing, and internal review</td></tr>
</table>

<p style="font-size:15px;color:#0d9488;font-weight:700;margin:0 0 8px;">For your field staff:</p>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Mobile app to record assessments by voice during home visits</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; AI transcribes the conversation and extracts every care need and billable item</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Care plan and contract ready before your caregiver leaves the home</td></tr>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_dashboard.png" width="280" style="width:100%;{_S}" alt="Agency Dashboard" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_pipeline.png" width="280" style="width:100%;{_S}" alt="Client Pipeline" /></a></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Agency dashboard and client pipeline. One platform for everything.</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">No more bouncing between software. No more lost paperwork. No more 3-day onboarding process.</p>""",

    # Template 2: "What if onboarding took 10 minutes?"
    lambda city, state: f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi there,</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Right now, onboarding a new home care client typically takes 2 to 5 days. Between the intake call, the assessment paperwork, the care plan, getting the contract written up, and collecting a signature.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;"><strong>With PalmCare AI, agencies are doing it in one visit:</strong></p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">1.</strong> Open the app during the home visit</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">2.</strong> Record the assessment conversation. AI handles the rest.</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">3.</strong> Care plan, billable items, and service contract generated automatically</td></tr>
<tr><td style="padding:6px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">4.</strong> Client reviews and signs before your caregiver leaves</td></tr>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_dashboard.png" width="280" style="width:100%;{_S}" alt="Agency Dashboard" /></a></td>
<td width="49%" style="padding-left:4px;"><a href="{SITE_URL}/features" style="text-decoration:none;"><img src="{IMG}/email/crm_pipeline.png" width="280" style="width:100%;{_S}" alt="Client Pipeline" /></a></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Full agency dashboard and client pipeline</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">The platform is not just AI. It is a full agency management system:</p>
<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Client CRM with status tracking and notes</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Assessment pipeline from intake to signed contract</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Automated documentation for Medicaid, Medicare, and private pay</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Mobile app for field staff, web dashboard for the office</td></tr>
<tr><td style="padding:4px 0;font-size:15px;color:#333;line-height:1.5;">&bull; Exportable reports for compliance and billing</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Everything your agency needs. One platform. $399/month.</p>""",
]

AGENCY_FOOTER = f"""\
<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 20px;">Try it free for 14 days, no commitment:</p>

<p style="margin:0 0 24px;">
<a href="{SITE_URL}/#book-demo" style="display:inline-block;background:#0d9488;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Sign Up and Get Your 14 Day Free Trial</a>
</p>

<a href="{SITE_URL}/#book-demo" style="text-decoration:none;">
<img src="{IMG}/email/app_interface.png" width="580" style="width:100%;max-width:580px;border-radius:12px;border:1px solid #e5e5e5;margin:0 0 24px;" alt="PalmCare AI, Designed for Care Professionals" />
</a>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Visit our website @ <a href="{SITE_URL}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a></p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;">Warm regards,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.5;margin:0 0 4px;"><strong>The PalmCare AI Team</strong></p>
<p style="font-size:13px;color:#888;line-height:1.5;margin:0;">Palm Technologies Inc.<br/>
<a href="mailto:sales@palmcareai.com" style="color:#0d9488;text-decoration:none;">sales@palmcareai.com</a></p>"""


def _build_agency_html(provider_name: str, city: str, state: str) -> tuple[str, str]:
    """Generate a clean, personal email with rotating templates drawn from landing page messaging."""
    import hashlib
    h = int(hashlib.md5(provider_name.encode()).hexdigest(), 16)
    subj_idx = h % len(AGENCY_SUBJECT_HOOKS)
    tmpl_idx = h % len(AGENCY_TEMPLATES)
    subject = AGENCY_SUBJECT_HOOKS[subj_idx].format(
        state=state or "your state",
        provider_name=provider_name or "your agency",
    )

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


PITCH_DECK_URL = f"{SITE_URL}/PalmCare_Deck_v5.pdf"


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

# ─── Daily quotas, launch date & call-ordering by timezone ───

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
    """Return list of (day_name, date) for working days in the given week (Mon-Fri).
    Filters out days before LAUNCH_DATE for any week that overlaps it."""
    today = _today_eastern()
    days_since_monday = today.weekday()
    this_monday = today - timedelta(days=days_since_monday)
    target_monday = this_monday + timedelta(weeks=week_offset)

    days = [
        (FULL_WORK_DAYS[i], target_monday + timedelta(days=i))
        for i in range(5)
        if (target_monday + timedelta(days=i)) >= LAUNCH_DATE
    ]
    return days


def _cumulative_days_before(week_offset: int) -> int:
    """Count total working days scheduled before this week (only future weeks, offset >= 1)."""
    if week_offset <= 0:
        return 0
    total = 0
    for w in range(week_offset):
        total += len(_week_work_days(w))
    return total
