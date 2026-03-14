"""
Sales Leads Router — CEO-ONLY

Private CRM for outbound sales campaigns.
Only accessible to platform admin accounts (@palmtai.com).
Data sourced from CMS Provider Data API.
"""

import logging
import json
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_, and_, cast, Date, extract
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User, UserRole
from app.models.sales_lead import SalesLead, LeadStatus
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class LeadSummary(BaseModel):
    id: UUID
    provider_name: str
    state: str
    city: Optional[str]
    phone: Optional[str]
    ownership_type: Optional[str]
    years_in_operation: Optional[float]
    star_rating: Optional[str]
    status: str
    priority: str
    contact_email: Optional[str]
    contact_name: Optional[str]
    email_send_count: int
    email_open_count: int
    last_email_sent_at: Optional[datetime]
    is_contacted: bool
    is_converted: bool
    campaign_tag: Optional[str]
    created_at: Optional[datetime]


class LeadDetail(BaseModel):
    id: UUID
    provider_name: str
    state: str
    city: Optional[str]
    address: Optional[str]
    zip_code: Optional[str]
    phone: Optional[str]
    ownership_type: Optional[str]
    ccn: Optional[str]
    certification_date: Optional[str]
    years_in_operation: Optional[float]
    star_rating: Optional[str]
    offers_nursing: bool
    offers_pt: bool
    offers_ot: bool
    offers_speech: bool
    offers_social: bool
    offers_aide: bool
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_title: Optional[str]
    website: Optional[str]
    status: str
    priority: str
    notes: Optional[str]
    last_email_sent_at: Optional[datetime]
    last_email_subject: Optional[str]
    email_send_count: int
    email_open_count: int
    last_email_opened_at: Optional[datetime]
    last_response_at: Optional[datetime]
    campaign_tag: Optional[str]
    source: Optional[str]
    is_contacted: bool
    is_converted: bool
    converted_at: Optional[datetime]
    activity_log: list
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    website: Optional[str] = None
    campaign_tag: Optional[str] = None
    is_contacted: Optional[bool] = None


class LeadEmailRequest(BaseModel):
    subject: str
    html_body: str
    to_email: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    lead_ids: List[UUID]
    status: str


class LeadStats(BaseModel):
    total: int
    new: int
    contacted: int
    email_sent: int
    email_opened: int
    responded: int
    converted: int
    not_interested: int
    no_response: int
    nebraska_count: int
    iowa_count: int
    last_5_years: int
    last_10_years: int
    has_email: int
    has_website: int


ALL_US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "GU", "VI", "AS", "MP",
]


class ImportRequest(BaseModel):
    states: List[str] = ["NE", "IA"]
    all_states: bool = False
    exclude_government: bool = True
    limit_per_state: int = 1000


class CampaignSendRequest(BaseModel):
    template_id: str
    campaign_name: str
    state: Optional[str] = None
    status: Optional[str] = None
    has_email: Optional[bool] = True
    priority: Optional[str] = None
    max_years: Optional[float] = None
    exclude_already_emailed: bool = True


class SequenceLaunchRequest(BaseModel):
    campaign_name: str
    state: Optional[str] = None
    priority: Optional[str] = None
    max_years: Optional[float] = None
    exclude_already_emailed: bool = True


_SITE = "https://palmcareai.com"
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_CYAN = "#0891b2"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"
_GH_MARKETING = "https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/main/apps/web/public/marketing"


def _email_wrap(body_sections: str, provider_name: str = "{provider_name}") -> str:
    """Apple-style clean email wrapper with PALM IT branding."""
    return (
        '<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, '
        'sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">'
        # Header
        '<div style="background: linear-gradient(135deg, #0d9488, #0891b2); '
        'padding: 32px 40px; text-align: center; border-radius: 0;">'
        '<p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; '
        'letter-spacing: -0.3px;">PalmCare AI</p>'
        '<p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); '
        'letter-spacing: 0.05em;">WHERE CARE MEETS INTELLIGENCE</p>'
        '</div>'
        # Body
        f'<div style="padding: 40px; color: {_SLATE_900}; font-size: 15px; line-height: 1.7;">'
        f'{body_sections}'
        '</div>'
        # Signature
        f'<div style="padding: 0 40px 32px; border-top: 1px solid {_SLATE_200}; padding-top: 24px;">'
        f'<p style="margin: 0; font-weight: 700; font-size: 15px; color: {_SLATE_900};">Muse Ibrahim</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">President &amp; CEO</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Palm Technologies, Inc.</p>'
        f'<p style="margin: 6px 0 0;"><a href="{_SITE}" '
        f'style="color: {_TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">'
        f'palmcareai.com</a></p>'
        '</div>'
        # Product showcase — iPhone + CRM
        '<div style="padding: 0 40px 32px; text-align: center;">'
        f'<a href="{_SITE}" style="text-decoration: none;">'
        f'<img src="{_GH_MARKETING}/hero_banner.png" '
        'alt="PalmCare AI — iPhone App + CRM Dashboard" '
        'style="max-width: 520px; width: 100%; border-radius: 12px; '
        f'border: 1px solid {_SLATE_200};" />'
        '</a></div>'
        # iPhone app previews
        '<div style="padding: 0 40px 24px; text-align: center;">'
        f'<img src="{_GH_MARKETING}/iphone_home.png" alt="Home" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        f'<img src="{_GH_MARKETING}/iphone_record.png" alt="Palm It" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        f'<img src="{_GH_MARKETING}/iphone_clients.png" alt="Clients" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        '</div>'
        # CTA banner
        '<div style="margin: 0 40px 32px; background: linear-gradient(135deg, #0d9488, #0f766e); '
        'border-radius: 12px; padding: 28px 32px; text-align: center;">'
        f'<p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #ffffff;">PALM IT.</p>'
        '<p style="margin: 0 0 16px; font-size: 13px; color: rgba(255,255,255,0.85);">'
        'Record it. Transcribe it. Contract it. All in your palm.</p>'
        f'<a href="{_SITE}/#book-demo" style="display: inline-block; background-color: #ffffff; '
        f'color: {_TEAL_DARK}; text-decoration: none; font-size: 14px; font-weight: 600; '
        'padding: 12px 28px; border-radius: 8px;">See It In Action</a>'
        '</div>'
        # Footer
        f'<div style="padding: 24px 40px; background-color: {_SLATE_100}; '
        f'border-top: 1px solid {_SLATE_200}; text-align: center;">'
        f'<a href="{_SITE}" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">'
        f'<img src="{_SITE}/qr-code.png" alt="Scan to visit palmcareai.com" '
        'style="width: 72px; height: 72px; border-radius: 8px; border: 1px solid #e2e8f0;" />'
        '</a><br>'
        f'<p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">Scan to visit palmcareai.com</p>'
        f'<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: {_SLATE_900};">'
        'PalmCare AI</p>'
        f'<p style="margin: 0 0 12px; font-size: 12px; color: {_SLATE_600};">'
        'Built for care professionals</p>'
        f'<p style="margin: 0 0 12px; font-size: 11px; color: #94a3b8;">'
        f'Palm Technologies, Inc. &middot; Omaha, NE<br>'
        f'You received this because {provider_name} is listed in public agency directories.</p>'
        '<p style="margin: 0;">'
        f'<a href="{_SITE}/privacy" style="color: #94a3b8; text-decoration: underline; '
        'font-size: 11px;">Privacy</a>'
        '&nbsp;&middot;&nbsp;'
        f'<a href="{_SITE}/unsubscribe" style="color: #94a3b8; text-decoration: underline; '
        'font-size: 11px;">Unsubscribe</a>'
        '</p></div>'
        '</div>'
    )


def _section(heading: str, body: str) -> str:
    """Apple-style content section with teal heading accent."""
    return (
        f'<div style="margin-bottom: 28px;">'
        f'<p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: {_TEAL}; '
        f'text-transform: uppercase; letter-spacing: 0.08em;">{heading}</p>'
        f'<p style="margin: 0; font-size: 15px; color: {_SLATE_900}; line-height: 1.7;">{body}</p>'
        f'</div>'
    )


def _stat_block(stat: str, label: str) -> str:
    """Inline stat block for data-driven emails."""
    return (
        f'<div style="display: inline-block; text-align: center; padding: 16px 24px; '
        f'background-color: {_SLATE_100}; border: 1px solid {_SLATE_200}; border-radius: 12px; '
        f'margin: 0 8px 12px 0;">'
        f'<div style="font-size: 28px; font-weight: 800; color: {_TEAL};">{stat}</div>'
        f'<div style="font-size: 11px; color: {_SLATE_600}; font-weight: 600; margin-top: 4px; '
        f'text-transform: uppercase; letter-spacing: 0.05em;">{label}</div>'
        f'</div>'
    )


_P = f"margin: 0 0 16px 0; color: {_SLATE_900};"
_P_MUTED = f"margin: 0 0 16px 0; color: {_SLATE_600}; font-size: 14px;"


EMAIL_TEMPLATES = {
    "warm_open": {
        "id": "warm_open",
        "name": "The Warm Open",
        "subject": "{provider_name} — quick question",
        "sequence_day": 1,
        "description": "Day 1 — Confident intro with PALM IT energy. Genuine curiosity, brand-aware.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "Why I reached out",
                "I came across {provider_name} while researching home care agencies in {city}. "
                "Building something in this industry takes real grit &mdash; I respect it."
            )
            + f'<p style="{_P}">Quick question: how is your team handling client assessments and '
            'documentation right now? Still paper-based, or have you found something digital that '
            'actually works?</p>'
            + _section(
                "What we do",
                "PalmCare AI turns care assessments into signed contracts &mdash; automatically. "
                "Staff record the interview on their phone. AI transcribes it, generates the care plan, "
                "and produces a ready-to-sign agreement in seconds."
            )
            + f'<p style="{_P_MUTED}">No pitch today &mdash; just curious how agency owners in '
            '{state_full} actually run things day to day.</p>',
            "{provider_name}",
        ),
    },
    "pattern_interrupt": {
        "id": "pattern_interrupt",
        "name": "The Pattern Interrupt",
        "subject": "this isn't another software pitch",
        "sequence_day": 3,
        "description": "Day 3 — Self-aware, punchy. One killer stat, one CTA. PALM IT energy.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Your inbox is full of people selling things. This is different.</p>'
            + _section(
                "One number worth knowing",
                "Agencies using voice-to-documentation tools are cutting "
                "<strong>12+ hours of admin work per week</strong>. "
                "That&rsquo;s a nurse and a half worth of time going back to patient care."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("12+", "Hours saved / week")
            + _stat_block("10x", "Faster assessments")
            + _stat_block("95%", "Accuracy rate")
            + '</div>'
            + f'<p style="{_P}">10 minutes. No slides. Just a live demo of how it works.</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">Palm It &mdash; Book a Demo</a></div>',
            "{provider_name}",
        ),
    },
    "aspiration": {
        "id": "aspiration",
        "name": "The Aspiration",
        "subject": "close clients before you leave their home",
        "sequence_day": 7,
        "description": "Day 7 — Paints the picture. Shows the workflow transformation. Identity-driven.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "Picture this",
                "You sit down with a new client. You talk through the assessment on your phone "
                "for a few minutes. Before you leave their home &mdash; a complete care plan, "
                "assessment, and service contract are ready to sign."
            )
            + _section(
                "How it works",
                "<strong>1.</strong> Record the assessment interview on your phone<br>"
                "<strong>2.</strong> AI transcribes everything in real time<br>"
                "<strong>3.</strong> AI generates the care plan + service agreement<br>"
                "<strong>4.</strong> Contract sent to client &mdash; ready to sign"
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/fb_ad.png" '
            'alt="Before and After PalmCare AI" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + f'<p style="{_P}">No training manuals. No data entry. No delays.<br>'
            '<strong>Just tap, talk, and Palm It.</strong></p>'
            + '<p style="' + _P_MUTED + '">Want to see it work with {provider_name}&rsquo;s actual workflow?</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">See It In Action</a></div>',
            "{provider_name}",
        ),
    },
    "proof_point": {
        "id": "proof_point",
        "name": "The Proof Point",
        "subject": "never lose a client to paperwork again",
        "sequence_day": 14,
        "description": "Day 14 — Data-driven with traction proof. Stats in their language. Competitive edge.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "The paperwork problem",
                "The average home care agency spends <strong>15+ hours per week</strong> on "
                "documentation alone. That&rsquo;s time that should go to client visits, "
                "caregiver training, or honestly just getting home at a reasonable hour."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("15hrs", "Typical weekly docs")
            + _stat_block("3hrs", "With PalmCare AI")
            + _stat_block("12hrs", "Back every week")
            + '</div>'
            + _section(
                "Why agencies are switching",
                "<strong>60+ agencies</strong> on the waitlist. "
                "<strong>24 active pilot users.</strong> "
                "<strong>300+ assessments</strong> generated with 68% accuracy improvement. "
                "No other platform does AI assessment generation, AI contract creation, "
                "and voice-to-contract &mdash; we&rsquo;re the first."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/linkedin_crm.png" '
            'alt="PalmCare AI CRM — Dashboard, Pipeline, Mobile App" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + '<p style="' + _P + '">For {provider_name}, that could mean 12 hours back. Every single week.</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">Palm It &mdash; Get Started</a></div>',
            "{provider_name}",
        ),
    },
    "graceful_exit": {
        "id": "graceful_exit",
        "name": "The Graceful Exit",
        "subject": "closing the loop, {provider_name}",
        "sequence_day": 28,
        "description": "Day 28 — Short, confident, respectful. Restraint signals strength. Door stays open.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">I&rsquo;ve reached out a few times and I know you&rsquo;re busy. '
            'Running {provider_name} in {city} is more than a full-time job.</p>'
            f'<p style="{_P}">I won&rsquo;t keep filling your inbox.</p>'
            + _section(
                "When you're ready",
                "If the timing is ever right for a faster way to handle assessments, contracts, "
                "and documentation &mdash; we&rsquo;re here. One tap, AI handles the rest."
            )
            + f'<p style="{_P_MUTED}">Your next client is waiting. So are we.</p>',
            "{provider_name}",
        ),
    },
}

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


# =============================================================================
# LIST & FILTER
# =============================================================================

@router.get("/leads", response_model=List[LeadSummary])
async def list_leads(
    state: Optional[str] = None,
    status: Optional[str] = None,
    ownership: Optional[str] = None,
    priority: Optional[str] = None,
    campaign: Optional[str] = None,
    max_years: Optional[float] = None,
    min_years: Optional[float] = None,
    contacted: Optional[bool] = None,
    converted: Optional[bool] = None,
    has_email: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(provider_name|state|city|years_in_operation|status|star_rating|email_send_count|created_at|last_email_sent_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """List sales leads with comprehensive filtering."""
    query = db.query(SalesLead)

    if state:
        query = query.filter(SalesLead.state == state.upper())
    if status:
        query = query.filter(SalesLead.status == status)
    if ownership:
        query = query.filter(SalesLead.ownership_type.ilike(f"%{ownership}%"))
    if priority:
        query = query.filter(SalesLead.priority == priority)
    if campaign:
        query = query.filter(SalesLead.campaign_tag == campaign)
    if max_years is not None:
        query = query.filter(SalesLead.years_in_operation <= max_years)
    if min_years is not None:
        query = query.filter(SalesLead.years_in_operation >= min_years)
    if contacted is not None:
        query = query.filter(SalesLead.is_contacted == contacted)
    if converted is not None:
        query = query.filter(SalesLead.is_converted == converted)
    if has_email is not None:
        if has_email:
            query = query.filter(SalesLead.contact_email.isnot(None), SalesLead.contact_email != "")
        else:
            query = query.filter(or_(SalesLead.contact_email.is_(None), SalesLead.contact_email == ""))
    if search:
        query = query.filter(or_(
            SalesLead.provider_name.ilike(f"%{search}%"),
            SalesLead.city.ilike(f"%{search}%"),
            SalesLead.contact_name.ilike(f"%{search}%"),
            SalesLead.contact_email.ilike(f"%{search}%"),
        ))

    sort_col = getattr(SalesLead, sort_by, SalesLead.created_at)
    order_fn = desc if sort_order == "desc" else asc
    query = query.order_by(order_fn(sort_col))

    leads = query.offset(skip).limit(limit).all()

    return [
        LeadSummary(
            id=l.id,
            provider_name=l.provider_name,
            state=l.state,
            city=l.city,
            phone=l.phone,
            ownership_type=l.ownership_type,
            years_in_operation=l.years_in_operation,
            star_rating=l.star_rating,
            status=l.status,
            priority=l.priority,
            contact_email=l.contact_email,
            contact_name=l.contact_name,
            email_send_count=l.email_send_count or 0,
            email_open_count=l.email_open_count or 0,
            last_email_sent_at=l.last_email_sent_at,
            is_contacted=l.is_contacted or False,
            is_converted=l.is_converted or False,
            campaign_tag=l.campaign_tag,
            created_at=l.created_at,
        )
        for l in leads
    ]


@router.get("/leads/stats", response_model=LeadStats)
async def get_lead_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Get aggregate stats for sales leads dashboard."""
    total = db.query(SalesLead).count()

    def count_status(s):
        return db.query(SalesLead).filter(SalesLead.status == s).count()

    ne_count = db.query(SalesLead).filter(SalesLead.state == "NE").count()
    ia_count = db.query(SalesLead).filter(SalesLead.state == "IA").count()
    last_5 = db.query(SalesLead).filter(
        SalesLead.years_in_operation.isnot(None),
        SalesLead.years_in_operation <= 5,
    ).count()
    last_10 = db.query(SalesLead).filter(
        SalesLead.years_in_operation.isnot(None),
        SalesLead.years_in_operation <= 10,
    ).count()

    has_email_count = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
    ).count()
    has_website_count = db.query(SalesLead).filter(
        SalesLead.website.isnot(None),
        SalesLead.website != "",
    ).count()

    return LeadStats(
        total=total,
        new=count_status("new"),
        contacted=count_status("contacted"),
        email_sent=count_status("email_sent"),
        email_opened=count_status("email_opened"),
        responded=count_status("responded"),
        converted=count_status("converted"),
        not_interested=count_status("not_interested"),
        no_response=count_status("no_response"),
        nebraska_count=ne_count,
        iowa_count=ia_count,
        last_5_years=last_5,
        last_10_years=last_10,
        has_email=has_email_count,
        has_website=has_website_count,
    )


# =============================================================================
# EMAIL TEMPLATES & BULK CAMPAIGNS
# (Must be defined BEFORE /leads/{lead_id} to avoid route shadowing)
# =============================================================================

@router.get("/leads/email-templates")
async def list_email_templates(
    admin: User = Depends(require_permission("sales_leads")),
):
    """Return available email pitch templates."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "subject": t["subject"],
            "description": t["description"],
            "body": t["body"],
            "sequence_day": t.get("sequence_day"),
        }
        for t in EMAIL_TEMPLATES.values()
    ]


@router.post("/leads/email-templates/{template_id}/preview")
async def preview_template(
    template_id: str,
    lead_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Render a template with sample or actual lead data."""
    tmpl = EMAIL_TEMPLATES.get(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if lead_id:
        lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        data = {
            "provider_name": lead.provider_name,
            "city": lead.city or "your city",
            "state": lead.state,
            "state_full": STATE_NAMES.get(lead.state, lead.state),
        }
    else:
        data = {
            "provider_name": "ABC Home Care",
            "city": "Omaha",
            "state": "NE",
            "state_full": "Nebraska",
        }

    return {
        "subject": _render_template(tmpl["subject"], data),
        "body": _render_template(tmpl["body"], data),
    }


def _render_template(template_str: str, data: dict) -> str:
    """Replace merge tags like {provider_name} with actual values."""
    result = template_str
    for key, value in data.items():
        result = result.replace("{" + key + "}", str(value))
    return result


@router.post("/leads/campaigns/send")
async def send_campaign(
    req: CampaignSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Send a bulk email campaign to filtered leads."""
    tmpl = EMAIL_TEMPLATES.get(req.template_id)
    if not tmpl:
        raise HTTPException(status_code=400, detail="Invalid template_id")

    query = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
    )

    if req.state:
        query = query.filter(SalesLead.state == req.state.upper())
    if req.status:
        query = query.filter(SalesLead.status == req.status)
    if req.priority:
        query = query.filter(SalesLead.priority == req.priority)
    if req.max_years is not None:
        query = query.filter(SalesLead.years_in_operation <= req.max_years)
    if req.exclude_already_emailed:
        query = query.filter(SalesLead.email_send_count == 0)

    leads = query.all()

    if not leads:
        raise HTTPException(status_code=400, detail="No eligible leads match the filters")

    now = datetime.now(timezone.utc)
    sent = 0
    failed = 0
    errors = []

    for lead in leads:
        data = {
            "provider_name": lead.provider_name,
            "city": lead.city or "your area",
            "state": lead.state,
            "state_full": STATE_NAMES.get(lead.state, lead.state),
        }

        subject = _render_template(tmpl["subject"], data)
        body = _render_template(tmpl["body"], data)

        result = email_service.send_email(
            to=lead.contact_email,
            subject=subject,
            sender=email_service.from_sales,
            html=body,
        )

        if result.get("success"):
            lead.last_email_sent_at = now
            lead.last_email_subject = subject
            lead.email_send_count = (lead.email_send_count or 0) + 1
            lead.campaign_tag = req.campaign_name
            lead.last_template_sent = req.template_id

            if lead.status == LeadStatus.new.value:
                lead.status = LeadStatus.email_sent.value

            if result.get("id"):
                lead.resend_email_id = result["id"]

            db.add(EmailCampaignEvent(
                lead_id=lead.id,
                template_id=req.template_id,
                campaign_tag=req.campaign_name,
                event_type="sent",
                resend_email_id=result.get("id"),
                subject=subject,
                to_email=lead.contact_email,
                created_at=now,
            ))

            activity = lead.activity_log or []
            activity.append({
                "action": "Campaign email sent",
                "campaign": req.campaign_name,
                "template": req.template_id,
                "subject": subject,
                "to": lead.contact_email,
                "resend_id": result.get("id"),
                "at": now.isoformat(),
            })
            lead.activity_log = activity
            _auto_start_sequence(lead, req.campaign_name, db)
            sent += 1
        else:
            failed += 1
            errors.append({"lead": lead.provider_name, "error": result.get("error")})

    db.commit()

    return {
        "message": f"Campaign '{req.campaign_name}' complete",
        "sent": sent,
        "failed": failed,
        "total_eligible": len(leads),
        "template": req.template_id,
        "errors": errors[:10],
    }


@router.get("/leads/campaigns/send/preview")
async def preview_campaign_recipients(
    template_id: str,
    campaign_name: str = "preview",
    state: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    max_years: Optional[float] = None,
    exclude_already_emailed: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Preview how many leads a campaign would reach."""
    query = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
    )

    if state:
        query = query.filter(SalesLead.state == state.upper())
    if status:
        query = query.filter(SalesLead.status == status)
    if priority:
        query = query.filter(SalesLead.priority == priority)
    if max_years is not None:
        query = query.filter(SalesLead.years_in_operation <= max_years)
    if exclude_already_emailed:
        query = query.filter(SalesLead.email_send_count == 0)

    count = query.count()
    sample = query.limit(5).all()

    return {
        "total_recipients": count,
        "sample": [
            {
                "provider_name": l.provider_name,
                "city": l.city,
                "state": l.state,
                "contact_email": l.contact_email,
            }
            for l in sample
        ],
    }


@router.get("/leads/campaigns/list")
async def list_campaigns(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Get all unique campaign tags."""
    tags = db.query(SalesLead.campaign_tag).filter(
        SalesLead.campaign_tag.isnot(None)
    ).distinct().all()
    return [t[0] for t in tags if t[0]]


SEQUENCE_ORDER = ["warm_open", "pattern_interrupt", "aspiration", "proof_point", "graceful_exit"]
SEQUENCE_DAYS = {
    "warm_open": 0,
    "pattern_interrupt": 2,
    "aspiration": 6,
    "proof_point": 13,
    "graceful_exit": 27,
}


@router.post("/leads/campaigns/sequence/launch")
async def launch_email_sequence(
    req: SequenceLaunchRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Launch the full 5-email sequence for matching leads.

    Sends Email 1 (warm_open) immediately and schedules the remaining 4
    using the sequence_step / next_email_scheduled_at fields.
    """
    query = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
    )

    if req.state:
        query = query.filter(SalesLead.state == req.state.upper())
    if req.priority:
        query = query.filter(SalesLead.priority == req.priority)
    if req.max_years is not None:
        query = query.filter(SalesLead.years_in_operation <= req.max_years)
    if req.exclude_already_emailed:
        query = query.filter(
            SalesLead.sequence_step.is_(None) | (SalesLead.sequence_step == 0),
            SalesLead.email_send_count == 0,
        )

    leads = query.all()
    if not leads:
        raise HTTPException(status_code=400, detail="No eligible leads match the filters")

    now = datetime.now(timezone.utc)
    tmpl = EMAIL_TEMPLATES["warm_open"]
    sent = 0
    failed = 0

    for lead in leads:
        data = {
            "provider_name": lead.provider_name,
            "city": lead.city or "your area",
            "state": lead.state,
            "state_full": STATE_NAMES.get(lead.state, lead.state),
        }

        subject = _render_template(tmpl["subject"], data)
        body = _render_template(tmpl["body"], data)

        result = email_service.send_email(
            to=lead.contact_email,
            subject=subject,
            sender=email_service.from_sales,
            html=body,
        )

        if result.get("success"):
            lead.last_email_sent_at = now
            lead.last_email_subject = subject
            lead.email_send_count = (lead.email_send_count or 0) + 1
            lead.campaign_tag = req.campaign_name
            lead.sequence_step = 1
            lead.sequence_started_at = now
            lead.sequence_completed = False
            lead.last_template_sent = "warm_open"
            lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS["pattern_interrupt"])

            if lead.status == LeadStatus.new.value:
                lead.status = LeadStatus.email_sent.value
            if result.get("id"):
                lead.resend_email_id = result["id"]

            db.add(EmailCampaignEvent(
                lead_id=lead.id,
                template_id="warm_open",
                campaign_tag=req.campaign_name,
                event_type="sent",
                resend_email_id=result.get("id"),
                subject=subject,
                to_email=lead.contact_email,
                created_at=now,
            ))

            activity = lead.activity_log or []
            activity.append({
                "action": "Sequence started (Email 1/5)",
                "campaign": req.campaign_name,
                "template": "warm_open",
                "subject": subject,
                "at": now.isoformat(),
            })
            lead.activity_log = activity
            sent += 1
        else:
            failed += 1

    db.commit()

    return {
        "message": f"Sequence '{req.campaign_name}' launched",
        "sent": sent,
        "failed": failed,
        "total_eligible": len(leads),
        "next_batch": "pattern_interrupt in 2 days",
    }


@router.post("/leads/campaigns/sequence/process")
async def process_scheduled_emails(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Process all leads that have a scheduled next email due now or in the past.

    Call this endpoint periodically (cron, manual, or on-demand) to advance
    leads through the 5-email sequence.
    """
    now = datetime.now(timezone.utc)

    due = db.query(SalesLead).filter(
        SalesLead.next_email_scheduled_at.isnot(None),
        SalesLead.next_email_scheduled_at <= now,
        SalesLead.sequence_completed == False,
        SalesLead.status.notin_(["not_interested", "converted", "responded"]),
    ).all()

    sent = 0
    skipped = 0
    completed = 0

    for lead in due:
        step = lead.sequence_step or 1
        if step >= len(SEQUENCE_ORDER):
            lead.sequence_completed = True
            lead.next_email_scheduled_at = None
            completed += 1
            continue

        template_id = SEQUENCE_ORDER[step]
        tmpl = EMAIL_TEMPLATES.get(template_id)
        if not tmpl:
            skipped += 1
            continue

        data = {
            "provider_name": lead.provider_name,
            "city": lead.city or "your area",
            "state": lead.state,
            "state_full": STATE_NAMES.get(lead.state, lead.state),
        }

        subject = _render_template(tmpl["subject"], data)
        body = _render_template(tmpl["body"], data)

        result = email_service.send_email(
            to=lead.contact_email,
            subject=subject,
            sender=email_service.from_sales,
            html=body,
        )

        if result.get("success"):
            lead.last_email_sent_at = now
            lead.last_email_subject = subject
            lead.email_send_count = (lead.email_send_count or 0) + 1
            lead.sequence_step = step + 1
            lead.last_template_sent = template_id

            if result.get("id"):
                lead.resend_email_id = result["id"]

            next_step = step + 1
            if next_step < len(SEQUENCE_ORDER):
                next_template = SEQUENCE_ORDER[next_step]
                days_offset = SEQUENCE_DAYS[next_template]
                lead.next_email_scheduled_at = lead.sequence_started_at + timedelta(days=days_offset)
            else:
                lead.sequence_completed = True
                lead.next_email_scheduled_at = None
                completed += 1

            db.add(EmailCampaignEvent(
                lead_id=lead.id,
                template_id=template_id,
                campaign_tag=lead.campaign_tag,
                event_type="sent",
                resend_email_id=result.get("id"),
                subject=subject,
                to_email=lead.contact_email,
                created_at=now,
            ))

            activity = lead.activity_log or []
            activity.append({
                "action": f"Sequence email {step + 1}/5 sent",
                "template": template_id,
                "subject": subject,
                "at": now.isoformat(),
            })
            lead.activity_log = activity
            sent += 1
        else:
            skipped += 1

    db.commit()

    return {
        "processed": len(due),
        "sent": sent,
        "skipped": skipped,
        "sequences_completed": completed,
    }


@router.get("/leads/campaigns/sequence/status")
async def sequence_status(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Overview of all active sequences: how many leads at each step."""
    total_in_sequence = db.query(SalesLead).filter(
        SalesLead.sequence_step.isnot(None),
        SalesLead.sequence_step > 0,
    ).count()

    completed = db.query(SalesLead).filter(SalesLead.sequence_completed == True).count()

    step_counts = {}
    for i, tid in enumerate(SEQUENCE_ORDER):
        count = db.query(SalesLead).filter(
            SalesLead.sequence_step == i + 1,
            SalesLead.sequence_completed == False,
        ).count()
        step_counts[tid] = count

    pending_send = db.query(SalesLead).filter(
        SalesLead.next_email_scheduled_at.isnot(None),
        SalesLead.next_email_scheduled_at <= datetime.now(timezone.utc),
        SalesLead.sequence_completed == False,
    ).count()

    return {
        "total_in_sequence": total_in_sequence,
        "completed_sequences": completed,
        "pending_send_now": pending_send,
        "step_breakdown": step_counts,
    }


# =============================================================================
# CAMPAIGN ANALYTICS
# =============================================================================

@router.get("/leads/campaigns/analytics")
async def campaign_analytics(
    campaign_tag: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Per-template performance analytics with funnel data."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    query = db.query(EmailCampaignEvent).filter(EmailCampaignEvent.created_at >= since)
    if campaign_tag:
        query = query.filter(EmailCampaignEvent.campaign_tag == campaign_tag)

    events = query.all()

    templates_data = {}
    for tid in EMAIL_TEMPLATES:
        templates_data[tid] = {
            "template_id": tid,
            "name": EMAIL_TEMPLATES[tid]["name"],
            "sequence_day": EMAIL_TEMPLATES[tid].get("sequence_day", 0),
            "sent": 0,
            "delivered": 0,
            "opened": 0,
            "clicked": 0,
            "replied": 0,
            "bounced": 0,
            "complained": 0,
            "open_rate": 0,
            "click_rate": 0,
            "reply_rate": 0,
            "bounce_rate": 0,
        }

    for ev in events:
        tid = ev.template_id
        if tid not in templates_data:
            continue
        if ev.event_type in templates_data[tid]:
            templates_data[tid][ev.event_type] += 1

    for tid, d in templates_data.items():
        if d["sent"] > 0:
            d["open_rate"] = round(d["opened"] / d["sent"] * 100, 1)
            d["click_rate"] = round(d["clicked"] / d["sent"] * 100, 1)
            d["reply_rate"] = round(d["replied"] / d["sent"] * 100, 1)
            d["bounce_rate"] = round(d["bounced"] / d["sent"] * 100, 1)

    totals = {
        "total_sent": sum(d["sent"] for d in templates_data.values()),
        "total_delivered": sum(d["delivered"] for d in templates_data.values()),
        "total_opened": sum(d["opened"] for d in templates_data.values()),
        "total_clicked": sum(d["clicked"] for d in templates_data.values()),
        "total_replied": sum(d["replied"] for d in templates_data.values()),
        "total_bounced": sum(d["bounced"] for d in templates_data.values()),
    }
    if totals["total_sent"] > 0:
        totals["overall_open_rate"] = round(totals["total_opened"] / totals["total_sent"] * 100, 1)
        totals["overall_click_rate"] = round(totals["total_clicked"] / totals["total_sent"] * 100, 1)
        totals["overall_reply_rate"] = round(totals["total_replied"] / totals["total_sent"] * 100, 1)
    else:
        totals["overall_open_rate"] = 0
        totals["overall_click_rate"] = 0
        totals["overall_reply_rate"] = 0

    daily_sends = db.query(
        cast(EmailCampaignEvent.created_at, Date).label("day"),
        func.count().label("count"),
    ).filter(
        EmailCampaignEvent.event_type == "sent",
        EmailCampaignEvent.created_at >= since,
    ).group_by("day").order_by("day").all()

    daily_opens = db.query(
        cast(EmailCampaignEvent.created_at, Date).label("day"),
        func.count().label("count"),
    ).filter(
        EmailCampaignEvent.event_type == "opened",
        EmailCampaignEvent.created_at >= since,
    ).group_by("day").order_by("day").all()

    funnel = {
        "sent": totals["total_sent"],
        "delivered": totals["total_delivered"],
        "opened": totals["total_opened"],
        "clicked": totals["total_clicked"],
        "replied": totals["total_replied"],
        "meeting_scheduled": db.query(SalesLead).filter(
            SalesLead.status == "meeting_scheduled"
        ).count(),
        "converted": db.query(SalesLead).filter(
            SalesLead.status == "converted"
        ).count(),
    }

    return {
        "period_days": days,
        "totals": totals,
        "funnel": funnel,
        "per_template": list(templates_data.values()),
        "daily_sends": [{"date": str(d.day), "count": d.count} for d in daily_sends],
        "daily_opens": [{"date": str(d.day), "count": d.count} for d in daily_opens],
    }


@router.post("/leads/import-cms")
async def import_cms_data(
    req: ImportRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Pull home health agency data from CMS Provider Data API and import as leads.
    Uses pagination to pull ALL agencies (not just first 500).
    Optionally excludes government-operated agencies.
    Set all_states=true to import from all 50+ US states/territories."""
    CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query/6jpm-sxkc/0"
    GOVERNMENT_KEYWORDS = ["government", "state", "county", "federal", "va ", "veterans"]
    PAGE_SIZE = 500

    states_to_import = ALL_US_STATES if req.all_states else req.states

    imported = 0
    skipped = 0
    gov_skipped = 0

    for state in states_to_import:
        offset = 0
        while True:
            payload = json.dumps({
                "conditions": [{"property": "state", "value": state.upper(), "operator": "="}],
                "limit": PAGE_SIZE,
                "offset": offset,
                "keys": True,
            }).encode()

            try:
                request = urllib.request.Request(
                    CMS_API, data=payload, headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(request, timeout=60) as resp:
                    data = json.loads(resp.read())
            except Exception as e:
                logger.error(f"Failed to pull CMS data for {state} offset={offset}: {e}")
                break

            results = data.get("results", [])
            if not results:
                break

            for r in results:
                ccn = r.get("cms_certification_number_ccn")
                if not ccn:
                    continue

                ownership = (r.get("type_of_ownership") or "").strip().lower()
                if req.exclude_government and any(kw in ownership for kw in GOVERNMENT_KEYWORDS):
                    gov_skipped += 1
                    continue

                existing = db.query(SalesLead).filter(SalesLead.ccn == ccn).first()
                if existing:
                    skipped += 1
                    continue

                cert_date_str = r.get("certification_date", "")
                years_old = None
                if cert_date_str and cert_date_str != "-":
                    try:
                        from datetime import datetime as dt
                        cert_dt = dt.strptime(cert_date_str, "%m/%d/%Y")
                        years_old = round((dt.now() - cert_dt).days / 365.25, 1)
                    except Exception:
                        pass

                phone_raw = r.get("telephone_number", "")
                phone = None
                if phone_raw and phone_raw != "-":
                    phone_raw = phone_raw.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "")
                    if len(phone_raw) == 10:
                        phone = f"({phone_raw[:3]}) {phone_raw[3:6]}-{phone_raw[6:]}"
                    else:
                        phone = phone_raw

                priority = "high" if (years_old is not None and years_old <= 5) else (
                    "medium" if (years_old is not None and years_old <= 10) else "low"
                )

                lead = SalesLead(
                    provider_name=(r.get("provider_name") or "").strip().title(),
                    state=r.get("state", state),
                    city=(r.get("citytown") or "").strip().title(),
                    address=(r.get("address") or "").strip().title(),
                    zip_code=(r.get("zip_code") or "").strip(),
                    phone=phone,
                    ownership_type=(r.get("type_of_ownership") or "").strip().title() or None,
                    ccn=ccn,
                    certification_date=cert_date_str if cert_date_str != "-" else None,
                    years_in_operation=years_old,
                    star_rating=r.get("quality_of_patient_care_star_rating"),
                    offers_nursing=r.get("offers_nursing_care_services") == "Yes",
                    offers_pt=r.get("offers_physical_therapy_services") == "Yes",
                    offers_ot=r.get("offers_occupational_therapy_services") == "Yes",
                    offers_speech=r.get("offers_speech_pathology_services") == "Yes",
                    offers_social=r.get("offers_medical_social_services") == "Yes",
                    offers_aide=r.get("offers_home_health_aide_services") == "Yes",
                    priority=priority,
                    source="cms_provider_data",
                )
                db.add(lead)
                imported += 1

            if len(results) < PAGE_SIZE:
                break
            offset += PAGE_SIZE

            if offset >= req.limit_per_state:
                break

    db.commit()

    return {
        "message": f"Import complete: {imported} new, {skipped} duplicates, {gov_skipped} government agencies excluded",
        "imported": imported,
        "skipped": skipped,
        "government_excluded": gov_skipped,
        "states": states_to_import,
        "total_states": len(states_to_import),
    }


# =============================================================================
# CRUD (dynamic {lead_id} routes — MUST come after all static /leads/* routes)
# =============================================================================

@router.get("/leads/{lead_id}", response_model=LeadDetail)
async def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Get full detail for a single lead."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return LeadDetail(
        id=lead.id,
        provider_name=lead.provider_name,
        state=lead.state,
        city=lead.city,
        address=lead.address,
        zip_code=lead.zip_code,
        phone=lead.phone,
        ownership_type=lead.ownership_type,
        ccn=lead.ccn,
        certification_date=lead.certification_date,
        years_in_operation=lead.years_in_operation,
        star_rating=lead.star_rating,
        offers_nursing=lead.offers_nursing or False,
        offers_pt=lead.offers_pt or False,
        offers_ot=lead.offers_ot or False,
        offers_speech=lead.offers_speech or False,
        offers_social=lead.offers_social or False,
        offers_aide=lead.offers_aide or False,
        contact_name=lead.contact_name,
        contact_email=lead.contact_email,
        contact_title=lead.contact_title,
        website=lead.website,
        status=lead.status,
        priority=lead.priority,
        notes=lead.notes,
        last_email_sent_at=lead.last_email_sent_at,
        last_email_subject=lead.last_email_subject,
        email_send_count=lead.email_send_count or 0,
        email_open_count=lead.email_open_count or 0,
        last_email_opened_at=lead.last_email_opened_at,
        last_response_at=lead.last_response_at,
        campaign_tag=lead.campaign_tag,
        source=lead.source,
        is_contacted=lead.is_contacted or False,
        is_converted=lead.is_converted or False,
        converted_at=lead.converted_at,
        activity_log=lead.activity_log or [],
        created_at=lead.created_at,
        updated_at=lead.updated_at,
    )


@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: UUID,
    update: LeadUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Update lead fields."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = lead.activity_log or []

    for field, value in update.dict(exclude_unset=True).items():
        if value is not None:
            old_value = getattr(lead, field, None)
            setattr(lead, field, value)
            if old_value != value:
                activity.append({
                    "action": f"Updated {field}",
                    "old": str(old_value) if old_value else None,
                    "new": str(value),
                    "at": datetime.now(timezone.utc).isoformat(),
                })

    if update.is_contacted and not lead.is_contacted:
        lead.is_contacted = True

    lead.activity_log = activity
    db.commit()

    return {"message": "Lead updated", "id": str(lead.id)}


@router.put("/leads/bulk/status")
async def bulk_update_status(
    update: BulkStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Bulk update status for multiple leads."""
    updated = 0
    for lid in update.lead_ids:
        lead = db.query(SalesLead).filter(SalesLead.id == lid).first()
        if lead:
            lead.status = update.status
            activity = lead.activity_log or []
            activity.append({
                "action": f"Bulk status update to {update.status}",
                "at": datetime.now(timezone.utc).isoformat(),
            })
            lead.activity_log = activity
            updated += 1
    db.commit()
    return {"message": f"Updated {updated} leads"}


class BulkEmailUpdate(BaseModel):
    """Batch update contact emails for leads matched by provider_name."""
    updates: List[dict]  # [{"provider_name": "...", "contact_email": "...", "website": "..."}]


@router.post("/leads/bulk/update-emails")
async def bulk_update_emails(
    data: BulkEmailUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Batch update contact_email and website for leads by provider_name matching."""
    updated = 0
    not_found = 0
    for entry in data.updates:
        name = entry.get("provider_name", "")
        email = entry.get("contact_email", "")
        website = entry.get("website", "")
        if not name or not email:
            continue
        lead = db.query(SalesLead).filter(
            SalesLead.provider_name.ilike(f"%{name}%")
        ).first()
        if lead:
            if email and not lead.contact_email:
                lead.contact_email = email
            if website and not lead.website:
                lead.website = website
            activity = lead.activity_log or []
            activity.append({
                "action": "Bulk email update",
                "email": email,
                "at": datetime.now(timezone.utc).isoformat(),
            })
            lead.activity_log = activity
            updated += 1
        else:
            not_found += 1
    db.commit()
    return {"updated": updated, "not_found": not_found}


class BulkImportEntry(BaseModel):
    provider_name: str
    state: str
    city: Optional[str] = None
    contact_email: str
    website: Optional[str] = None
    phone: Optional[str] = None
    ownership_type: Optional[str] = None


class BulkImportRequest(BaseModel):
    leads: List[BulkImportEntry]


@router.post("/leads/bulk/import-with-email")
async def bulk_import_with_email(
    data: BulkImportRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Bulk import agencies that already have verified emails. Skips duplicates by name+state."""
    imported = 0
    skipped = 0
    for entry in data.leads:
        if not entry.contact_email:
            continue
        existing = db.query(SalesLead).filter(
            SalesLead.provider_name.ilike(f"%{entry.provider_name}%"),
            SalesLead.state == entry.state.upper(),
        ).first()
        if existing:
            if not existing.contact_email and entry.contact_email:
                existing.contact_email = entry.contact_email
                if entry.website and not existing.website:
                    existing.website = entry.website
                imported += 1
            else:
                skipped += 1
            continue
        lead = SalesLead(
            provider_name=entry.provider_name.strip().title(),
            state=entry.state.upper(),
            city=(entry.city or "").strip().title() or None,
            contact_email=entry.contact_email.strip(),
            website=entry.website,
            phone=entry.phone,
            ownership_type=entry.ownership_type,
            priority="medium",
            source="web_research",
        )
        db.add(lead)
        imported += 1
    db.commit()
    return {"imported": imported, "skipped": skipped}


@router.delete("/leads/cleanup-no-email")
async def cleanup_no_email(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Remove all leads that don't have a contact email."""
    no_email = db.query(SalesLead).filter(
        or_(SalesLead.contact_email.is_(None), SalesLead.contact_email == "")
    ).all()
    count = len(no_email)
    for lead in no_email:
        db.delete(lead)
    db.commit()
    return {"deleted": count, "message": f"Removed {count} leads without email addresses"}


@router.post("/leads/seed-agencies")
async def seed_agency_leads(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Seed 163 home care agencies with verified emails across 48 US states."""
    agencies = _get_seed_agencies()
    imported = 0
    skipped = 0
    for a in agencies:
        existing = db.query(SalesLead).filter(
            SalesLead.contact_email == a["contact_email"]
        ).first()
        if existing:
            skipped += 1
            continue
        lead = SalesLead(
            provider_name=a["provider_name"],
            state=a["state"],
            city=a.get("city"),
            contact_email=a["contact_email"],
            website=a.get("website"),
            phone=a.get("phone"),
            priority="medium",
            source="web_research",
        )
        db.add(lead)
        imported += 1
    db.commit()
    return {"imported": imported, "skipped": skipped, "message": f"Added {imported} agencies, {skipped} duplicates skipped"}


def _get_seed_agencies() -> list:
    """163 home care agencies with verified emails across 48 US states."""
    return [
        {"provider_name": "Caring Homecare", "state": "NY", "city": "Ozone Park", "contact_email": "info@caringhcny.com", "website": "https://caringhcny.org", "phone": "718-822-7464"},
        {"provider_name": "HumanCare NY", "state": "NY", "city": "Brooklyn", "contact_email": "info@humancareny.com", "website": "https://www.humancareny.com", "phone": "718-435-1100"},
        {"provider_name": "New York Health Care (NYHC)", "state": "NY", "city": "Jamaica", "contact_email": "info@nyhc.com", "website": "https://nyhc.com", "phone": "855-446-3300"},
        {"provider_name": "24/7 HomeCare Agency of NY", "state": "NY", "city": "Brooklyn", "contact_email": "info@247nyhomecare.com", "website": "https://247nyhomecare.com", "phone": "718-887-0782"},
        {"provider_name": "Always Home Care", "state": "NY", "city": "Brooklyn", "contact_email": "info@alwaysny.com", "website": "https://www.alwayshc.com", "phone": "718-843-8430"},
        {"provider_name": "Aurora Home Care Inc.", "state": "NY", "city": "Williamsville", "contact_email": "info@aurorahomecare.com", "website": "https://aurorahomecare.com", "phone": "716-833-9000"},
        {"provider_name": "Buffalo Homecare Inc.", "state": "NY", "city": "Buffalo", "contact_email": "info@homecarebuffalo.com", "website": "https://homecarebuffalo.com", "phone": "716-322-2780"},
        {"provider_name": "Elder Care Homecare", "state": "NY", "city": "Scarsdale", "contact_email": "help@eldercarehc.com", "website": "https://eldercarehomecare.com", "phone": "914-895-5539"},
        {"provider_name": "Recco Home Care Service", "state": "NY", "city": "Amityville", "contact_email": "info@reccohomecare.com", "website": "https://www.reccohomecare.com", "phone": "516-798-6688"},
        {"provider_name": "Perfect Home Care Corp", "state": "NJ", "city": "Bayonne", "contact_email": "perfecthomecarecorp@gmail.com", "website": "https://perfecthomecarecorp.net", "phone": "201-455-5100"},
        {"provider_name": "NJ First Home Health Care", "state": "NJ", "city": "Fort Lee", "contact_email": "info@njfirsthomecare.com", "website": "https://njfirsthomecare.com", "phone": "201-992-5000"},
        {"provider_name": "Caring Nursing Services", "state": "NJ", "city": "Hackensack", "contact_email": "info@caringnursingservices.com", "website": "https://www.caringnursingservices.com", "phone": "888-290-0791"},
        {"provider_name": "Care for Less Homecare", "state": "NJ", "city": "Newark", "contact_email": "info@careforlesshc.com", "website": "https://careforlesshc.com", "phone": "973-561-8777"},
        {"provider_name": "Cherry Hill Homecare", "state": "NJ", "city": "Cherry Hill", "contact_email": "info@cherryhilinc.com", "website": "https://www.cherryhillhc.com", "phone": "856-688-5209"},
        {"provider_name": "Advanced Care Services", "state": "NJ", "city": "Hackensack", "contact_email": "info@advancedcsnj.com", "website": "https://www.advancedcsnj.com", "phone": "201-682-2486"},
        {"provider_name": "Executive Home Care Morristown", "state": "NJ", "city": "Morristown", "contact_email": "morristown@executivehomecare.com", "website": "https://executivehomecare.com/morristown", "phone": "973-705-6400"},
        {"provider_name": "Royal Destiny Home Care Agency", "state": "NJ", "city": "Edison", "contact_email": "info@royaldestinyhomecareagency.com", "website": "https://www.royaldestinyhomecareagency.com", "phone": "877-225-6630"},
        {"provider_name": "Penn Home Care", "state": "PA", "city": "Harrisburg", "contact_email": "info@pennhomecare.net", "website": "https://www.pennhomecare.net", "phone": "717-857-4371"},
        {"provider_name": "CareSense Home Health Care", "state": "PA", "city": "Newtown", "contact_email": "info@caresensehc.com", "website": "https://www.caresensehc.com", "phone": "888-444-8157"},
        {"provider_name": "Quality Life Healthcare", "state": "PA", "city": "Philadelphia", "contact_email": "admin@qualitylifehc.com", "website": "https://www.qualitylifehc.com", "phone": "215-516-5945"},
        {"provider_name": "Pennsylvania Hope Home Health Care Agency", "state": "PA", "city": "Philadelphia", "contact_email": "contact@pennsylvaniahope.com", "phone": "484-461-2200"},
        {"provider_name": "Continuum Home Health", "state": "CT", "city": "New Haven", "contact_email": "info@continuumhomehealth.com", "website": "https://www.continuumhomehealth.org", "phone": "203-782-3192"},
        {"provider_name": "AJ Homecare", "state": "CT", "city": "Bridgeport", "contact_email": "janv26@ajhomecarect.com", "website": "https://www.ajhomecarect.com", "phone": "203-886-4780"},
        {"provider_name": "Abby Homecare Solutions LLC", "state": "MA", "city": "Worcester", "contact_email": "info@abbyhomecaresolutions.com", "website": "https://abbyhomecaresolutions.com", "phone": "508-796-9103"},
        {"provider_name": "Brockton Home Health Care Agency", "state": "MA", "city": "Brockton", "contact_email": "referrals@brocktonhhca.com", "website": "https://www.brocktonhha.com", "phone": "508-219-0101"},
        {"provider_name": "Longevity Home Health", "state": "MD", "city": "Baltimore", "contact_email": "info@longevityhh.com", "website": "https://www.longevityhh.com", "phone": "240-389-5291"},
        {"provider_name": "Greater Baltimore Homecare LLC", "state": "MD", "city": "Nottingham", "contact_email": "admin@gbhcares.com", "website": "https://greaterbaltimorehomecare.com", "phone": "410-646-8627"},
        {"provider_name": "Mercy Care Providers", "state": "MD", "city": "Columbia", "contact_email": "support@mercycareprovider.com", "website": "https://mercycareprovider.com", "phone": "410-309-7052"},
        {"provider_name": "GentleCare Services", "state": "MD", "city": "Silver Spring", "contact_email": "info@gentlecareservicesmd.com", "website": "https://www.gentlecareservicesmd.com", "phone": "301-841-8558"},
        {"provider_name": "Ultimate Touch Healthcare Solutions", "state": "MD", "city": "Silver Spring", "contact_email": "inquiries@ultimatetouchhs.com", "website": "https://www.ultimatetouchhs.com", "phone": "301-332-2501"},
        {"provider_name": "Goodwin Home Care", "state": "VA", "city": "Alexandria", "contact_email": "homecare@goodwinliving.org", "website": "https://goodwinhomecare.org", "phone": "703-578-7632"},
        {"provider_name": "Life's at Home Care", "state": "VA", "city": "Richmond", "contact_email": "services@lifesathomecare.com", "website": "https://lifesathomecare.com", "phone": "804-396-6000"},
        {"provider_name": "Ombi Home Care Services LLC", "state": "VA", "city": "Roanoke", "contact_email": "info@ombihomecareservices.com", "website": "https://ombihomecareservices.com", "phone": "540-206-2543"},
        {"provider_name": "Quality Health Services LLC", "state": "VA", "city": "Woodbridge", "contact_email": "info@qhscares.com", "website": "https://qhscares.com", "phone": "703-910-7081"},
        {"provider_name": "Human Touch Home Health Care", "state": "VA", "city": "Falls Church", "contact_email": "info@humantouchhealth.com", "website": "https://www.humantouchhealth.com", "phone": "703-531-0540"},
        {"provider_name": "All Florida Home Health Services", "state": "FL", "city": "Miami", "contact_email": "info@allfloridahhs.com", "website": "https://allfloridahomehealth.com", "phone": "305-263-9992"},
        {"provider_name": "Elite Home Health", "state": "FL", "city": "West Palm Beach", "contact_email": "info@elitehomehealth.org", "website": "https://www.elitehomehealth.org", "phone": "888-422-3548"},
        {"provider_name": "Sarasota Home Health Care Agency", "state": "FL", "city": "Sarasota", "contact_email": "info@shhca.com", "phone": "941-306-4347"},
        {"provider_name": "Beacon Home Care FL", "state": "FL", "city": "Sarasota", "contact_email": "info@beacon4care.com", "website": "https://www.beacon4care.com", "phone": "941-282-7965"},
        {"provider_name": "ProHealth Home Health Services", "state": "FL", "city": "St. Petersburg", "contact_email": "prohealth@prohealthhomehealth.com", "website": "https://www.prohealthhomehealth.com", "phone": "727-202-6820"},
        {"provider_name": "World of Love Home Care", "state": "GA", "city": "Atlanta", "contact_email": "info@worldoflovehomecare.com", "website": "https://www.worldoflovehomecare.com", "phone": "800-532-2320"},
        {"provider_name": "MoLove Home Health", "state": "GA", "city": "Atlanta", "contact_email": "info@molovehomehealthagency.com", "website": "https://www.molovehomehealth.com", "phone": "470-999-9195"},
        {"provider_name": "WrightChoice Healthcare Services", "state": "GA", "city": "Atlanta", "contact_email": "info@wrightchoicehealth.com", "website": "https://wrightchoicehs.com", "phone": "678-212-5750"},
        {"provider_name": "A One Home Care Inc.", "state": "GA", "city": "Roswell", "contact_email": "help@aonehomecare.org", "website": "https://www.aonehomecare.org", "phone": "404-422-7847"},
        {"provider_name": "American Homecare Carolina", "state": "NC", "city": "Charlotte", "contact_email": "info@americanhomecarecarolina.org", "website": "https://americanhomecarecarolina.org", "phone": "980-300-8550"},
        {"provider_name": "Carolina Home Healthcare", "state": "NC", "city": "Charlotte", "contact_email": "info@carolinahomehealthcare.com", "website": "https://carolinahomehealthcare.com", "phone": "704-548-8949"},
        {"provider_name": "A Plus Quality Home Care", "state": "NC", "city": "Durham", "contact_email": "info@aplusqualitync.com", "website": "https://www.aplusqualitync.com", "phone": "888-307-5665"},
        {"provider_name": "Journey Homecare Services", "state": "NC", "city": "Greensboro", "contact_email": "info@journeyhomecare.com", "website": "https://journeyhomecare.com", "phone": "336-662-5396"},
        {"provider_name": "Elite Home Care SC", "state": "SC", "city": "Greenville", "contact_email": "info@elitehomecaresc.com", "website": "https://www.elitehomecaresc.com", "phone": "864-869-8730"},
        {"provider_name": "Already Home Care", "state": "SC", "city": "Charleston", "contact_email": "info@alreadyhomecare.com", "website": "https://www.alreadyhomecare.com", "phone": "843-371-1419"},
        {"provider_name": "Integrity Home Care SC", "state": "SC", "city": "Columbia", "contact_email": "info@integrityhomecareofsc.com", "website": "https://integrityhomecareofsc.com", "phone": "803-395-0151"},
        {"provider_name": "Oakwell Home Health Services", "state": "TX", "city": "Houston", "contact_email": "info@oakwellhomehealth.com", "website": "https://www.oakwellhomehealth.com", "phone": "346-803-0568"},
        {"provider_name": "A Nurse Angels Home Health", "state": "TX", "city": "Arlington", "contact_email": "info@anurseangelshomehealth.com", "website": "https://www.anurseangelshomehealth.com", "phone": "817-522-1066"},
        {"provider_name": "Express Home Care TX", "state": "TX", "city": "Dallas", "contact_email": "info@Expresshomecare.com", "website": "https://www.expresshomecareservices.com", "phone": "469-792-8301"},
        {"provider_name": "AccentCare Home Health", "state": "TX", "city": "San Antonio", "contact_email": "info@accentcare.com", "website": "https://www.accentcare.com", "phone": "210-349-7355"},
        {"provider_name": "Oceanside Home Health Services", "state": "CA", "city": "Los Angeles", "contact_email": "customerservice@oshhs.com", "website": "https://www.oshhs.com", "phone": "323-934-5050"},
        {"provider_name": "At Home Nursing Care", "state": "CA", "city": "Encinitas", "contact_email": "contact@athomenursingcare.com", "website": "https://athomenursingcare.com", "phone": "760-965-7223"},
        {"provider_name": "Care First Home Health CA", "state": "CA", "city": "San Leandro", "contact_email": "info@CareFirsthh.com", "website": "https://www.carefirsthh.com", "phone": "510-878-9288"},
        {"provider_name": "Beacon Homecare CA", "state": "CA", "city": "San Francisco", "contact_email": "info@beaconhomecare.com", "website": "https://beaconhomecare.com", "phone": "888-973-7748"},
        {"provider_name": "HealthNow Home Healthcare", "state": "CA", "city": "Hayward", "contact_email": "contact@healthnowca.com", "website": "https://healthnowca.com", "phone": "888-808-5226"},
        {"provider_name": "Kay's Angel Care Inc.", "state": "IL", "city": "Evanston", "contact_email": "info@kaysangelcare.com", "website": "https://www.kaysangelcare.com", "phone": "847-868-8464"},
        {"provider_name": "Northwest Home Health & Rehab", "state": "IL", "city": "Lake in the Hills", "contact_email": "info@nwhomehealthrehab.com", "website": "https://www.nwhomehealthrehab.com", "phone": "847-854-0186"},
        {"provider_name": "Northshore Home Health Care", "state": "IL", "city": "Bloomingdale", "contact_email": "contact@northshorehomehealth.com", "website": "https://northshorehomehealth.com", "phone": "847-490-1112"},
        {"provider_name": "Care Ohio Health Services", "state": "OH", "city": "Euclid", "contact_email": "info@careohiohealthservices.org", "website": "https://careohiohealthservices.org", "phone": "216-482-1635"},
        {"provider_name": "Cleveland Home Care", "state": "OH", "city": "Cleveland", "contact_email": "ruth@clevelandhomecare.org", "website": "https://clevelandhomecare.org", "phone": "440-669-8121"},
        {"provider_name": "Gloriage Home Care Agency", "state": "OH", "city": "Columbus", "contact_email": "gloriak@gloriagehomecare.com", "website": "https://www.gloriagehomecare.com", "phone": "614-270-0375"},
        {"provider_name": "Evolution Home Care", "state": "OH", "city": "Gahanna", "contact_email": "referralcol@evolutionhomecare.com", "website": "https://www.evolutionhomecare.com", "phone": "614-502-1900"},
        {"provider_name": "Momba Home Care", "state": "OH", "city": "Cincinnati", "contact_email": "info@mombaoh.com", "website": "https://mombahc.com", "phone": "513-776-9840"},
        {"provider_name": "Care First Home Health MI", "state": "MI", "city": "Warren", "contact_email": "response@carefirsthomehealth.com", "website": "https://carefirsthomehealth.com", "phone": "248-413-2680"},
        {"provider_name": "Bloom Homecare", "state": "MI", "city": "West Bloomfield", "contact_email": "admin@bloomhc.com", "phone": "248-278-8277"},
        {"provider_name": "Indy In-Home Care", "state": "IN", "city": "Indianapolis", "contact_email": "info@indyinhomecare.com", "website": "https://indyinhomecare.com", "phone": "317-933-6855"},
        {"provider_name": "Passion to Care Indiana", "state": "IN", "city": "Indianapolis", "contact_email": "indiana@passiontocarehc.com", "website": "https://passiontocarehc.com", "phone": "317-537-1811"},
        {"provider_name": "Above & Beyond Home Care IN", "state": "IN", "city": "Anderson", "contact_email": "info@homecareindiana.com", "website": "https://homecareindiana.com", "phone": "877-622-7999"},
        {"provider_name": "Wayne Home Care", "state": "IN", "city": "Fort Wayne", "contact_email": "info@waynehomecare.com", "website": "https://waynehomecare.com", "phone": "260-445-7752"},
        {"provider_name": "Greater Wisconsin Home Care", "state": "WI", "city": "Madison", "contact_email": "admin@greaterwisconsinhomecare.com", "website": "https://greaterwisconsinhomecare.com", "phone": "608-572-2560"},
        {"provider_name": "Comfort At Home Healthcare", "state": "WI", "city": "Milwaukee", "contact_email": "comfort@cahhealthcare.com", "website": "https://cahhealthcare.com", "phone": "414-882-7925"},
        {"provider_name": "Umana Home Care", "state": "WI", "city": "West Allis", "contact_email": "info@umanahomecare.com", "website": "https://www.umanahomecare.com", "phone": "414-797-3707"},
        {"provider_name": "Axis Home Health Care", "state": "MN", "city": "Minneapolis", "contact_email": "admin@axishomeshc.com", "website": "https://www.axishomeshc.com", "phone": "763-657-1603"},
        {"provider_name": "Premier Home Health Care MN", "state": "MN", "city": "Minneapolis", "contact_email": "info@premiermn.com", "website": "https://www.premiermn.com", "phone": "612-208-1839"},
        {"provider_name": "Centric Healthcare", "state": "MN", "city": "Rochester", "contact_email": "info@centrichealthcare.org", "website": "https://centrichealthcare.org", "phone": "507-205-7322"},
        {"provider_name": "DELUX Home Health Care", "state": "MO", "city": "Kansas City", "contact_email": "info@DeluxHomeHealthCare.com", "website": "https://www.deluxhomehealthcare.com", "phone": "816-298-5655"},
        {"provider_name": "All About Care LLC", "state": "MO", "city": "Saint Louis", "contact_email": "Info@aacarellc.com", "website": "https://www.allaboutcare.co", "phone": "314-238-7320"},
        {"provider_name": "Tennessee Home Care Partners", "state": "TN", "city": "Bartlett", "contact_email": "info@tn-hcp.com", "website": "https://www.tn-hcp.com", "phone": "901-428-2905"},
        {"provider_name": "Loving Home Care LLC TN", "state": "TN", "city": "Nashville", "contact_email": "care@lovinghomecare.org", "website": "https://www.lovinghomecare.org", "phone": "615-301-8507"},
        {"provider_name": "Starcare of Tennessee", "state": "TN", "city": "Nashville", "contact_email": "support@starcareinc.org", "website": "https://www.starcareinc.org", "phone": "615-885-3070"},
        {"provider_name": "CareFirst Home Care AL", "state": "AL", "city": "Birmingham", "contact_email": "Inquiry@carefirsthomecareservices.com", "website": "https://carefirsthcs.com", "phone": "205-445-0705"},
        {"provider_name": "Brooks Home Health Care", "state": "AL", "city": "Huntsville", "contact_email": "brookshomehealthcare@yahoo.com", "website": "https://www.brookshomehealthcare.net", "phone": "256-469-6659"},
        {"provider_name": "Alternative Home Care Specialists", "state": "LA", "city": "Lafayette", "contact_email": "info@AltHomeCare.com", "website": "https://althomecare.com", "phone": "337-233-0545"},
        {"provider_name": "Homecare of Louisiana", "state": "LA", "city": "Baton Rouge", "contact_email": "info@homecarelouisiana.com", "website": "https://homecarelouisiana.com", "phone": "225-256-7804"},
        {"provider_name": "Professional Home Health Care Agency", "state": "KY", "city": "London", "contact_email": "info@phhca.com", "website": "https://phhca.com", "phone": "606-864-0724"},
        {"provider_name": "Caring Excellence", "state": "KY", "city": "Louisville", "contact_email": "info@caringexcellenceathome.com", "website": "https://caringexcellenceathome.com", "phone": "502-208-9424"},
        {"provider_name": "Transitions Home Health Services", "state": "WA", "city": "Seattle", "contact_email": "info@transitionshhs.com", "website": "https://transitionshomehealthservices.com", "phone": "206-737-1170"},
        {"provider_name": "Columbia River Home Health", "state": "WA", "city": "Kennewick", "contact_email": "info@ColumbiaRiverHH.com", "website": "https://columbiariverhh.com", "phone": "509-591-4459"},
        {"provider_name": "Chinook Home Health Care", "state": "WA", "city": "Kennewick", "contact_email": "info@chinookhomehealthcare.com", "website": "https://www.chinookhomehealthcare.com", "phone": "509-491-3821"},
        {"provider_name": "Mountainview Home Health", "state": "WA", "city": "Yakima", "contact_email": "jray@mountainviewhh.org", "website": "https://mountainviewhomehealth.org", "phone": "509-576-0800"},
        {"provider_name": "Nightingale Home Health OR", "state": "OR", "city": "Portland", "contact_email": "info@nightingaleoregon.com", "website": "https://www.nightingaleoregon.com", "phone": "503-444-7605"},
        {"provider_name": "At Ease Home Care", "state": "OR", "city": "Eugene", "contact_email": "info@ateasehomecare.com", "phone": "541-344-3273"},
        {"provider_name": "At Home Care Group", "state": "OR", "city": "Bend", "contact_email": "edbend@athomecareonyx.com", "website": "https://www.athomecg.com", "phone": "458-292-5010"},
        {"provider_name": "Colorado CareAssist", "state": "CO", "city": "Colorado Springs", "contact_email": "care@coloradocareassist.com", "website": "https://coloradocareassist.com", "phone": "719-428-3999"},
        {"provider_name": "Voyager Home Health Care", "state": "CO", "city": "Colorado Springs", "contact_email": "Support@voyagerhomehealth.com", "website": "https://voyagerhomehealthcare.com", "phone": "719-400-2222"},
        {"provider_name": "Arizona In Home Care Givers", "state": "AZ", "city": "Phoenix", "contact_email": "info@arizonainhomecaregivers.com", "website": "https://arizonainhomecaregivers.com", "phone": "520-353-3309"},
        {"provider_name": "MD Home Health AZ", "state": "AZ", "city": "Phoenix", "contact_email": "info@mdhomehealth.com", "website": "https://mdhomehealth.com", "phone": "602-266-9971"},
        {"provider_name": "Creek View Home Health", "state": "AZ", "city": "Phoenix", "contact_email": "admin@creekviewaz.com", "website": "https://www.creekviewaz.com", "phone": "602-603-5161"},
        {"provider_name": "Home Sweet Homecare AZ", "state": "AZ", "city": "Tempe", "contact_email": "info@homesweethomecare.com", "website": "https://homesweethomecare.com", "phone": "480-459-4457"},
        {"provider_name": "Consumer Direct Care Network NV", "state": "NV", "city": "Las Vegas", "contact_email": "InfoCDNV@ConsumerDirectCare.com", "website": "https://consumerdirectnv.com", "phone": "877-786-4999"},
        {"provider_name": "Las Vegas Home Healthcare", "state": "NV", "city": "Las Vegas", "contact_email": "customerservice@lvhha.com", "website": "https://lasvegashomehealthcareinc.com", "phone": "702-405-9200"},
        {"provider_name": "Silver Star Homecare", "state": "NV", "city": "Las Vegas", "contact_email": "info@silverstarhomecare.com", "website": "https://silverstarhomecare.com", "phone": "702-406-4976"},
        {"provider_name": "Stonebridge Home Care", "state": "UT", "city": "Orem", "contact_email": "scheduling@stonebridgesouth.com", "website": "https://stonebridgehc.com", "phone": "801-377-2760"},
        {"provider_name": "In Home Care Utah", "state": "UT", "city": "Ogden", "contact_email": "Info@InHomeCareUt.com", "website": "https://www.inhomecareut.com", "phone": "801-510-9670"},
        {"provider_name": "Ability Home Health & Hospice", "state": "UT", "city": "South Jordan", "contact_email": "care@abilityhhh.com", "website": "https://abilityhhh.com", "phone": "385-287-1311"},
        {"provider_name": "NextDoor HomeCare", "state": "NM", "city": "Albuquerque", "contact_email": "info@nextdoorhomecare.com", "website": "https://nextdoorhomecare.com", "phone": "505-226-6946"},
        {"provider_name": "Matrix Home Care Services NM", "state": "NM", "city": "Las Cruces", "contact_email": "health@matrixnm.com", "website": "https://matrixnm.com", "phone": "575-525-8755"},
        {"provider_name": "Family Care Home Health OK", "state": "OK", "city": "Edmond", "contact_email": "familycarehealth@aol.com", "website": "https://www.familycarehh.com", "phone": "405-842-5656"},
        {"provider_name": "CompleteOK Home Health & Hospice", "state": "OK", "city": "Oklahoma City", "contact_email": "intake@completeok.com", "website": "https://www.completeok.com", "phone": "405-879-3470"},
        {"provider_name": "Golden Age Health Inc", "state": "OK", "city": "Oklahoma City", "contact_email": "info@goldenagehealth.com", "website": "https://www.goldenagehealth.com", "phone": "405-692-1255"},
        {"provider_name": "Hearts at Home In-Home Care", "state": "KS", "city": "Overland Park", "contact_email": "info@heartsathomeusa.com", "website": "https://www.heartsathomeusa.com", "phone": "913-440-4209"},
        {"provider_name": "Home Health Care Agency of Arkansas", "state": "AR", "city": "Little Rock", "contact_email": "hhc@homehealthcareagencyark.com", "website": "https://www.hhcaoa.net", "phone": "501-553-1953"},
        {"provider_name": "Baptist Health Home Health Network", "state": "AR", "city": "Little Rock", "contact_email": "homecare@baptist-health.org", "website": "https://www.baptisthealthathome.org", "phone": "501-202-7480"},
        {"provider_name": "Delta HomeCare", "state": "MS", "city": "Jackson", "contact_email": "ClientCare@DeltaHomeCare.com", "website": "https://deltahomecare.com", "phone": "888-455-4370"},
        {"provider_name": "All Islands Homecare", "state": "HI", "city": "Honolulu", "contact_email": "hawaii.aih@gmail.com", "website": "https://www.allislandshomecare.com", "phone": "808-270-5087"},
        {"provider_name": "Kokua Care", "state": "HI", "city": "Honolulu", "contact_email": "info@kokuacare.com", "website": "https://kokuacare.com", "phone": "808-734-5555"},
        {"provider_name": "Idaho In Home Care", "state": "ID", "city": "Ammon", "contact_email": "idahoinhomecare@gmail.com", "website": "https://www.idahoinhomecare.com", "phone": "208-881-4821"},
        {"provider_name": "Comfort Home Care ID", "state": "ID", "city": "Pocatello", "contact_email": "info@comforthomecare.org", "website": "https://www.comforthomecare.org", "phone": "208-684-1378"},
        {"provider_name": "HomeCare Montana", "state": "MT", "city": "Belgrade", "contact_email": "Info@HomeCareMontana.org", "website": "https://www.homecaremontana.org", "phone": "888-989-3111"},
        {"provider_name": "Big Sky Home Health", "state": "MT", "city": "Bozeman", "contact_email": "info@bigskyhhh.com", "website": "https://bigskyhhh.com", "phone": "406-551-2273"},
        {"provider_name": "Wyoming Home Health", "state": "WY", "city": "Casper", "contact_email": "info@wyominghomehealth.org", "website": "https://www.wyominghomehealth.org", "phone": "307-333-4574"},
        {"provider_name": "Extended Life Home Care", "state": "ND", "city": "Fargo", "contact_email": "Extendedlifehc@aol.com", "website": "https://www.extendedlifehomecare.info", "phone": "701-751-3363"},
        {"provider_name": "Glorious Homecare Solutions", "state": "ND", "city": "Bismarck", "contact_email": "info@glorioushomecare.org", "website": "https://glorioushomecare.com", "phone": "701-699-6922"},
        {"provider_name": "Kore Cares", "state": "SD", "city": "Sioux Falls", "contact_email": "info@korecares.com", "website": "https://www.korecares.com", "phone": "605-275-2344"},
        {"provider_name": "Eli Home Care LLC", "state": "SD", "city": "Sioux Falls", "contact_email": "info@elihomecare.com", "website": "https://www.elihomecare.com", "phone": "605-323-9002"},
        {"provider_name": "Compassionate Angels Home Care", "state": "DE", "city": "Newark", "contact_email": "info@compassionateangelshc.com", "website": "https://compassionateangelshc.com", "phone": "302-722-6688"},
        {"provider_name": "Haven Home Care DE", "state": "DE", "city": "Wilmington", "contact_email": "info@havencaredelaware.com", "website": "https://havencaredelaware.com", "phone": "302-688-9134"},
        {"provider_name": "We Care Home Care of Delaware", "state": "DE", "city": "Wilmington", "contact_email": "info@wecarede.com", "website": "https://wecarede.com", "phone": "302-663-1125"},
        {"provider_name": "Neighborly Home Care DE", "state": "DE", "city": "Wilmington", "contact_email": "info@neighborlyhomecare.com", "website": "https://www.neighborlyhomecare.com", "phone": "302-650-5699"},
        {"provider_name": "Rhode Island Partnership for Home Care", "state": "RI", "city": "Warwick", "contact_email": "office@riphc.org", "website": "https://riphc.org", "phone": "401-351-1010"},
        {"provider_name": "Age at Home NH", "state": "NH", "city": "Concord", "contact_email": "info@ageathomenh.com", "website": "https://www.ageathomenh.com", "phone": "603-224-6100"},
        {"provider_name": "Timberland Home Care", "state": "NH", "city": "Conway", "contact_email": "caregivers@timberlandhomecare.com", "website": "https://www.timberlandhomecare.com", "phone": "603-447-3998"},
        {"provider_name": "Hands At Home Care Services", "state": "VT", "city": "Waitsfield", "contact_email": "info@HandsAtHomeCS.com", "website": "https://handsathomecareservices.com", "phone": "802-496-2600"},
        {"provider_name": "Maine Home Care", "state": "ME", "city": "Lincoln", "contact_email": "info@maineinhomecare.com", "website": "https://www.maineinhomecare.com", "phone": "207-746-0039"},
        {"provider_name": "SavePlus Home Care", "state": "ME", "city": "Portland", "contact_email": "Info@saveplushomecare.com", "website": "https://www.saveplushomecare.com", "phone": "207-550-2021"},
        {"provider_name": "A Epiphany Home Health Care", "state": "WV", "city": "Martinsburg", "contact_email": "info@a-epiphany.com", "website": "https://a-epiphany.com", "phone": "304-513-2426"},
        {"provider_name": "Berhan Home Health Care Agency", "state": "DC", "city": "Washington", "contact_email": "berhan@berhan-hhca.com", "website": "https://www.berhan-hhca.com", "phone": "202-723-1100"},
        {"provider_name": "Regal Home Care DC", "state": "DC", "city": "Washington", "contact_email": "Regal@regalhomecare.net", "website": "https://www.regalhomecare.net", "phone": "202-506-4750"},
        {"provider_name": "Philia Care DC", "state": "DC", "city": "Washington", "contact_email": "info@philia-care.com", "website": "https://www.philia-care.com", "phone": "202-607-2525"},
        {"provider_name": "Goshen Care Services DC", "state": "DC", "city": "Washington", "contact_email": "info@goshencares.com", "website": "https://www.goshencares.com", "phone": "202-545-7739"},
        {"provider_name": "BAYADA Home Health Care", "state": "NJ", "city": "Pennsauken", "contact_email": "hotline@bayada.com", "website": "https://www.bayada.com", "phone": "888-833-5706"},
        {"provider_name": "Encompass Health", "state": "AL", "city": "Birmingham", "contact_email": "contact@encompasshealth.com", "website": "https://encompasshealth.com", "phone": "800-765-4772"},
        {"provider_name": "Visiting Angels National", "state": "PA", "city": "Bryn Mawr", "contact_email": "CustomerSupport@visitingangels.com", "website": "https://www.visitingangels.com", "phone": "800-365-4189"},
    ]


# =============================================================================
# EMAIL CAMPAIGN
# =============================================================================

@router.post("/leads/{lead_id}/send-email")
async def send_lead_email(
    lead_id: UUID,
    email_req: LeadEmailRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Send an email to a lead and track it."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    to_email = email_req.to_email or lead.contact_email
    if not to_email:
        raise HTTPException(status_code=400, detail="No email address for this lead. Add contact_email first.")

    result = email_service.send_email(
        to=to_email,
        subject=email_req.subject,
        sender=email_service.from_sales,
        html=email_req.html_body,
    )

    now = datetime.now(timezone.utc)
    lead.last_email_sent_at = now
    lead.last_email_subject = email_req.subject
    lead.email_send_count = (lead.email_send_count or 0) + 1

    if lead.status == LeadStatus.new.value:
        lead.status = LeadStatus.email_sent.value

    if result.get("success") and result.get("id"):
        lead.resend_email_id = result["id"]

    activity = lead.activity_log or []
    activity.append({
        "action": "Email sent",
        "subject": email_req.subject,
        "to": to_email,
        "resend_id": result.get("id"),
        "success": result.get("success", False),
        "at": now.isoformat(),
    })
    lead.activity_log = activity

    if result.get("success"):
        _auto_start_sequence(lead, lead.campaign_tag or "manual-outreach", db)

    db.commit()

    return {
        "message": "Email sent" if result.get("success") else "Email failed",
        "success": result.get("success", False),
        "resend_id": result.get("id"),
        "error": result.get("error"),
    }


@router.post("/leads/{lead_id}/log-open")
async def log_email_open(
    lead_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Manually log that a lead opened an email."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.email_open_count = (lead.email_open_count or 0) + 1
    lead.last_email_opened_at = now

    if lead.status == LeadStatus.email_sent.value:
        lead.status = LeadStatus.email_opened.value

    activity = lead.activity_log or []
    activity.append({"action": "Email opened", "at": now.isoformat()})
    lead.activity_log = activity
    db.commit()

    return {"message": "Open logged"}


@router.post("/leads/{lead_id}/log-response")
async def log_response(
    lead_id: UUID,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Log that a lead responded."""
    lead = db.query(SalesLead).filter(SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc)
    lead.last_response_at = now
    lead.status = LeadStatus.responded.value

    activity = lead.activity_log or []
    activity.append({"action": "Lead responded", "notes": notes, "at": now.isoformat()})
    lead.activity_log = activity
    db.commit()

    return {"message": "Response logged"}


# =============================================================================
# RESEND WEBHOOK — auto-track opens, deliveries, bounces
# =============================================================================

@router.post("/webhooks/resend")
async def resend_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receives Resend webhook events for email tracking.
    Validates Svix webhook signature when RESEND_WEBHOOK_SECRET is set.
    Rejects all requests when secret is not configured.
    Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained.
    """
    import os, hmac, hashlib, base64, time as _time

    webhook_secret = os.getenv("RESEND_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    signature_header = request.headers.get("svix-signature", "")
    svix_id = request.headers.get("svix-id", "")
    svix_timestamp = request.headers.get("svix-timestamp", "")
    if not signature_header or not svix_id or not svix_timestamp:
        raise HTTPException(status_code=401, detail="Missing webhook signature headers")

    try:
        ts = int(svix_timestamp)
        if abs(_time.time() - ts) > 300:
            raise HTTPException(status_code=401, detail="Webhook timestamp too old")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid webhook timestamp")

    raw_body = await request.body()
    signed_content = f"{svix_id}.{svix_timestamp}.{raw_body.decode('utf-8')}"

    secret_bytes = base64.b64decode(webhook_secret.removeprefix("whsec_"))
    expected_sig = base64.b64encode(
        hmac.new(secret_bytes, signed_content.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8")

    signatures = [s.strip().removeprefix("v1,") for s in signature_header.split(" ") if s.strip().startswith("v1,")]
    if not any(hmac.compare_digest(expected_sig, sig) for sig in signatures):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        import json
        payload = json.loads(raw_body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    email_id = data.get("email_id")

    if not email_id:
        return {"status": "ignored", "reason": "no email_id"}

    lead = db.query(SalesLead).filter(SalesLead.resend_email_id == email_id).first()
    if not lead:
        return {"status": "ignored", "reason": "no matching lead"}

    now = datetime.now(timezone.utc)
    activity = lead.activity_log or []

    event_map = {
        "email.opened": "opened",
        "email.delivered": "delivered",
        "email.bounced": "bounced",
        "email.complained": "complained",
        "email.clicked": "clicked",
    }
    analytics_type = event_map.get(event_type)

    if analytics_type:
        db.add(EmailCampaignEvent(
            lead_id=lead.id,
            template_id=lead.last_template_sent or "unknown",
            campaign_tag=lead.campaign_tag,
            event_type=analytics_type,
            resend_email_id=email_id,
            to_email=lead.contact_email,
            created_at=now,
        ))

    if event_type == "email.opened":
        lead.email_open_count = (lead.email_open_count or 0) + 1
        lead.last_email_opened_at = now
        if lead.status == LeadStatus.email_sent.value:
            lead.status = LeadStatus.email_opened.value
        activity.append({"action": "Email opened (auto)", "at": now.isoformat()})

    elif event_type == "email.delivered":
        activity.append({"action": "Email delivered", "at": now.isoformat()})

    elif event_type == "email.bounced":
        activity.append({
            "action": "Email bounced",
            "reason": data.get("bounce", {}).get("message", "unknown"),
            "at": now.isoformat(),
        })

    elif event_type == "email.clicked":
        activity.append({"action": "Email link clicked", "at": now.isoformat()})

    elif event_type == "email.complained":
        lead.status = "not_interested"
        lead.sequence_completed = True
        lead.next_email_scheduled_at = None
        activity.append({"action": "Spam complaint received", "at": now.isoformat()})

    lead.activity_log = activity
    db.commit()

    return {"status": "processed", "event": event_type, "lead": str(lead.id)}


# =============================================================================
# AUTO-SEQUENCING — start drip sequence when first email is sent
# =============================================================================

def _auto_start_sequence(lead: SalesLead, campaign_name: str, db: Session):
    """Start the 5-email drip sequence for a lead if not already in one.

    Called automatically whenever an email is sent to a lead that
    doesn't have an active sequence. Sets sequence_step=1 and schedules
    the next email (pattern_interrupt) in 2 days.
    """
    if lead.sequence_step and lead.sequence_step > 0:
        return
    if lead.sequence_completed:
        return

    now = datetime.now(timezone.utc)
    lead.sequence_step = 1
    lead.sequence_started_at = now
    lead.sequence_completed = False
    lead.last_template_sent = "warm_open"
    lead.campaign_tag = campaign_name or "auto-sequence"
    lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS["pattern_interrupt"])

    activity = lead.activity_log or []
    activity.append({
        "action": "Auto-sequence started (Email 1/5 counted from initial send)",
        "campaign": lead.campaign_tag,
        "at": now.isoformat(),
    })
    lead.activity_log = activity

    db.add(EmailCampaignEvent(
        lead_id=lead.id,
        template_id="warm_open",
        campaign_tag=lead.campaign_tag,
        event_type="sent",
        subject=lead.last_email_subject or "initial outreach",
        to_email=lead.contact_email,
        created_at=now,
    ))


# =============================================================================
# INTERNAL ENDPOINTS — cron-key auth for scripts and automation
# =============================================================================

import os as _os


def _require_internal_key(request: Request):
    """Validate internal API key or cron secret."""
    expected_key = _os.getenv("INTERNAL_API_KEY", "")
    cron_secret = _os.getenv("CRON_SECRET", "")
    provided_key = (
        request.headers.get("X-Internal-Key", "")
        or request.query_params.get("key", "")
    )
    if not ((expected_key and provided_key == expected_key) or (provided_key == cron_secret)):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


class InternalAddLeadAndEmail(BaseModel):
    provider_name: str
    state: str
    city: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    send_email: bool = True
    campaign_name: str = "cold-outreach-mar-2026"


@router.post("/leads/internal/add-and-email")
async def internal_add_lead_and_email(
    request: Request,
    items: List[InternalAddLeadAndEmail],
    db: Session = Depends(get_db),
):
    """Add new leads, send outreach emails, and auto-start sequences. Internal key auth."""
    _require_internal_key(request)

    now = datetime.now(timezone.utc)
    results = []

    for item in items:
        existing = db.query(SalesLead).filter(
            SalesLead.contact_email == item.contact_email.lower().strip()
        ).first()

        if existing:
            lead = existing
            if item.contact_name and not lead.contact_name:
                lead.contact_name = item.contact_name
            if item.notes:
                lead.notes = f"{lead.notes or ''}\n{item.notes}".strip()
        else:
            lead = SalesLead(
                provider_name=item.provider_name.strip().title(),
                state=item.state.upper(),
                city=(item.city or "").strip().title() or None,
                contact_email=item.contact_email.lower().strip(),
                contact_name=item.contact_name,
                phone=item.phone,
                notes=item.notes,
                priority="high",
                source="phone_outreach",
            )
            db.add(lead)
            db.flush()

        if item.send_email and lead.contact_email:
            data = {
                "provider_name": lead.provider_name,
                "city": lead.city or "your area",
                "state": lead.state,
                "state_full": STATE_NAMES.get(lead.state, lead.state),
            }
            tmpl = EMAIL_TEMPLATES["warm_open"]
            subject = _render_template(tmpl["subject"], data)
            body = _render_template(tmpl["body"], data)

            result = email_service.send_email(
                to=lead.contact_email,
                subject=subject,
                sender=email_service.from_sales,
                html=body,
            )

            if result.get("success"):
                lead.last_email_sent_at = now
                lead.last_email_subject = subject
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.status = LeadStatus.email_sent.value
                if result.get("id"):
                    lead.resend_email_id = result["id"]

                activity = lead.activity_log or []
                activity.append({
                    "action": "Email sent (internal/phone-outreach)",
                    "subject": subject,
                    "to": lead.contact_email,
                    "resend_id": result.get("id"),
                    "at": now.isoformat(),
                })
                lead.activity_log = activity

                _auto_start_sequence(lead, item.campaign_name, db)

                results.append({
                    "provider_name": lead.provider_name,
                    "email": lead.contact_email,
                    "status": "sent",
                    "lead_id": str(lead.id),
                })
            else:
                results.append({
                    "provider_name": lead.provider_name,
                    "email": lead.contact_email,
                    "status": "send_failed",
                    "error": result.get("error"),
                })
        else:
            results.append({
                "provider_name": lead.provider_name,
                "email": lead.contact_email,
                "status": "added_no_email",
                "lead_id": str(lead.id),
            })

    db.commit()
    sent_count = sum(1 for r in results if r["status"] == "sent")
    return {"total": len(results), "sent": sent_count, "results": results}


@router.post("/leads/internal/start-recent-sequences")
async def internal_start_recent_sequences(
    request: Request,
    db: Session = Depends(get_db),
):
    """Find all leads emailed in the last N days without active sequences and start them.

    Query param: days (default 2), campaign_name (default auto-sequence-mar-2026)
    """
    _require_internal_key(request)

    days = int(request.query_params.get("days", "2"))
    campaign_name = request.query_params.get("campaign_name", "auto-sequence-mar-2026")

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    leads = db.query(SalesLead).filter(
        SalesLead.last_email_sent_at >= cutoff,
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
        (SalesLead.sequence_step.is_(None)) | (SalesLead.sequence_step == 0),
        SalesLead.sequence_completed != True,
        SalesLead.status.notin_(["not_interested", "converted", "responded"]),
    ).all()

    started = 0
    for lead in leads:
        _auto_start_sequence(lead, campaign_name, db)
        started += 1

    db.commit()
    return {
        "message": f"Started sequences for {started} leads emailed in last {days} days",
        "started": started,
        "total_checked": len(leads),
    }
