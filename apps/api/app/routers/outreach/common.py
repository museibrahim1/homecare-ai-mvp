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
    "Don't type the assessment twice",
    "{provider_name}: record once, docs write themselves",
    "Same-day contracts for {state} agencies",
    "Get Tuesday nights back",
    "Try PALM on one visit",
    "Point your iPhone camera at this email",
    "Care plan, billables, and contract from one recording",
    "PALM is on the App Store",
]

SITE_URL = "https://palmcareai.com"
APP_STORE = f"{SITE_URL}/app"
QR_APP = f"{SITE_URL}/marketing/social/palm-appstore-qr.png"
IMG = f"{SITE_URL}/screenshots"
# Kept for outreach module imports; one-pagers embed CTA+QR themselves.
AGENCY_FOOTER = ""
_TEAL = "#0d9488"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"


def _agency_one_pager(
    headline: str,
    body_lines: list[str],
    note: str,
    *,
    bullets: Optional[List[str]] = None,
    preview_html: str = "",
) -> str:
    """Glass outreach card: benefit copy, product preview, CTA, QR."""
    paras = "".join(
        f'<p style="margin:0 0 12px;font-size:15px;line-height:24px;color:{_SLATE_600};">{line}</p>'
        for line in body_lines
    )
    bullet_html = ""
    if bullets:
        rows = "".join(
            f'<tr><td style="padding:0 0 8px;font-size:14px;line-height:20px;color:{_SLATE_900};">'
            f'<span style="color:{_TEAL};font-weight:700;">&#10003;</span>&nbsp;&nbsp;{b}</td></tr>'
            for b in bullets
        )
        bullet_html = f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 12px;">{rows}</table>'
    return f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid {_SLATE_200};border-radius:20px;">
  <tr><td style="padding:28px 24px 8px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:{_SLATE_900};">PalmCare AI</p>
    <div style="width:36px;height:3px;border-radius:99px;background:{_TEAL};margin:0 0 20px;"></div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:700;color:{_SLATE_900};letter-spacing:-0.03em;">{headline}</h1>
    {paras}
    {bullet_html}
  </td></tr>
  {preview_html}
  <tr><td align="center" style="padding:16px 24px 16px;">
    <a href="{APP_STORE}" style="display:inline-block;background:{_TEAL};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">Download PALM for iPhone</a>
  </td></tr>
  <tr><td align="center" style="padding:0 24px 8px;">
    <a href="{APP_STORE}" style="text-decoration:none;">
      <img src="{QR_APP}" width="100" height="100" alt="Scan to download PALM" style="display:block;width:100px;height:100px;border-radius:12px;border:1px solid {_SLATE_200};" />
    </a>
    <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">Scan with your iPhone camera</p>
  </td></tr>
  <tr><td style="padding:8px 24px 24px;">
    <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:14px 16px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#0f766e;">Just Palm It</p>
      <p style="margin:4px 0 0;font-size:13px;line-height:20px;color:{_SLATE_600};">{note}</p>
    </div>
  </td></tr>
</table>
<p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
  PalmCare AI · Omaha, NE · <a href="{SITE_URL}" style="color:#94A3B8;">palmcareai.com</a>
</p>"""


def _agency_preview_pair() -> str:
    left = f"{IMG}/glass/pipeline-recording.png"
    right = f"{IMG}/glass/pipeline-contract.png"
    return f"""
  <tr><td style="padding:8px 20px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:16px;">
      <tr>
        <td width="50%" style="padding:14px 6px 14px 14px;" align="center">
          <img src="{left}" width="200" alt="Voice recording" style="display:block;width:100%;max-width:200px;border-radius:12px;border:1px solid {_SLATE_200};" />
        </td>
        <td width="50%" style="padding:14px 14px 14px 6px;" align="center">
          <img src="{right}" width="200" alt="Contract ready" style="display:block;width:100%;max-width:200px;border-radius:12px;border:1px solid {_SLATE_200};" />
        </td>
      </tr>
    </table>
    <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;text-align:center;">New glass UI. Record the visit. Contract is ready to review.</p>
  </td></tr>"""


def _agency_preview_wide(src: str, caption: str) -> str:
    return f"""
  <tr><td style="padding:8px 20px 4px;" align="center">
    <img src="{src}" width="460" alt="PalmCare AI product" style="display:block;width:100%;max-width:460px;border-radius:14px;border:1px solid {_SLATE_200};" />
    <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;text-align:center;">{caption}</p>
  </td></tr>"""


AGENCY_TEMPLATES = [
    lambda city, state: _agency_one_pager(
        "Don't type it twice",
        [
            "Hi,",
            "Every assessment is said out loud, then typed again into a care plan, billables, and a contract. "
            "That second pass is where evenings disappear.",
            "PALM records the visit on iPhone and writes the paperwork from that conversation. "
            "Your assessor reviews once. The family can sign the same day.",
        ],
        "Free for 14 days. No credit card to start.",
        bullets=[
            "One recording becomes care plan, billables, notes, and contract",
            "Built for home care agencies, not generic AI chat",
            "You review before anything is final",
        ],
        preview_html=_agency_preview_pair(),
    ),
    lambda city, state: _agency_one_pager(
        "One visit. Docs ready.",
        [
            "Hi,",
            f"For agencies in {city or 'your area'}, {state or 'your state'}: "
            "record the assessment during the visit. Review the care plan and contract before you leave.",
            "Office and field stay on the same packet. No overnight retype.",
        ],
        "50-state rules built in. Free for 14 days.",
        bullets=[
            "Voice assessment on the phone in the home",
            "Four documents from one recording",
            "Same-day signature when the family is ready",
        ],
        preview_html=_agency_preview_wide(
            f"{IMG}/glass/web-home.png",
            "Office glass dashboard stays in sync with the field.",
        ),
    ),
    lambda city, state: _agency_one_pager(
        "Get Tuesday nights back",
        [
            "Hi,",
            "Most assessors finish the visit at 4 and start typing at 8. "
            "PALM keeps the living-room version so paperwork does not restart at home.",
            "Review before you leave the driveway. Then go home.",
        ],
        "Just Palm It. Download on iPhone.",
        bullets=[
            "Docs drafted before the car leaves the curb",
            "Office dashboard stays in sync with the field",
            "Less after-hours typing for your team",
        ],
        preview_html=_agency_preview_wide(
            f"{IMG}/glass/pipeline-care-plan.png",
            "Care plan ready before you leave the driveway.",
        ),
    ),
]


def _build_agency_html(provider_name: str, city: str, state: str) -> tuple[str, str]:
    """Short glass outreach one-pager with App Store CTA + QR."""
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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;">
  <tr><td align="center" style="padding:28px 16px;">
{body_content}
  </td></tr>
</table>
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
