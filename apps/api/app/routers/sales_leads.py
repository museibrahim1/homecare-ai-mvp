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

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.sales_lead import SalesLead, LeadStatus
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


def require_ceo(current_user: User = Depends(get_current_user)) -> User:
    """Only the CEO / platform admin can access sales leads."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if not current_user.email.endswith("@palmtai.com"):
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


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


class ImportRequest(BaseModel):
    states: List[str] = ["NE", "IA"]


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


_EMAIL_STYLE = (
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, '
    '"Helvetica Neue", sans-serif; max-width: 580px; margin: 0 auto; '
    "color: #1a1a1a; font-size: 15px; line-height: 1.8;"
)
_P = "margin: 0 0 16px 0;"
_SITE = "https://palmcareai.com"
_SIG = (
    '<p style="margin-top: 28px; margin-bottom: 0; font-weight: 600;">Muse Ibrahim</p>'
    '<p style="margin: 2px 0 0; color: #6366f1; font-size: 13px;">President &amp; CEO</p>'
    '<p style="margin: 2px 0 0; color: #6366f1; font-size: 13px;">Palm Technologies, INC.</p>'
    '<p style="margin: 6px 0 0;"><a href="https://palmcareai.com" '
    'style="color: #6366f1; text-decoration: none; font-size: 13px;">palmcareai.com</a></p>'
)
_PRODUCT_IMG = (
    '<div style="margin-top: 32px; text-align: center;">'
    '<a href="https://palmcareai.com" style="text-decoration: none;">'
    '<img src="https://palmcareai.com/product-showcase.png" '
    'alt="PalmCare AI - Voice-powered home care management" '
    'style="max-width: 480px; width: 100%; border-radius: 12px; border: 1px solid #e5e5e5;" />'
    "</a></div>"
)
_FOOTER = (
    '<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; '
    'text-align: center; font-size: 11px; color: #999; line-height: 1.6;">'
    '<a href="https://palmcareai.com" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">'
    '<img src="https://palmcareai.com/qr-code.png" '
    'alt="Scan to visit palmcareai.com" '
    'style="width: 72px; height: 72px; border-radius: 6px;" />'
    "</a><br>"
    "Palm Technologies &middot; Omaha, NE<br>"
    "You received this because {provider_name} is listed in public agency directories.<br>"
    '<a href="https://palmcareai.com/unsubscribe" style="color: #999;">Unsubscribe</a>'
    "</div>"
)


def _wrap(body_html: str) -> str:
    return f'<div style="{_EMAIL_STYLE}">{body_html}{_SIG}{_PRODUCT_IMG}{_FOOTER}</div>'


EMAIL_TEMPLATES = {
    "warm_open": {
        "id": "warm_open",
        "name": "The Warm Open",
        "subject": "quick question, {provider_name}",
        "sequence_day": 1,
        "description": "Day 1 — Warm, personal introduction. No pitch, just genuine curiosity. Opens the relationship.",
        "body": _wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">I came across {{provider_name}} while looking at home care agencies in '
            f"{{city}}. Building something in this industry takes real grit, and I respect it.</p>"
            f'<p style="{_P}">I&rsquo;m genuinely curious: how are you handling client assessments and '
            f"documentation right now? Mostly paper, or have you found something digital that works?</p>"
            f'<p style="{_P}">No pitch, just trying to understand how agency owners in {{state_full}} '
            f"actually run things day to day.</p>"
        ),
    },
    "pattern_interrupt": {
        "id": "pattern_interrupt",
        "name": "The Pattern Interrupt",
        "subject": "not another software pitch",
        "sequence_day": 3,
        "description": "Day 3 — Honest, self-aware, cuts through inbox noise. One data point, one soft CTA.",
        "body": _wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">I know, your inbox is full of people trying to sell you things. '
            f"This isn&rsquo;t that. (Well, not yet.)</p>"
            f'<p style="{_P}">Here&rsquo;s what I actually wanted to share: agencies using '
            f"voice-to-documentation tools are cutting <strong>12+ hours of admin work per week</strong>. "
            f"That&rsquo;s a nurse and a half worth of time going back to patient care.</p>"
            f'<p style="{_P}">If that number sounds interesting, I&rsquo;d love to show you how it works. '
            f"10 minutes, no slides.</p>"
            f'<p style="{_P}">Worth a quick chat?</p>'
        ),
    },
    "aspiration": {
        "id": "aspiration",
        "name": "The Aspiration",
        "subject": "imagine finishing paperwork before lunch",
        "sequence_day": 7,
        "description": "Day 7 — Paints the picture of who they become. Identity-focused, not feature-focused.",
        "body": _wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Picture this: you sit down with a new client, talk through the '
            f"assessment on your phone for a few minutes, and a complete care plan, SOAP notes, "
            f"and service contract are ready before you leave their home.</p>"
            f'<p style="{_P}">That&rsquo;s what PalmCare AI does for providers in {{state_full}}.</p>'
            f'<p style="{_P}">No training manuals. No data entry. Just talk and it&rsquo;s done.</p>'
            f'<p style="{_P}">Want to see it work with your actual workflow?</p>'
        ),
    },
    "proof_point": {
        "id": "proof_point",
        "name": "The Proof Point",
        "subject": "12 hours back every week",
        "sequence_day": 14,
        "description": "Day 14 — Data-driven, concrete. One stat translated into their language.",
        "body": _wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Quick number for you: the average home care agency spends '
            f"<strong>15+ hours per week</strong> on documentation alone. PalmCare AI brings that "
            f"down to about 3.</p>"
            f'<p style="{_P}">For {{provider_name}}, that could mean 12 hours back. Every '
            f"single week. Time for more client visits, caregiver training, or honestly just getting "
            f"home at a reasonable hour.</p>"
            f'<p style="{_P}">Would that kind of time savings make a difference for your team?</p>'
        ),
    },
    "graceful_exit": {
        "id": "graceful_exit",
        "name": "The Graceful Exit",
        "subject": "closing the loop",
        "sequence_day": 28,
        "description": "Day 28 — Short, respectful, no pressure. Ferrari-level restraint that signals confidence.",
        "body": _wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">I&rsquo;ve reached out a couple of times and I know you&rsquo;re busy. '
            f"Running {{provider_name}} in {{city}} is a full-time-and-a-half job.</p>"
            f'<p style="{_P}">I won&rsquo;t keep filling your inbox. If the timing is ever right for '
            f"a simpler way to handle documentation, I&rsquo;m here.</p>"
            f'<p style="{_P}">No worries either way. Wishing you and your team the best.</p>'
        ),
    },
}

STATE_NAMES = {"NE": "Nebraska", "IA": "Iowa"}


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
    sort_by: str = Query("created_at", regex="^(provider_name|state|city|years_in_operation|status|star_rating|email_send_count|created_at|last_email_sent_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
            lead.is_contacted = True
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
            lead.is_contacted = True
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
):
    """Pull home health agency data from CMS Provider Data API and import as leads."""
    CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query/6jpm-sxkc/0"

    imported = 0
    skipped = 0

    for state in req.states:
        payload = json.dumps({
            "conditions": [{"property": "state", "value": state.upper(), "operator": "="}],
            "limit": 500,
            "keys": True,
        }).encode()

        try:
            request = urllib.request.Request(
                CMS_API, data=payload, headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(request, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            logger.error(f"Failed to pull CMS data for {state}: {e}")
            continue

        results = data.get("results", [])

        for r in results:
            ccn = r.get("cms_certification_number_ccn")
            if not ccn:
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

    db.commit()

    return {
        "message": f"Import complete: {imported} new leads, {skipped} duplicates skipped",
        "imported": imported,
        "skipped": skipped,
        "states": req.states,
    }


# =============================================================================
# CRUD (dynamic {lead_id} routes — MUST come after all static /leads/* routes)
# =============================================================================

@router.get("/leads/{lead_id}", response_model=LeadDetail)
async def get_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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


# =============================================================================
# EMAIL CAMPAIGN
# =============================================================================

@router.post("/leads/{lead_id}/send-email")
async def send_lead_email(
    lead_id: UUID,
    email_req: LeadEmailRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_ceo),
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
    lead.is_contacted = True

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
    admin: User = Depends(require_ceo),
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
    admin: User = Depends(require_ceo),
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
    No auth required (Resend sends these directly).
    Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained.
    """
    try:
        payload = await request.json()
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
