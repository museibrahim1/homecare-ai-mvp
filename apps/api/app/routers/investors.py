"""
Investors Router — CEO-ONLY

Private CRM for investor/fundraising outreach.
Separate from Sales Leads (agency prospects).
Only accessible to platform admin accounts (@palmtai.com).
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User, UserRole
from app.models.investor import Investor, InvestorStatus, InvestorType
from app.services.email import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


def require_ceo(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if not current_user.email.endswith("@palmtai.com"):
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user


# ─── Schemas ───

class InvestorSummary(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    website: Optional[str]
    focus_sectors: list
    focus_stages: list
    check_size_display: Optional[str]
    location: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    status: str
    priority: str
    email_send_count: int
    email_open_count: int
    last_email_sent_at: Optional[datetime]
    campaign_tag: Optional[str]
    source: Optional[str]
    relevance_reason: Optional[str]
    created_at: Optional[datetime]


class InvestorDetail(BaseModel):
    id: UUID
    fund_name: str
    investor_type: Optional[str]
    website: Optional[str]
    description: Optional[str]
    focus_sectors: list
    focus_stages: list
    check_size_min: Optional[str]
    check_size_max: Optional[str]
    check_size_display: Optional[str]
    location: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_title: Optional[str]
    contact_linkedin: Optional[str]
    contact_twitter: Optional[str]
    relevance_reason: Optional[str]
    portfolio_companies: list
    source: Optional[str]
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
    activity_log: list
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class InvestorCreate(BaseModel):
    fund_name: str
    investor_type: Optional[str] = "vc_fund"
    website: Optional[str] = None
    description: Optional[str] = None
    focus_sectors: Optional[list] = []
    focus_stages: Optional[list] = []
    check_size_min: Optional[str] = None
    check_size_max: Optional[str] = None
    check_size_display: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_linkedin: Optional[str] = None
    contact_twitter: Optional[str] = None
    relevance_reason: Optional[str] = None
    portfolio_companies: Optional[list] = []
    source: Optional[str] = "manual"
    priority: Optional[str] = "medium"
    notes: Optional[str] = None


class InvestorUpdate(BaseModel):
    fund_name: Optional[str] = None
    investor_type: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    focus_sectors: Optional[list] = None
    focus_stages: Optional[list] = None
    check_size_display: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_title: Optional[str] = None
    contact_linkedin: Optional[str] = None
    relevance_reason: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    campaign_tag: Optional[str] = None


class BulkEmailRequest(BaseModel):
    investor_ids: List[UUID]
    subject: str
    html_body: str


class SingleEmailRequest(BaseModel):
    subject: str
    html_body: str
    to_email: Optional[str] = None


class BulkStatusUpdate(BaseModel):
    investor_ids: List[UUID]
    status: str


class InvestorStats(BaseModel):
    total: int
    new: int
    contacted: int
    email_sent: int
    responded: int
    meeting_scheduled: int
    interested: int
    passed: int
    committed: int
    has_email: int
    vc_funds: int
    angels: int
    avg_priority_score: float


# ─── Helpers ───

_SITE = "https://palmcareai.com"
_DECK_URL = "https://palmcareai.com/PalmCare_Deck.pdf"
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"


def _investor_email_wrap(body_sections: str) -> str:
    """Investor-specific email wrapper — professional fundraising style."""
    return (
        '<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, '
        'sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">'
        '<div style="background: linear-gradient(135deg, #0d9488, #0891b2); '
        'padding: 32px 40px; text-align: center;">'
        '<p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; '
        'letter-spacing: -0.3px;">PalmCare AI</p>'
        '<p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); '
        'letter-spacing: 0.05em;">AI-NATIVE HOME CARE DOCUMENTATION</p>'
        '</div>'
        f'<div style="padding: 40px; color: {_SLATE_900}; font-size: 15px; line-height: 1.7;">'
        f'{body_sections}'
        '</div>'
        f'<div style="padding: 0 40px 32px; border-top: 1px solid {_SLATE_200}; padding-top: 24px;">'
        f'<p style="margin: 0; font-weight: 700; font-size: 15px; color: {_SLATE_900};">Muse Ibrahim</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Founder &amp; CEO</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Palm Technologies, Inc.</p>'
        f'<p style="margin: 6px 0 0;"><a href="{_SITE}" '
        f'style="color: {_TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">'
        f'palmcareai.com</a></p>'
        '</div>'
        f'<div style="padding: 24px 40px; background-color: {_SLATE_100}; '
        f'border-top: 1px solid {_SLATE_200}; text-align: center;">'
        f'<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: {_SLATE_900};">'
        'PalmCare AI</p>'
        f'<p style="margin: 0 0 4px; font-size: 12px; color: {_SLATE_600};">'
        'Record it. Transcribe it. Contract it.</p>'
        f'<p style="margin: 0; font-size: 11px; color: #94a3b8;">'
        'Palm Technologies, Inc. &middot; Omaha, NE</p>'
        '</div>'
        '</div>'
    )


# ─── Email Templates ───

INVESTOR_EMAIL_TEMPLATES = {
    "seed_outreach": {
        "id": "seed_outreach",
        "name": "Seed Round Outreach",
        "subject": "Pre-Seed: Defining the Future of Home Care Operations",
        "description": "Primary investor outreach email for the $450K seed round with pitch deck attached.",
        "body": _investor_email_wrap(
            '<p style="margin: 0 0 16px;">Hi {contact_name},</p>'
            '<p style="margin: 0 0 16px;">I hope you\'re well. I\'m reaching out to share what we\'re building at '
            'Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates '
            'the patient assessment, care planning, and contracting workflow for home care agencies.</p>'
            '<p style="margin: 0 0 16px;">One of the strongest signals that this market is ready for disruption is '
            'how little has changed. Home care is a <strong>$343B industry</strong> processing millions of Medicaid and '
            'private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, '
            'and legacy software built two decades ago. The incumbents&mdash;WellSky, AxisCare, and CareTime&mdash;'
            'proved that agencies will pay for software. What they never delivered was intelligence. Not one of them '
            'has touched AI in a way to speed up processes, meaning leaving not leaving the table without a deal.</p>'
            '<p style="margin: 0 0 16px;">What the incumbents validated was the willingness to pay. What agencies are '
            'urgently asking for now is a platform that actually thinks&mdash;one that eliminates the documentation '
            'burden consuming <strong>40 to 60 percent</strong> of their staff\'s time and replaces it with automation. '
            'That is the gap PalmCare AI is filling.</p>'
            '<p style="margin: 0 0 16px;">We are raising a <strong>$450K seed round</strong> via SAFE or convertible '
            'note at a <strong>$1.8M pre-money valuation</strong>. This capital will fund our first AI engineering hire, '
            'go-to-market execution, and compliance infrastructure as we scale to 700 agencies by the end of 2027.</p>'

            f'<div style="background-color: {_SLATE_100}; border-radius: 8px; padding: 20px; margin: 24px 0;">'
            f'<p style="margin: 0 0 8px; font-weight: 700; color: {_SLATE_900};">Why this market and why now</p>'
            '<ul style="margin: 0; padding-left: 20px; color: #334155;">'
            '<li style="margin-bottom: 6px;">LLMs and voice AI are now production-ready at the cost structures '
            'vertical SaaS requires; this window just opened</li>'
            '<li style="margin-bottom: 6px;">10,000 Americans turn 65 every day through 2030, accelerating '
            'home-based care demand</li>'
            '<li style="margin-bottom: 6px;">Medicaid and Medicare Advantage are actively shifting reimbursement '
            'toward home care over institutional settings</li>'
            '<li style="margin-bottom: 0;">No competitor has an AI roadmap; this is a greenfield opportunity '
            'inside a mature, paying market</li>'
            '</ul></div>'

            f'<div style="background-color: {_SLATE_100}; border-radius: 8px; padding: 20px; margin: 24px 0;">'
            f'<p style="margin: 0 0 8px; font-weight: 700; color: {_SLATE_900};">PalmCare AI Highlights</p>'
            '<ul style="margin: 0; padding-left: 20px; color: #334155;">'
            '<li style="margin-bottom: 6px;">Full platform built and live today&mdash;AI assessment pipeline, '
            'voice documentation engine, CRM</li>'
            '<li style="margin-bottom: 6px;">$414/mo blended ARPU across mobile and full platform tiers</li>'
            '<li style="margin-bottom: 6px;">82% gross margin with strong unit economics</li>'
            '<li style="margin-bottom: 6px;">Structural retention: agencies run daily operations through the platform, '
            'switching cost is high by design</li>'
            '<li style="margin-bottom: 6px;">Founder with a rare combination: software engineer, B2B sales professional, '
            'and former home care experience</li>'
            '<li style="margin-bottom: 0;">Clean cap table&mdash;100% bootstrapped, no prior dilution</li>'
            '</ul></div>'

            '<p style="margin: 0 0 16px;">I\'ll attach our deck below. I\'d welcome the chance to walk you through '
            'what we\'re building and get your feedback.</p>'

            f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_DECK_URL}" style="display: inline-block; background: linear-gradient(135deg, {_TEAL}, #0891b2); '
            f'color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; '
            f'font-size: 15px; letter-spacing: -0.2px;">View Pitch Deck &rarr;</a></div>'

            f'<p style="margin: 0 0 4px;">Visit our website @ '
            f'<a href="{_SITE}" style="color: {_TEAL}; text-decoration: none; font-weight: 600;">palmcareai.com</a></p>'
            '<p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">Warm regards,<br/>'
            'Muse Ibrahim<br/>Founder &amp; CEO, Palm Technologies Inc.<br/>'
            '213-569-7693 | invest@palmtai.com</p>'
        ),
    },
}


# ─── Routes ───

@router.get("/email-templates")
def list_investor_email_templates(user: User = Depends(require_ceo)):
    """List available investor email templates."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "subject": t["subject"],
            "description": t["description"],
        }
        for t in INVESTOR_EMAIL_TEMPLATES.values()
    ]


@router.get("/email-templates/{template_id}")
def get_investor_email_template(template_id: str, user: User = Depends(require_ceo)):
    """Get full email template with HTML body."""
    tmpl = INVESTOR_EMAIL_TEMPLATES.get(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.get("/stats", response_model=InvestorStats)
def get_investor_stats(db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    total = db.query(func.count(Investor.id)).scalar() or 0
    new = db.query(func.count(Investor.id)).filter(Investor.status == "new").scalar() or 0
    contacted = db.query(func.count(Investor.id)).filter(Investor.status == "contacted").scalar() or 0
    email_sent = db.query(func.count(Investor.id)).filter(Investor.status == "email_sent").scalar() or 0
    responded = db.query(func.count(Investor.id)).filter(Investor.status == "responded").scalar() or 0
    meeting = db.query(func.count(Investor.id)).filter(Investor.status == "meeting_scheduled").scalar() or 0
    interested = db.query(func.count(Investor.id)).filter(Investor.status == "interested").scalar() or 0
    passed = db.query(func.count(Investor.id)).filter(Investor.status == "passed").scalar() or 0
    committed = db.query(func.count(Investor.id)).filter(Investor.status == "committed").scalar() or 0
    has_email = db.query(func.count(Investor.id)).filter(Investor.contact_email.isnot(None)).scalar() or 0
    vc_funds = db.query(func.count(Investor.id)).filter(Investor.investor_type == "vc_fund").scalar() or 0
    angels = db.query(func.count(Investor.id)).filter(Investor.investor_type == "angel").scalar() or 0

    return InvestorStats(
        total=total, new=new, contacted=contacted, email_sent=email_sent,
        responded=responded, meeting_scheduled=meeting, interested=interested,
        passed=passed, committed=committed, has_email=has_email,
        vc_funds=vc_funds, angels=angels, avg_priority_score=0,
    )


@router.get("/", response_model=List[InvestorSummary])
def list_investors(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    investor_type: Optional[str] = None,
    search: Optional[str] = None,
    sector: Optional[str] = None,
    has_email: Optional[bool] = None,
    campaign_tag: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    skip: int = 0,
    limit: int = Query(default=100, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    q = db.query(Investor)

    if status:
        q = q.filter(Investor.status == status)
    if priority:
        q = q.filter(Investor.priority == priority)
    if investor_type:
        q = q.filter(Investor.investor_type == investor_type)
    if has_email is True:
        q = q.filter(Investor.contact_email.isnot(None), Investor.contact_email != "")
    if campaign_tag:
        q = q.filter(Investor.campaign_tag == campaign_tag)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            Investor.fund_name.ilike(term),
            Investor.contact_name.ilike(term),
            Investor.contact_email.ilike(term),
            Investor.description.ilike(term),
        ))
    if sector:
        q = q.filter(Investor.focus_sectors.op("@>")(f'["{sector}"]'))

    col = getattr(Investor, sort_by, Investor.created_at)
    q = q.order_by(desc(col) if sort_dir == "desc" else asc(col))

    investors = q.offset(skip).limit(limit).all()
    return [InvestorSummary(
        id=i.id, fund_name=i.fund_name, investor_type=i.investor_type,
        website=i.website, focus_sectors=i.focus_sectors or [],
        focus_stages=i.focus_stages or [], check_size_display=i.check_size_display,
        location=i.location, contact_name=i.contact_name, contact_email=i.contact_email,
        status=i.status, priority=i.priority, email_send_count=i.email_send_count or 0,
        email_open_count=i.email_open_count or 0, last_email_sent_at=i.last_email_sent_at,
        campaign_tag=i.campaign_tag, source=i.source,
        relevance_reason=i.relevance_reason, created_at=i.created_at,
    ) for i in investors]


@router.get("/{investor_id}", response_model=InvestorDetail)
def get_investor(investor_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    inv = db.query(Investor).filter(Investor.id == investor_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investor not found")
    return InvestorDetail(
        id=inv.id, fund_name=inv.fund_name, investor_type=inv.investor_type,
        website=inv.website, description=inv.description,
        focus_sectors=inv.focus_sectors or [], focus_stages=inv.focus_stages or [],
        check_size_min=inv.check_size_min, check_size_max=inv.check_size_max,
        check_size_display=inv.check_size_display, location=inv.location,
        contact_name=inv.contact_name, contact_email=inv.contact_email,
        contact_title=inv.contact_title, contact_linkedin=inv.contact_linkedin,
        contact_twitter=inv.contact_twitter, relevance_reason=inv.relevance_reason,
        portfolio_companies=inv.portfolio_companies or [], source=inv.source,
        status=inv.status, priority=inv.priority, notes=inv.notes,
        last_email_sent_at=inv.last_email_sent_at, last_email_subject=inv.last_email_subject,
        email_send_count=inv.email_send_count or 0, email_open_count=inv.email_open_count or 0,
        last_email_opened_at=inv.last_email_opened_at, last_response_at=inv.last_response_at,
        campaign_tag=inv.campaign_tag, activity_log=inv.activity_log or [],
        created_at=inv.created_at, updated_at=inv.updated_at,
    )


@router.post("/", response_model=InvestorDetail)
def create_investor(data: InvestorCreate, db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    inv = Investor(
        fund_name=data.fund_name, investor_type=data.investor_type,
        website=data.website, description=data.description,
        focus_sectors=data.focus_sectors, focus_stages=data.focus_stages,
        check_size_min=data.check_size_min, check_size_max=data.check_size_max,
        check_size_display=data.check_size_display, location=data.location,
        contact_name=data.contact_name, contact_email=data.contact_email,
        contact_title=data.contact_title, contact_linkedin=data.contact_linkedin,
        contact_twitter=data.contact_twitter, relevance_reason=data.relevance_reason,
        portfolio_companies=data.portfolio_companies, source=data.source,
        priority=data.priority, notes=data.notes,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return get_investor(inv.id, db, user)


@router.patch("/{investor_id}", response_model=InvestorDetail)
def update_investor(investor_id: UUID, data: InvestorUpdate, db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    inv = db.query(Investor).filter(Investor.id == investor_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investor not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(inv, field, value)

    inv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inv)
    return get_investor(inv.id, db, user)


@router.delete("/{investor_id}")
def delete_investor(investor_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    inv = db.query(Investor).filter(Investor.id == investor_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investor not found")
    db.delete(inv)
    db.commit()
    return {"ok": True}


@router.post("/bulk-status")
def bulk_update_status(data: BulkStatusUpdate, db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    updated = db.query(Investor).filter(Investor.id.in_(data.investor_ids)).update(
        {Investor.status: data.status, Investor.updated_at: datetime.now(timezone.utc)},
        synchronize_session="fetch",
    )
    db.commit()
    return {"updated": updated}


@router.post("/{investor_id}/email")
async def send_investor_email(
    investor_id: UUID,
    data: SingleEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    inv = db.query(Investor).filter(Investor.id == investor_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investor not found")

    to_email = data.to_email or inv.contact_email
    if not to_email:
        raise HTTPException(status_code=400, detail="No email address")

    html = _investor_email_wrap(data.html_body)

    result = await email_service.send_email(
        to=to_email,
        subject=data.subject,
        html=html,
        from_name="Muse Ibrahim | PalmCare AI",
        reply_to="muse@palmtai.com",
    )

    inv.last_email_sent_at = datetime.now(timezone.utc)
    inv.last_email_subject = data.subject
    inv.email_send_count = (inv.email_send_count or 0) + 1
    if inv.status == "new":
        inv.status = "email_sent"
    if result and hasattr(result, "id"):
        inv.resend_email_id = result.id

    log_entry = {
        "type": "email_sent",
        "subject": data.subject,
        "to": to_email,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    inv.activity_log = (inv.activity_log or []) + [log_entry]
    inv.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"ok": True, "sent_to": to_email}


@router.post("/bulk-email")
async def send_bulk_investor_email(
    data: BulkEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(require_ceo),
):
    investors = db.query(Investor).filter(
        Investor.id.in_(data.investor_ids),
        Investor.contact_email.isnot(None),
        Investor.contact_email != "",
    ).all()

    if not investors:
        raise HTTPException(status_code=400, detail="No investors with email addresses found")

    sent = 0
    failed = 0
    for inv in investors:
        try:
            personalized_body = data.html_body.replace("{fund_name}", inv.fund_name or "")
            first_name = (inv.contact_name or "").split()[0] if inv.contact_name and inv.contact_name.strip() else "there"
            personalized_body = personalized_body.replace("{contact_name}", first_name)
            personalized_subject = data.subject.replace("{fund_name}", inv.fund_name or "")

            html = _investor_email_wrap(personalized_body)

            result = await email_service.send_email(
                to=inv.contact_email,
                subject=personalized_subject,
                html=html,
                from_name="Muse Ibrahim | PalmCare AI",
                reply_to="muse@palmtai.com",
            )

            inv.last_email_sent_at = datetime.now(timezone.utc)
            inv.last_email_subject = personalized_subject
            inv.email_send_count = (inv.email_send_count or 0) + 1
            if inv.status in ("new", "researched"):
                inv.status = "email_sent"
            if result and hasattr(result, "id"):
                inv.resend_email_id = result.id

            log_entry = {
                "type": "bulk_email_sent",
                "subject": personalized_subject,
                "to": inv.contact_email,
                "at": datetime.now(timezone.utc).isoformat(),
            }
            inv.activity_log = (inv.activity_log or []) + [log_entry]
            sent += 1
        except Exception as e:
            logger.error(f"Failed to send to {inv.contact_email}: {e}")
            failed += 1

    db.commit()
    return {"sent": sent, "failed": failed, "total": len(investors)}


@router.post("/seed-data")
def seed_investor_data(db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    """Add curated investors to the database, skipping any that already exist by fund name."""
    investors_data = _get_seed_investors()
    added = 0
    skipped = 0
    for data in investors_data:
        existing = db.query(Investor).filter(
            Investor.fund_name == data["fund_name"]
        ).first()
        if existing:
            if not existing.contact_email and data.get("contact_email"):
                existing.contact_email = data["contact_email"]
                existing.contact_name = data.get("contact_name", existing.contact_name)
                existing.website = data.get("website", existing.website)
            skipped += 1
            continue
        inv = Investor(**data)
        db.add(inv)
        added += 1

    db.commit()
    return {"added": added, "skipped": skipped, "message": f"Added {added} new investors, {skipped} already existed (emails updated where missing)"}


@router.delete("/clear-all")
def clear_all_investors(db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    """Clear all investor data (dev/reset only)."""
    deleted = db.query(Investor).delete()
    db.commit()
    return {"deleted": deleted}


def _get_seed_investors() -> list:
    """Curated list of AI, HealthTech, and relevant seed/pre-seed investors with contact info."""
    return [
        # ── Tier 1: Direct Home Care / Health AI Investors ──
        {
            "fund_name": "Cortado Ventures",
            "investor_type": "vc_fund",
            "website": "https://cortado.ventures",
            "description": "Oklahoma City VC investing in Heartland tech. Already backed Apricot Health AI (home health nurse documentation AI).",
            "focus_sectors": ["AI", "HealthTech", "Enterprise SaaS"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$250K",
            "check_size_max": "$2M",
            "check_size_display": "$250K - $2M",
            "location": "Oklahoma City, OK",
            "contact_name": "Nathan Dutzmann",
            "contact_email": "investors@cortado.ventures",
            "contact_title": "Managing Partner",
            "relevance_reason": "Already invested in Apricot Health AI (home health documentation AI). Midwest-based, exact market fit for PalmCare.",
            "portfolio_companies": ["Apricot Health AI", "Canopy Weather", "Pumpjack Dataworks"],
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Boomerang Ventures",
            "investor_type": "vc_fund",
            "website": "https://boomerang.vc",
            "description": "Indianapolis VC focused on at-home care, connected health, and AI/ML. Led Lizzy Care seed round (AI home care).",
            "focus_sectors": ["HealthTech", "AI", "Home Care", "Connected Health"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "Indianapolis, IN",
            "contact_name": "Mike Langellier",
            "contact_email": "info@boomerang.vc",
            "contact_title": "Managing Partner",
            "relevance_reason": "Led Lizzy Care seed (AI at-home care). Invested in GeoH (home care software). Exact market match for PalmCare.",
            "portfolio_companies": ["Lizzy Care", "GeoH", "Careswitch"],
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "InVitro Capital",
            "investor_type": "vc_fund",
            "website": "https://invitrocapital.com",
            "description": "VC building and investing in AI-native healthcare companies. Portfolio includes Curenta (AI EMR for home health/hospice).",
            "focus_sectors": ["AI", "HealthTech", "Home Health", "Digital Health"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "San Francisco, CA",
            "contact_email": "info@invitrocapital.com",
            "relevance_reason": "Invested in Curenta (AI-native EMR for home health/hospice). Nearly identical model to PalmCare.",
            "portfolio_companies": ["Curenta", "DocVA"],
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Health Frontier Ventures",
            "investor_type": "vc_fund",
            "website": "https://healthfrontier.vc",
            "description": "Digital health + generative AI focused seed fund. $400K typical check size matches PalmCare's raise.",
            "focus_sectors": ["Digital Health", "AI", "HealthTech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$200K",
            "check_size_max": "$500K",
            "check_size_display": "$200K - $500K",
            "location": "New York, NY",
            "relevance_reason": "Digital health + generative AI focus. $400K sweet spot matches PalmCare's $450K raise perfectly.",
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Invest Nebraska",
            "investor_type": "vc_fund",
            "website": "https://investnebraska.com",
            "description": "THE local investor for Nebraska startups. Active in healthcare software, recent Microsoft AI partnership.",
            "focus_sectors": ["AI", "HealthTech", "Enterprise", "AgTech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$500K",
            "check_size_display": "$50K - $500K",
            "location": "Omaha, NE",
            "contact_name": "Hannah Gille",
            "contact_email": "hannah@investnebraska.com",
            "contact_title": "Investment Director",
            "relevance_reason": "Nebraska's primary startup investor. PalmCare is HQ'd in Nebraska — local geographic advantage and ecosystem support.",
            "portfolio_companies": ["Bulu", "Opendorse", "Novacoast"],
            "source": "gust.com",
            "priority": "high",
        },
        {
            "fund_name": "MOVE Venture Capital",
            "investor_type": "vc_fund",
            "website": "https://movevc.com",
            "description": "Only pre-seed/seed VC in Nebraska. 100% of investments are Nebraska-based startups.",
            "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$25K",
            "check_size_max": "$250K",
            "check_size_display": "$25K - $250K",
            "location": "Omaha, NE",
            "relevance_reason": "Only pre-seed/seed VC in Nebraska with 100% local investment mandate. Natural first investor for PalmCare.",
            "source": "gust.com",
            "priority": "high",
        },
        {
            "fund_name": "Intelligence Ventures",
            "investor_type": "vc_fund",
            "website": "https://intelligencevc.com",
            "description": "Exclusively invests in AI + healthcare at pre-seed/seed. Narrow thesis perfect for PalmCare.",
            "focus_sectors": ["AI", "HealthTech", "Digital Health"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "San Francisco, CA",
            "contact_email": "info@intelligencevc.com",
            "relevance_reason": "Exclusively AI + healthcare at pre-seed/seed — PalmCare is exactly their thesis.",
            "source": "signal.nfx.com",
            "priority": "high",
        },
        {
            "fund_name": "DHVP (Digital Health Venture Partners)",
            "investor_type": "vc_fund",
            "website": "https://dhvp.io",
            "description": "Focuses on AI workflow optimization in healthcare. Pre-seed and seed specialist.",
            "focus_sectors": ["Digital Health", "AI", "HealthTech", "Workflow Automation"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "San Francisco, CA",
            "contact_name": "Arvin Khamseh",
            "contact_email": "arvin@dhvp.io",
            "contact_title": "General Partner",
            "relevance_reason": "AI workflow optimization in healthcare — direct alignment with PalmCare's automated assessment and documentation pipeline.",
            "source": "signal.nfx.com",
            "priority": "high",
        },
        # ── Tier 2: Strong AI + HealthTech Investors ──
        {
            "fund_name": "Rock Health Capital",
            "investor_type": "vc_fund",
            "website": "https://rockhealth.com",
            "description": "Digital health-focused VC with proprietary digital-health data and enterprise advisory.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "contact_name": "Bill Evans",
            "contact_email": "bill.evans@rockhealthcapital.com",
            "contact_title": "Managing Director",
            "relevance_reason": "Pure-play digital health investor. PalmCare's AI-native care documentation fits their thesis.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "AIX Ventures",
            "investor_type": "vc_fund",
            "website": "https://aixventures.com",
            "description": "AI-focused seed fund investing exclusively in AI/ML companies across verticals.",
            "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "San Francisco, CA",
            "relevance_reason": "Pure AI seed fund. PalmCare's AI assessment pipeline and voice documentation engine are core AI products.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Zetta Venture Partners",
            "investor_type": "vc_fund",
            "website": "https://zettavp.com",
            "description": "AI-focused VC investing in companies building intelligent systems. Strong healthcare AI portfolio.",
            "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "contact_name": "Mark Gorenberg",
            "contact_email": "mark@zettavp.com",
            "contact_title": "Managing Partner",
            "relevance_reason": "AI-first investment thesis with healthcare portfolio. PalmCare's voice AI + NLP pipeline is core AI technology.",
            "portfolio_companies": ["Viz.ai", "Clarifai"],
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Fusion Fund",
            "investor_type": "vc_fund",
            "website": "https://fusionfund.com",
            "description": "AI and deep tech seed fund led by Lu Zhang. Strong healthcare AI portfolio.",
            "focus_sectors": ["AI", "Deep Tech", "HealthTech", "Enterprise"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "contact_name": "Lu Zhang",
            "contact_email": "pitch@fusionfund.com",
            "contact_title": "Founding Partner",
            "relevance_reason": "AI/deep tech fund with healthcare focus. PalmCare's AI assessment engine uses production ML at enterprise scale.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "2048 Ventures",
            "investor_type": "vc_fund",
            "website": "https://2048.vc",
            "description": "Pre-seed fund investing $250K-$500K in AI-native companies across healthcare, enterprise, and fintech.",
            "focus_sectors": ["AI", "Enterprise", "HealthTech", "FinTech"],
            "focus_stages": ["Pre-Seed"],
            "check_size_min": "$250K",
            "check_size_max": "$500K",
            "check_size_display": "$250K - $500K",
            "location": "New York, NY",
            "contact_name": "Alex Iskold",
            "contact_email": "alex@2048.vc",
            "contact_title": "Managing Partner",
            "relevance_reason": "Pre-seed AI specialist with healthcare vertical. Check size perfectly matches PalmCare's raise.",
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Santé Ventures",
            "investor_type": "vc_fund",
            "website": "https://santeventures.com",
            "description": "Health technology focused VC in Austin. Invests in companies improving healthcare delivery and operations.",
            "focus_sectors": ["HealthTech", "Digital Health", "MedTech", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "Austin, TX",
            "relevance_reason": "Pure healthcare tech focus. PalmCare improves home care delivery operations — direct thesis alignment.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Dreamit HealthTech",
            "investor_type": "accelerator",
            "website": "https://dreamit.com",
            "description": "Health tech accelerator providing $50K-$500K plus mentorship and healthcare system partnerships.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$500K",
            "check_size_display": "$50K - $500K",
            "location": "Philadelphia, PA",
            "relevance_reason": "Health tech accelerator with hospital system connections. PalmCare could leverage their network for home care agency partnerships.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "StartUp Health",
            "investor_type": "accelerator",
            "website": "https://startuphealth.com",
            "description": "Global health innovation company. Health Transformer program + investment arm for digital health.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI", "Wellness"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$100K",
            "check_size_max": "$1M",
            "check_size_display": "$100K - $1M",
            "location": "New York, NY",
            "contact_name": "Steven Krein",
            "contact_email": "steven@startuphealth.com",
            "contact_title": "Co-Founder & CEO",
            "relevance_reason": "Health Transformer program provides massive network of health innovators. Strong signal for follow-on fundraising.",
            "portfolio_companies": ["Docpace", "Wellsheet", "Viora Health"],
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "Fifty Years",
            "investor_type": "vc_fund",
            "website": "https://fifty.vc",
            "description": "Impact-focused VC investing in companies solving the world's biggest problems. Strong AI + health portfolio.",
            "focus_sectors": ["AI", "HealthTech", "Climate", "Education"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$250K",
            "check_size_max": "$1M",
            "check_size_display": "$250K - $1M",
            "location": "San Francisco, CA",
            "contact_name": "Seth Bannon",
            "contact_email": "seth@fifty.vc",
            "contact_title": "Managing Partner",
            "relevance_reason": "Impact + AI investing. Home care AI addresses critical caregiver shortage — a major societal impact opportunity.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Healthy Ventures",
            "investor_type": "vc_fund",
            "website": "https://healthy.vc",
            "description": "Digital health seed fund investing in companies that make healthcare more accessible and efficient.",
            "focus_sectors": ["Digital Health", "HealthTech", "AI"],
            "focus_stages": ["Seed"],
            "check_size_min": "$250K",
            "check_size_max": "$1M",
            "check_size_display": "$250K - $1M",
            "location": "San Francisco, CA",
            "contact_email": "pitch@healthy.vc",
            "relevance_reason": "Pure digital health seed fund. PalmCare makes home care more accessible and efficient through AI automation.",
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Nina Capital",
            "investor_type": "vc_fund",
            "website": "https://nina.capital",
            "description": "Digital health VC investing in seed-stage companies across the US and Europe.",
            "focus_sectors": ["Digital Health", "HealthTech", "AI", "Biotech"],
            "focus_stages": ["Seed"],
            "check_size_min": "$200K",
            "check_size_max": "$1M",
            "check_size_display": "$200K - $1M",
            "location": "Barcelona / San Francisco",
            "contact_email": "dealflow@nina.capital",
            "relevance_reason": "Digital health seed specialist with US presence. PalmCare's AI platform fits their thesis of technology-enabled care delivery.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "Seed Healthcare",
            "investor_type": "vc_fund",
            "website": "https://seedhealthcare.com",
            "description": "Exclusively healthcare venture investing at seed and early stages.",
            "focus_sectors": ["Digital Health", "HealthTech", "MedTech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "New York, NY",
            "contact_name": "Todd Cozzens",
            "contact_email": "todd@seedhealthcare.com",
            "contact_title": "Managing Partner",
            "relevance_reason": "Pure healthcare seed investor — exclusive focus on healthcare startups means deep understanding of care delivery innovation.",
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Headwater Ventures",
            "investor_type": "vc_fund",
            "website": "https://headwater.vc",
            "description": "Midwest health IT investor. Check size ($100K-$500K) perfect for PalmCare's raise.",
            "focus_sectors": ["HealthTech", "AI", "Health IT"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "Minneapolis, MN",
            "contact_name": "Matt Dombro",
            "contact_email": "matt@headwater.vc",
            "contact_title": "Managing Partner",
            "relevance_reason": "Midwest health IT investor. Check size perfectly matches PalmCare's raise. Geographic and thesis alignment.",
            "source": "signal.nfx.com",
            "priority": "high",
        },
        {
            "fund_name": "Wireframe Ventures",
            "investor_type": "vc_fund",
            "website": "https://wireframevc.com",
            "description": "AI and enterprise SaaS focused seed fund backing technical founders.",
            "focus_sectors": ["AI", "Enterprise SaaS", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "relevance_reason": "AI + enterprise SaaS thesis. PalmCare's AI-powered vertical SaaS for home care fits their investment criteria.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Bee Partners",
            "investor_type": "vc_fund",
            "website": "https://beepartners.vc",
            "description": "Pre-seed/seed fund focused on AI and enterprise. One of the most active Bay Area seed investors.",
            "focus_sectors": ["AI", "Enterprise", "SaaS", "HealthTech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$200K",
            "check_size_max": "$500K",
            "check_size_display": "$200K - $500K",
            "location": "San Francisco, CA",
            "contact_name": "Michael Berolzheimer",
            "contact_email": "michael@beepartners.vc",
            "contact_title": "Founding Partner",
            "relevance_reason": "Active pre-seed/seed fund with AI and enterprise focus. PalmCare's B2B AI platform is their sweet spot.",
            "source": "signal.nfx.com",
            "priority": "medium",
        },
        {
            "fund_name": "Sierra Ventures",
            "investor_type": "vc_fund",
            "website": "https://sierraventures.com",
            "description": "Enterprise and health tech VC. 40+ year track record investing in category-defining companies.",
            "focus_sectors": ["Enterprise", "HealthTech", "AI", "Cybersecurity"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "San Mateo, CA",
            "relevance_reason": "Enterprise + health tech thesis with decades of experience. PalmCare's B2B healthcare SaaS fits both verticals.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "SteelSky Ventures",
            "investor_type": "vc_fund",
            "website": "https://steelskyventures.com",
            "description": "Health tech focused venture fund backing early-stage digital health companies.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "New York, NY",
            "contact_name": "Maria Velissaris",
            "contact_email": "maria@steelskyventures.com",
            "contact_title": "General Partner",
            "relevance_reason": "Health tech seed specialist. PalmCare's digital health platform for home care agencies is core to their thesis.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "City Light Capital",
            "investor_type": "vc_fund",
            "website": "https://citylight.vc",
            "description": "Social impact + health innovation fund. Backs companies solving systemic healthcare challenges.",
            "focus_sectors": ["HealthTech", "Social Impact", "AI", "Education"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$250K",
            "check_size_max": "$2M",
            "check_size_display": "$250K - $2M",
            "location": "New York, NY",
            "contact_name": "Josh Cohen",
            "contact_email": "josh@citylight.vc",
            "contact_title": "Managing Partner",
            "relevance_reason": "Social impact + health innovation. PalmCare addresses caregiver burden and care access — both systemic health challenges.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "Embrace Ventures",
            "investor_type": "vc_fund",
            "website": "https://embraceventures.vc",
            "description": "Health innovation fund investing in companies improving healthcare delivery and access.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "San Francisco, CA",
            "contact_email": "hello@embraceventures.vc",
            "relevance_reason": "Health innovation focus on care delivery improvement. PalmCare directly improves home care delivery through AI.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "AV8 Ventures",
            "investor_type": "vc_fund",
            "website": "https://av8.vc",
            "description": "AI and tech seed fund backing technical founders building category-defining companies.",
            "focus_sectors": ["AI", "Enterprise", "SaaS", "Deep Tech"],
            "focus_stages": ["Seed"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "contact_email": "info@av8.vc",
            "relevance_reason": "AI seed fund for technical founders. PalmCare's founder built the full AI pipeline — strong technical founder signal.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        # ── Tier 3: Major VC Funds with AI + Healthcare Practice ──
        {
            "fund_name": "Andreessen Horowitz (a16z)",
            "investor_type": "vc_fund",
            "website": "https://a16z.com",
            "description": "Mega-fund with dedicated healthcare and AI practices. Portfolio includes Hippocratic AI, Ambience Healthcare.",
            "focus_sectors": ["AI", "HealthTech", "SaaS", "Enterprise"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$500K - $10M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Strong AI+Healthcare thesis with investments in Hippocratic AI and Ambience Healthcare — direct alignment with PalmCare's AI-native care documentation.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Bessemer Venture Partners",
            "investor_type": "vc_fund",
            "website": "https://bvp.com",
            "description": "Partner-led firm with early AI/developer-platform foresight and strong healthcare practice.",
            "focus_sectors": ["AI", "Enterprise", "HealthTech", "SaaS"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$500K - $100M",
            "location": "San Francisco, CA",
            "contact_name": "Anna Hedin",
            "contact_email": "ahedin@bvp.com",
            "contact_title": "Partner, Healthcare",
            "relevance_reason": "Strong AI+Healthcare crossover thesis. Enterprise SaaS expertise aligns with PalmCare's B2B model.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Khosla Ventures",
            "investor_type": "vc_fund",
            "website": "https://khosla.com",
            "description": "Aggressive techno-optimist investor backing healthcare and deep-tech bets with high risk tolerance.",
            "focus_sectors": ["AI", "HealthTech", "Deep Tech", "Climate"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$500K - $50M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Known for backing AI-first healthcare companies. Willingness to fund transformative care technology.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "8VC",
            "investor_type": "vc_fund",
            "website": "https://8vc.com",
            "description": "VC fund focused on transforming industries with technology — healthcare, logistics, defense.",
            "focus_sectors": ["HealthTech", "AI", "Enterprise", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "Austin, TX",
            "relevance_reason": "Joe Lonsdale's fund backs healthcare technology that replaces legacy workflows — direct fit for PalmCare.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Canaan Partners",
            "investor_type": "vc_fund",
            "website": "https://canaan.com",
            "description": "60/40 tech/healthcare split with deliberate focus on company formation.",
            "focus_sectors": ["HealthTech", "Enterprise", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $10M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Deep healthcare practice with AI focus. Deliberate healthcare allocation ideal for AI-native care platforms.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "F-Prime Capital",
            "investor_type": "vc_fund",
            "website": "https://fprimecapital.com",
            "description": "Fidelity-backed formation engine combining healthcare and tech expertise.",
            "focus_sectors": ["HealthTech", "AI", "Biotech"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$100K - $10M",
            "location": "Cambridge, MA",
            "relevance_reason": "Healthcare-tech focus with Fidelity backing. Interest in tech feasibility suits PalmCare's HIPAA-compliant AI approach.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "SignalFire",
            "investor_type": "vc_fund",
            "website": "https://signalfire.com",
            "description": "$1.8B AUM multi-stage VC with data-driven investment approach and AI/ML focus.",
            "focus_sectors": ["AI", "HealthTech", "SaaS", "Cybersecurity"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$250K - $30M",
            "location": "San Francisco, CA",
            "relevance_reason": "Data-driven VC with strong AI thesis. Health tech vertical supports PalmCare through growth.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "Upfront Ventures",
            "investor_type": "vc_fund",
            "website": "https://upfront.com",
            "description": "$2B+ AUM fund investing in healthtech, AI/ML, digital health, and care delivery.",
            "focus_sectors": ["HealthTech", "AI", "Digital Health", "SaaS"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $8M",
            "location": "Los Angeles, CA",
            "relevance_reason": "Major healthcare + AI investor. Care delivery focus maps directly to PalmCare's market.",
            "source": "openvc.app",
            "priority": "high",
        },
        # ── Pre-Seed / Seed Specialists ──
        {
            "fund_name": "AlleyCorp",
            "investor_type": "vc_fund",
            "website": "https://alleycorp.com",
            "description": "Operator-generated concepts with physician GPs who have check-writing authority for healthcare investments.",
            "focus_sectors": ["Digital Health", "HealthTech", "AI", "FinTech"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$1M",
            "location": "New York, NY",
            "contact_name": "Kevin Ryan",
            "contact_email": "kevin@alleycorp.com",
            "contact_title": "Founder & CEO",
            "relevance_reason": "Physician GPs who understand healthcare workflows — they'll grasp why voice-to-contract AI matters for home care.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "3CC | Third Culture Capital",
            "investor_type": "vc_fund",
            "website": "https://thirdculturecap.com",
            "description": "Physician-led, immigrant-founded VC targeting structural health inequities with technology.",
            "focus_sectors": ["Digital Health", "HealthTech", "AI"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$250K - $1M",
            "location": "San Francisco, CA",
            "relevance_reason": "Mission-aligned: PalmCare serves diverse home care agencies. Health equity + lived experience founders focus.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Precursor Ventures",
            "investor_type": "vc_fund",
            "website": "https://precursorvc.com",
            "description": "Pre-seed focused fund backing underrepresented founders with hands-on support.",
            "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$250K - $1M",
            "location": "San Francisco, CA",
            "relevance_reason": "Pre-seed specialist backing diverse founders. Strong alignment with PalmCare's team and market.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Hustle Fund",
            "investor_type": "vc_fund",
            "website": "https://hustlefund.vc",
            "description": "Pre-seed micro-fund. Sweet spot $75K. Fast decisions, founder-friendly terms.",
            "focus_sectors": ["AI", "SaaS", "HealthTech"],
            "focus_stages": ["Pre-Seed"],
            "check_size_display": "$50K - $100K",
            "location": "San Francisco, CA",
            "contact_name": "Eric Bahn",
            "contact_email": "eric@hustlefund.vc",
            "contact_title": "General Partner",
            "relevance_reason": "Fast-moving pre-seed fund. Small checks but rapid decisions. Good for building round momentum.",
            "source": "signal.nfx.com",
            "priority": "medium",
        },
        {
            "fund_name": "1984 Ventures",
            "investor_type": "vc_fund",
            "website": "https://1984.vc",
            "description": "Targets unsexy, antiquated markets with technology. Alumni-focused Founders Programs.",
            "focus_sectors": ["AI", "Enterprise", "Digital Health"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$750K",
            "location": "San Francisco, CA",
            "relevance_reason": "Perfect thesis match — home care documentation IS an unsexy, antiquated market ripe for AI disruption.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Version One Ventures",
            "investor_type": "vc_fund",
            "website": "https://versiononeventures.com",
            "description": "Health IT pre-seed specialist. Sweet spot $625K. Led by Angela Tran.",
            "focus_sectors": ["HealthTech", "AI", "SaaS"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$500K - $750K",
            "location": "Vancouver, BC",
            "contact_name": "Angela Tran",
            "relevance_reason": "Health IT pre-seed specialist. PalmCare's AI documentation platform is a perfect fit.",
            "source": "signal.nfx.com",
            "priority": "high",
        },
        {
            "fund_name": "Max Altman (Saga Ventures)",
            "investor_type": "vc_fund",
            "website": "https://sagavc.com",
            "description": "Pre-seed/seed fund focused on AI and deep tech companies that will matter in 10 years.",
            "focus_sectors": ["AI", "Enterprise SaaS", "Deep Tech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$250K - $1M",
            "location": "Austin, TX",
            "contact_name": "Max Altman",
            "contact_email": "max@sagavc.com",
            "contact_title": "General Partner",
            "relevance_reason": "Long-term AI thesis. Understands how AI transforms legacy industries — perfect for home care disruption.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Black Flag Ventures",
            "investor_type": "vc_fund",
            "website": "https://blackflag.vc",
            "description": "Capital ($100K-$2M) and hands-on support for founders building in deeptech including biology and health.",
            "focus_sectors": ["Deep Tech", "AI", "HealthTech", "Biology"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$100K - $2M",
            "location": "San Francisco, CA",
            "relevance_reason": "Deep tech + health focus. PalmCare's AI voice processing is deep tech applied to healthcare.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "UB Ventures",
            "investor_type": "vc_fund",
            "website": "https://ubventures.com",
            "description": "Enterprise SaaS/AI focused seed fund backed by Uzabase. Invests in B2B software companies.",
            "focus_sectors": ["Enterprise SaaS", "AI", "B2B"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "New York, NY",
            "relevance_reason": "Enterprise SaaS/AI focus. PalmCare's B2B vertical SaaS model for home care agencies matches their thesis.",
            "source": "openvc.app",
            "priority": "medium",
        },
        # ── Accelerators ──
        {
            "fund_name": "Y Combinator",
            "investor_type": "accelerator",
            "website": "https://ycombinator.com",
            "description": "World's top accelerator. $500K standard deal. ~40% of recent batches AI-focused.",
            "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$500K",
            "location": "San Francisco, CA",
            "relevance_reason": "Gold standard for AI startups. YC healthcare vertical has produced major companies.",
            "source": "turbofund.io",
            "priority": "high",
        },
        # ── Angel Investors ──
        {
            "fund_name": "Adrian Aoun (Forward Health)",
            "investor_type": "angel",
            "website": "https://goforward.com",
            "description": "Founder/CEO of Forward (AI-powered primary care). Former Google special projects. Invests at AI+health frontier.",
            "focus_sectors": ["AI", "HealthTech", "Biotech", "Consumer AI"],
            "focus_stages": ["Seed"],
            "check_size_display": "$50K - $250K",
            "location": "San Francisco, CA",
            "relevance_reason": "Builds AI healthcare company (Forward). Understands voice AI in care settings. Endorsement signals massive credibility.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "Dharmesh Shah (HubSpot)",
            "investor_type": "angel",
            "website": "https://dharmesh.com",
            "description": "Co-founder/CTO of HubSpot. 80+ angel investments in B2B SaaS and AI companies.",
            "focus_sectors": ["AI", "SaaS", "Marketing Tech", "Developer Tools"],
            "focus_stages": ["Seed"],
            "check_size_display": "$100K - $500K",
            "location": "Boston, MA",
            "relevance_reason": "SaaS + AI expert. HubSpot built the CRM playbook — would understand PalmCare's vertical CRM approach.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Cory Levy (Z Fellows)",
            "investor_type": "angel",
            "website": "https://zfellows.com",
            "description": "Prolific early-stage angel with 45+ investments. Well-networked in AI pipeline.",
            "focus_sectors": ["AI", "Consumer AI", "Developer Tools", "Deep Tech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$25K - $100K",
            "location": "San Francisco, CA",
            "contact_name": "Cory Levy",
            "relevance_reason": "Strong AI network connector. Backing opens doors to other top-tier AI investors.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        # ── Syndicates ──
        {
            "fund_name": "Gaingels",
            "investor_type": "syndicate",
            "website": "https://gaingels.com",
            "description": "Community-first syndicate with 4,000+ members offering hands-on portfolio support.",
            "focus_sectors": ["Digital Health", "FinTech", "AI"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$200K - $500K",
            "location": "New York, NY",
            "relevance_reason": "Active healthcare syndicate with community support and follow-on capability.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        # ── Additional Researched Investors ──
        {
            "fund_name": "Obvious Ventures",
            "investor_type": "vc_fund",
            "website": "https://obvious.com",
            "description": "Impact VC backing companies solving critical challenges in health, sustainability, and economic empowerment.",
            "focus_sectors": ["HealthTech", "AI", "Climate", "Social Impact"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "San Francisco, CA",
            "contact_name": "Rohan Rajiv",
            "contact_email": "rohan@obvious.com",
            "contact_title": "Partner",
            "relevance_reason": "Impact VC with health focus. PalmCare addresses home care worker shortage — a critical healthcare challenge.",
            "portfolio_companies": ["Beyond Meat", "Livongo"],
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "New Enterprise Associates (NEA)",
            "investor_type": "vc_fund",
            "website": "https://nea.com",
            "description": "Long-tenured separate technology and healthcare practices under one roof.",
            "focus_sectors": ["HealthTech", "AI", "Enterprise", "FinTech"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$50K - $50M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Major healthcare investor with cross-portfolio AI expertise. Large fund supports multiple rounds.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Eric Schmidt (Innovation Endeavors)",
            "investor_type": "vc_fund",
            "website": "https://innovationendeavors.com",
            "description": "Former Google CEO. Deep tech and AI at commercial intersection.",
            "focus_sectors": ["AI", "Enterprise AI", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "Mountain View, CA",
            "relevance_reason": "Enterprise AI thesis + healthcare data security angle. PalmCare's HIPAA-compliant AI has enterprise appeal.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "David Sacks (Craft Ventures)",
            "investor_type": "vc_fund",
            "website": "https://craftventures.com",
            "description": "PayPal Mafia member. B2B SaaS with strong product-led growth and revenue models.",
            "focus_sectors": ["AI", "Enterprise SaaS", "B2B", "Future of Work"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $10M",
            "location": "San Francisco, CA",
            "relevance_reason": "B2B SaaS + AI focus. PalmCare's voice-to-contract workflow has strong product-led growth potential.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "AI Fund (Andrew Ng)",
            "investor_type": "vc_fund",
            "website": "https://aifund.ai",
            "description": "Andrew Ng's studio that builds and invests in AI companies across verticals including healthcare.",
            "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "Palo Alto, CA",
            "relevance_reason": "Andrew Ng's AI studio. PalmCare's production AI pipeline is exactly the type of applied AI they champion.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "NFX",
            "investor_type": "vc_fund",
            "website": "https://nfx.com",
            "description": "Network effects-focused VC investing at pre-seed and seed stages.",
            "focus_sectors": ["AI", "Marketplaces", "HealthTech", "FinTech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$500K - $5M",
            "location": "San Francisco, CA",
            "relevance_reason": "Network effects thesis — PalmCare creates network effects as more agencies adopt, improving AI models.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Primary Venture Partners",
            "investor_type": "vc_fund",
            "website": "https://primaryvc.com",
            "description": "NYC-based seed fund focused on enterprise and healthcare technology.",
            "focus_sectors": ["Enterprise", "HealthTech", "AI", "SaaS"],
            "focus_stages": ["Seed"],
            "check_size_display": "$500K - $3M",
            "location": "New York, NY",
            "relevance_reason": "Enterprise healthcare focus with NYC network for B2B health-tech startups.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Slow Ventures",
            "investor_type": "vc_fund",
            "website": "https://slow.co",
            "description": "Patient capital investor in healthcare and consumer technology.",
            "focus_sectors": ["HealthTech", "Consumer", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$250K - $2M",
            "location": "San Francisco, CA",
            "relevance_reason": "Patient capital approach suits PalmCare's enterprise sales cycle in home care.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Alumni Ventures",
            "investor_type": "vc_fund",
            "website": "https://alumniventuresgroup.com",
            "description": "Non-controlling co-investor with 750K+ subscriber network.",
            "focus_sectors": ["AI", "HealthTech", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$250K - $1M",
            "location": "Manchester, NH",
            "relevance_reason": "Large network co-investor with AI and healthcare verticals aligned with PalmCare.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "John Doerr (Kleiner Perkins)",
            "investor_type": "vc_fund",
            "website": "https://kleinerperkins.com",
            "description": "Chairman at Kleiner Perkins. Early backer of Google and Amazon. Focused on AI applied to health.",
            "focus_sectors": ["AI", "Health AI", "Climate Tech", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Explicit Health AI thesis. KP brand carries enormous signaling value for follow-on fundraising.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "Heal Ventures",
            "investor_type": "vc_fund",
            "website": "https://healventures.com",
            "description": "Healthcare-focused venture fund investing in digital health and health IT companies.",
            "focus_sectors": ["HealthTech", "Digital Health", "Health IT"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$250K",
            "check_size_max": "$1M",
            "check_size_display": "$250K - $1M",
            "location": "Boston, MA",
            "relevance_reason": "Healthcare-focused fund. PalmCare's health IT platform for home care is directly in their investment thesis.",
            "source": "openvc.app",
            "priority": "medium",
        },
        # ── Tier 4: New AI + Healthcare Investors (March 2026 Research) ──
        {
            "fund_name": "Tau Ventures",
            "investor_type": "vc_fund",
            "website": "https://tauventures.com",
            "description": "AI-first early-stage fund with $20M+ AUM. Partners include former Samsung NEXT, HealthIQ co-founder, and Norwest alumni.",
            "focus_sectors": ["AI", "HealthTech", "Enterprise", "Automation"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "Palo Alto, CA",
            "contact_name": "Amit Garg",
            "contact_email": "amit@tauventures.com",
            "contact_title": "Partner",
            "contact_linkedin": "https://linkedin.com/in/amitgarg",
            "relevance_reason": "AI-first fund with dedicated healthcare partner (Sharon Huang, ex-Novartis/Chan Zuckerberg). Digital health + automation thesis matches PalmCare perfectly.",
            "portfolio_companies": ["Various AI healthcare and enterprise startups"],
            "source": "tauventures.com",
            "priority": "high",
        },
        {
            "fund_name": "Exponential Capital",
            "investor_type": "vc_fund",
            "website": "https://www.exponentialcap.com",
            "description": "Investment partnership focused on healthcare AI and bioscience. $100M+ deployed across 10+ companies.",
            "focus_sectors": ["AI", "HealthTech", "Precision Medicine", "Healthcare Data"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "United States",
            "contact_linkedin": "https://linkedin.com/company/exponential-capital-management",
            "relevance_reason": "Backs AI-native workflow replacements for legacy clinical and operational systems — PalmCare replaces paper-based home care assessments with AI.",
            "portfolio_companies": ["Various healthcare AI companies"],
            "source": "exponentialcap.com",
            "priority": "high",
        },
        {
            "fund_name": "Radical Ventures",
            "investor_type": "vc_fund",
            "website": "https://radical.vc",
            "description": "AI-focused VC with deep ties to Geoffrey Hinton, Vector Institute, and Layer 6. Offers up to $250K in GPU credits.",
            "focus_sectors": ["AI", "HealthTech", "Cybersecurity", "FinTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_min": "$1M",
            "check_size_max": "$25M",
            "check_size_display": "$1M - $25M",
            "location": "Toronto, Canada / San Francisco, CA",
            "contact_email": "hello@radical.vc",
            "relevance_reason": "Pure AI fund with deep research ties and GPU credits. PalmCare's production AI pipeline (Deepgram + Claude) demonstrates technical depth they value.",
            "portfolio_companies": ["Cohere", "Waabi", "Various AI companies"],
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "General Catalyst (Health Assurance)",
            "investor_type": "vc_fund",
            "website": "https://www.generalcatalyst.com/health-assurance",
            "description": "$8B fund with $750M dedicated Health Assurance Fund. 23 global health system partners representing 15% of US healthcare.",
            "focus_sectors": ["HealthTech", "AI", "Digital Health", "Care Delivery"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_min": "$500K",
            "check_size_max": "$50M",
            "check_size_display": "$500K - $50M",
            "location": "Cambridge, MA / San Francisco, CA",
            "contact_name": "Hemant Taneja",
            "contact_title": "CEO & Managing Director",
            "relevance_reason": "Health Assurance thesis: AI transforming healthcare delivery with HIPAA compliance built in from day one. PalmCare's HIPAA-compliant voice AI is exactly this vision.",
            "portfolio_companies": ["Devoted Health", "Ro", "Ease Health"],
            "source": "generalcatalyst.com",
            "priority": "high",
        },
        {
            "fund_name": "Lux Capital",
            "investor_type": "vc_fund",
            "website": "https://www.luxcapital.com",
            "description": "Deep tech VC backing companies at 'the intersection of the new and the not-yet-imagined.' Dedicated health and bio team.",
            "focus_sectors": ["AI", "Deep Tech", "HealthTech", "BioTech"],
            "focus_stages": ["Seed", "Series A", "Series B"],
            "check_size_min": "$2M",
            "check_size_max": "$20M",
            "check_size_display": "$2M - $20M",
            "location": "New York, NY / Menlo Park, CA",
            "contact_name": "Deena Shakir",
            "contact_email": "info@luxcapital.com",
            "contact_title": "Partner, Digital Health",
            "contact_linkedin": "https://linkedin.com/in/deenashakir",
            "relevance_reason": "Partner Deena Shakir leads digital health investing with deep policy background. Josh Wolfe's conviction in deep tech AI aligns with PalmCare's technical moat.",
            "portfolio_companies": ["Benchling", "Elektra Labs", "Various health tech"],
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Floodgate",
            "investor_type": "vc_fund",
            "website": "https://www.floodgate.com",
            "description": "$750M fund specializing in pre-seed/seed. Ann Miura-Ko led SmarterDX ($1B+ exit in 2025) and Counsel Health.",
            "focus_sectors": ["AI", "HealthTech", "Enterprise", "Consumer"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "Menlo Park, CA",
            "contact_name": "Ann Miura-Ko",
            "contact_email": "ann@floodgate.com",
            "contact_title": "Co-Founding Partner",
            "contact_linkedin": "https://linkedin.com/in/annmiurako",
            "relevance_reason": "Software-first healthcare thesis led to $1B+ SmarterDX exit. PalmCare's AI documentation platform is software-first disruption of home care.",
            "portfolio_companies": ["SmarterDX", "Counsel Health", "Hebbia", "Lyft", "Twitch"],
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Initialized Capital",
            "investor_type": "vc_fund",
            "website": "https://initialized.com",
            "description": "Seed-stage fund founded by Garry Tan (now YC CEO) and Alexis Ohanian. $160M+ AUM.",
            "focus_sectors": ["AI", "Enterprise SaaS", "HealthTech", "FinTech"],
            "focus_stages": ["Seed"],
            "check_size_min": "$1M",
            "check_size_max": "$5M",
            "check_size_display": "$1M - $5M",
            "location": "San Francisco, CA",
            "contact_linkedin": "https://linkedin.com/company/initialized-capital",
            "relevance_reason": "Early investors in Coinbase, Instacart, Cruise, Flexport. Strong network for follow-on fundraising and go-to-market support.",
            "portfolio_companies": ["Coinbase", "Instacart", "Cruise", "Flexport", "Rippling"],
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "SeedtoB Capital",
            "investor_type": "vc_fund",
            "website": "https://seedtob.com",
            "description": "Atlanta-based fund focused on early-stage healthcare AI. Founded by Jvion executives (9-figure exit in 2019).",
            "focus_sectors": ["AI", "HealthTech", "Digital Health", "Clinical AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$2M",
            "check_size_display": "$500K - $2M",
            "location": "Atlanta, GA",
            "contact_name": "Ritesh Sharma",
            "contact_email": "info@seedtob.com",
            "contact_title": "Co-Founder & Managing Partner",
            "relevance_reason": "Founded by healthcare AI exit veterans (Jvion). Deep health system sales experience + networks to help PalmCare scale enterprise sales.",
            "portfolio_companies": ["OncoLens", "GritWell", "Feel Therapeutics", "Shimmer"],
            "source": "openvc.app",
            "priority": "high",
        },
        {
            "fund_name": "Beta Boom",
            "investor_type": "vc_fund",
            "website": "https://www.betaboom.com",
            "description": "Pre-seed/seed healthcare VC. No warm intro required. Decisions within 6 weeks. Based outside Silicon Valley.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI", "Telehealth"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$250K",
            "check_size_max": "$500K",
            "check_size_display": "$250K - $500K",
            "location": "United States",
            "contact_name": "Sergio Paluch",
            "contact_title": "Managing Partner",
            "relevance_reason": "No warm intro required, healthcare pre-seed/seed specialist. Invests in founders from diverse backgrounds outside SV. 6-week decision timeline.",
            "portfolio_companies": ["Various healthcare startups"],
            "source": "betaboom.com",
            "priority": "high",
        },
        {
            "fund_name": "Healthworx Ventures",
            "investor_type": "vc_fund",
            "website": "https://healthworxventures.com",
            "description": "Baltimore-based healthcare innovation ecosystem. Ventures arm + accelerator backed by CareFirst BCBS.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI", "Healthcare Services"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_min": "$250K",
            "check_size_max": "$2M",
            "check_size_display": "$250K - $2M",
            "location": "Baltimore, MD",
            "relevance_reason": "CareFirst BCBS-backed healthcare innovation fund. Payer connections could provide distribution channel to home care agencies.",
            "portfolio_companies": ["ShiftMed", "Safe Ride Health", "Better Health"],
            "source": "healthworxventures.com",
            "priority": "medium",
        },
        {
            "fund_name": "Davidovs Venture Collective (DVC)",
            "investor_type": "syndicate",
            "website": "https://dvc.ai",
            "description": "Community-driven AI VC with 170+ LP engineers/founders and 240+ portfolio founders. Seed fund + AI Fund I.",
            "focus_sectors": ["AI", "Machine Learning", "Enterprise AI", "Developer Tools"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$300K",
            "check_size_display": "$100K - $300K",
            "location": "Global",
            "relevance_reason": "LP base of 170+ AI engineers and founders provides massive network effect. Community validation from technical peers is powerful signal for AI startups.",
            "portfolio_companies": ["240+ AI portfolio companies"],
            "source": "dvc.ai",
            "priority": "medium",
        },
        {
            "fund_name": "Gelt Venture Capital",
            "investor_type": "vc_fund",
            "website": "https://gelt.vc",
            "description": "Sector-agnostic seed fund writing first checks across US, UK, Canada, Brazil, and Australia.",
            "focus_sectors": ["AI", "SaaS", "Enterprise", "HealthTech"],
            "focus_stages": ["Seed"],
            "check_size_min": "$250K",
            "check_size_max": "$1M",
            "check_size_display": "$250K - $1M",
            "location": "Global (US, UK, Canada, Brazil, Australia)",
            "relevance_reason": "Sector-agnostic seed fund that stays involved from prototype through scale. Portfolio includes AI companies like Hypereal AI.",
            "portfolio_companies": ["Hypereal AI", "Zenn.CEO"],
            "source": "gelt.vc",
            "priority": "medium",
        },
        {
            "fund_name": "Beta Fund (Beta Capital)",
            "investor_type": "vc_fund",
            "website": "https://www.beta.capital",
            "description": "Backs AI founders at inception stage. Focus on agentic AI, AI-native systems, and vertical AI SaaS.",
            "focus_sectors": ["AI", "Agentic AI", "Vertical SaaS", "Enterprise AI"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "United States",
            "relevance_reason": "Invests in AI-native vertical SaaS — PalmCare is an AI-native vertical SaaS for home care. Beta University network of 900+ founders and 300+ mentors.",
            "portfolio_companies": ["Various AI-native startups"],
            "source": "beta.capital",
            "priority": "high",
        },
        {
            "fund_name": "Tran.vc",
            "investor_type": "vc_fund",
            "website": "https://www.tran.vc",
            "description": "Pre-seed fund investing $50K in AI, software, and robotics. Focus on seed-strapping and technical founders with IP moats.",
            "focus_sectors": ["AI", "Software", "Robotics", "Digital Health"],
            "focus_stages": ["Pre-Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$50K",
            "check_size_display": "$50K",
            "location": "United States",
            "relevance_reason": "Supports AI-native software with healthcare applications (portfolio includes Maculus eye care, ObeSolve). IP strategy help adds value beyond capital.",
            "portfolio_companies": ["Maculus", "ObeSolve"],
            "source": "tran.vc",
            "priority": "medium",
        },
        {
            "fund_name": "Backstage Capital",
            "investor_type": "vc_fund",
            "website": "https://backstagecapital.com",
            "description": "Arlan Hamilton's fund investing in underrepresented founders — people of color, women, and LGBTQ+. 170+ portfolio companies.",
            "focus_sectors": ["AI", "SaaS", "Consumer", "HealthTech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$25K",
            "check_size_max": "$100K",
            "check_size_display": "$25K - $100K",
            "location": "Los Angeles, CA",
            "contact_name": "Arlan Hamilton",
            "contact_title": "Founder & Managing Partner",
            "relevance_reason": "Dedicated to minimizing funding disparities for underrepresented founders. 170+ portfolio companies provide strong community and network.",
            "portfolio_companies": ["170+ underrepresented founder-led companies"],
            "source": "backstagecapital.com",
            "priority": "medium",
        },
        {
            "fund_name": "Sequoia Capital (Scout/Seed)",
            "investor_type": "vc_fund",
            "website": "https://www.sequoiacap.com",
            "description": "$85B+ AUM. Backed OpenAI, Hugging Face, DeepMind. AI portfolio has collectively raised $30B+.",
            "focus_sectors": ["AI", "Enterprise", "HealthTech", "FinTech"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_min": "$1M",
            "check_size_max": "$8M",
            "check_size_display": "$1M - $8M",
            "location": "Menlo Park, CA",
            "relevance_reason": "World's top AI investor. Portfolio companies collectively raised $30B+. Sequoia brand signals highest-tier credibility.",
            "portfolio_companies": ["OpenAI", "Hugging Face", "DeepMind", "Harvey", "Stripe"],
            "source": "aifundingtracker.com",
            "priority": "high",
        },
        # ── Angel Investors (New) ──
        {
            "fund_name": "Daniel Gross (Angel)",
            "investor_type": "angel",
            "website": "https://dcgross.com",
            "description": "Former Apple AI director, Pioneer co-founder. Early believer in generative AI and autonomous systems.",
            "focus_sectors": ["AI", "Autonomous Systems", "Deep Tech", "Developer Tools"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$500K",
            "check_size_display": "$50K - $500K",
            "location": "San Francisco, CA",
            "contact_name": "Daniel Gross",
            "contact_linkedin": "https://linkedin.com/in/dangross",
            "relevance_reason": "Former Apple AI lead with deep conviction in applied AI. Backed AI-native companies before the current wave. Strong signal for AI investors.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "Guillermo Rauch (Angel)",
            "investor_type": "angel",
            "website": "https://rauchg.com",
            "description": "Vercel CEO. One of the most active tech angel investors with 100+ portfolio companies across AI and developer tools.",
            "focus_sectors": ["AI", "Developer Tools", "SaaS", "Infrastructure"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$25K",
            "check_size_max": "$250K",
            "check_size_display": "$25K - $250K",
            "location": "San Francisco, CA",
            "contact_name": "Guillermo Rauch",
            "contact_linkedin": "https://linkedin.com/in/rauchg",
            "relevance_reason": "100+ angel investments. Vercel CEO with massive developer community reach. PalmCare's Next.js web app runs on Vercel — natural alignment.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Kevin Weil (Angel)",
            "investor_type": "angel",
            "website": "https://linkedin.com/in/kevinweil",
            "description": "Chief Product Officer at OpenAI. Previously VP Product at Twitter, Instagram, and Libra/Novi at Meta.",
            "focus_sectors": ["AI", "Consumer AI", "Enterprise AI", "Product-Led"],
            "focus_stages": ["Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$250K",
            "check_size_display": "$50K - $250K",
            "location": "San Francisco, CA",
            "contact_name": "Kevin Weil",
            "contact_linkedin": "https://linkedin.com/in/kevinweil",
            "relevance_reason": "OpenAI CPO backing AI-first product companies. PalmCare's voice AI pipeline uses OpenAI — investment would signal product-market validation from inside OpenAI.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "Jeff Dean (Angel)",
            "investor_type": "angel",
            "website": "https://linkedin.com/in/jeffdean",
            "description": "Google DeepMind Chief Scientist. Investing selectively in frontier ML applied to hard scientific problems.",
            "focus_sectors": ["AI", "Machine Learning", "BioTech", "Scientific Computing"],
            "focus_stages": ["Seed"],
            "check_size_min": "$100K",
            "check_size_max": "$500K",
            "check_size_display": "$100K - $500K",
            "location": "Mountain View, CA",
            "contact_name": "Jeff Dean",
            "contact_linkedin": "https://linkedin.com/in/jeffdean",
            "relevance_reason": "Google DeepMind Chief Scientist. Investment signals highest-tier AI technical validation. Healthcare AI is at the intersection of his interests.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        # ── Healthcare-Specific New Funds ──
        {
            "fund_name": "Frist Cressey Ventures",
            "investor_type": "vc_fund",
            "website": "https://fristcressey.com",
            "description": "Healthcare-dedicated VC founded by former HCA Chairman. Deep health system operating experience and relationships.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI", "Healthcare Services"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "Nashville, TN",
            "relevance_reason": "Founded by the family behind HCA Healthcare. Nashville is the healthcare capital — connections to home health and post-acute care networks.",
            "portfolio_companies": ["Qualified Health", "Various health tech"],
            "source": "fristcressey.com",
            "priority": "high",
        },
        {
            "fund_name": "Town Hall Ventures",
            "investor_type": "vc_fund",
            "website": "https://townhallventures.com",
            "description": "Healthcare-focused VC investing in companies improving care delivery, health equity, and workforce challenges.",
            "focus_sectors": ["HealthTech", "Digital Health", "Healthcare Workforce", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "relevance_reason": "Healthcare workforce thesis — PalmCare directly addresses the nursing and caregiver workforce shortage through AI-powered documentation automation.",
            "portfolio_companies": ["Qualified Health", "Various healthcare workforce startups"],
            "source": "townhallventures.com",
            "priority": "high",
        },
        {
            "fund_name": "Flare Capital Partners",
            "investor_type": "vc_fund",
            "website": "https://flarecapital.com",
            "description": "Health tech VC focused on transforming healthcare through technology. Deep payer and provider network.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI", "Health IT"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$5M",
            "check_size_display": "$500K - $5M",
            "location": "Boston, MA",
            "relevance_reason": "Health tech specialist with payer and provider relationships. Co-invested with SignalFire in Qualified Health — active in AI healthcare deals.",
            "portfolio_companies": ["Qualified Health", "Various health IT companies"],
            "source": "flarecapital.com",
            "priority": "high",
        },
        {
            "fund_name": "Conductive Ventures",
            "investor_type": "vc_fund",
            "website": "https://conductiveventures.com",
            "description": "Enterprise-focused seed fund investing in healthcare IT, AI, and B2B SaaS.",
            "focus_sectors": ["Enterprise SaaS", "HealthTech", "AI", "B2B"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_min": "$500K",
            "check_size_max": "$3M",
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "relevance_reason": "Enterprise healthcare IT investor. Co-investor with Goldman Sachs in healthcare deals. PalmCare's B2B enterprise healthcare model fits their thesis.",
            "portfolio_companies": ["evolvedMD", "Various enterprise health IT"],
            "source": "conductiveventures.com",
            "priority": "medium",
        },
        {
            "fund_name": "Munch.VC",
            "investor_type": "syndicate",
            "website": "https://www.munch.vc",
            "description": "Led by Mohammad Musa (former Google head of product strategy). Invests in AI, autonomous vehicles, and robotics.",
            "focus_sectors": ["AI", "Robotics", "Autonomous Systems", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_min": "$50K",
            "check_size_max": "$250K",
            "check_size_display": "$50K - $250K",
            "location": "San Francisco, CA",
            "contact_name": "Mohammad Musa",
            "contact_title": "Lead",
            "relevance_reason": "Google product strategy background. Focuses on immediate revenue potential — PalmCare's $92K ARR demonstrates real market traction.",
            "source": "munch.vc",
            "priority": "medium",
        },
    ]
