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


# ─── Routes ───

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
            personalized_body = personalized_body.replace("{contact_name}", inv.contact_name or "there")
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
    """Seed the investor database with researched AI/HealthTech/SaaS investors."""
    existing = db.query(func.count(Investor.id)).scalar() or 0
    if existing > 0:
        return {"message": f"Already have {existing} investors. Use DELETE /clear first.", "seeded": 0}

    investors_data = _get_seed_investors()
    for data in investors_data:
        inv = Investor(**data)
        db.add(inv)

    db.commit()
    return {"seeded": len(investors_data), "message": f"Added {len(investors_data)} investors"}


@router.delete("/clear-all")
def clear_all_investors(db: Session = Depends(get_db), user: User = Depends(require_ceo)):
    """Clear all investor data (dev/reset only)."""
    deleted = db.query(Investor).delete()
    db.commit()
    return {"deleted": deleted}


def _get_seed_investors() -> list:
    """Curated list of AI, HealthTech, and relevant seed/pre-seed investors."""
    return [
        # ── AI + HealthTech VC Funds (from vcsheet.com healthcare & digital health) ──
        {
            "fund_name": "Rock Health Capital",
            "investor_type": "vc_fund",
            "website": "https://rockhealth.com",
            "description": "Digital health-focused VC combining venture capital, enterprise advisory, and nonprofit access to proprietary digital-health data.",
            "focus_sectors": ["HealthTech", "Digital Health", "AI"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$500K - $3M",
            "location": "San Francisco, CA",
            "relevance_reason": "Pure-play digital health investor. PalmCare's AI-native care documentation fits their thesis of technology-driven healthcare transformation.",
            "source": "vcsheet.com",
            "priority": "high",
        },
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
            "fund_name": "Khosla Ventures",
            "investor_type": "vc_fund",
            "website": "https://khosla.com",
            "description": "Aggressive techno-optimist investor backing healthcare and deep-tech bets with high risk tolerance.",
            "focus_sectors": ["AI", "HealthTech", "Deep Tech", "Climate"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$500K - $50M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Known for backing AI-first healthcare companies. Their willingness to fund transformative care technology aligns with PalmCare's vision.",
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
            "relevance_reason": "Joe Lonsdale's fund backs healthcare technology that replaces legacy workflows — direct fit for PalmCare replacing manual care documentation.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Canaan Partners",
            "investor_type": "vc_fund",
            "website": "https://canaan.com",
            "description": "60/40 tech/healthcare split with deliberate focus on company formation and a transparent partner scoring system.",
            "focus_sectors": ["HealthTech", "Enterprise", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $10M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Deep healthcare practice with AI focus. Their deliberate healthcare allocation makes them an ideal fit for AI-native care platforms.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "AlleyCorp",
            "investor_type": "vc_fund",
            "website": "https://alleycorp.com",
            "description": "Operator-generated concepts with physician GPs who have check-writing authority for healthcare investments.",
            "focus_sectors": ["Digital Health", "HealthTech", "AI", "FinTech"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$1M",
            "location": "New York, NY",
            "relevance_reason": "Physician GPs who understand healthcare workflows — they'll immediately grasp why voice-to-contract AI matters for home care.",
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
            "relevance_reason": "Mission-aligned: PalmCare serves diverse home care agencies, many immigrant-founded. Their focus on health equity + lived experience founders fits perfectly.",
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
            "relevance_reason": "Strong AI+Healthcare crossover thesis. Their enterprise SaaS expertise aligns with PalmCare's B2B model for home care agencies.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "F-Prime Capital",
            "investor_type": "vc_fund",
            "website": "https://fprimecapital.com",
            "description": "Fidelity-backed formation engine combining healthcare and tech expertise. Formerly Fidelity Biosciences.",
            "focus_sectors": ["HealthTech", "AI", "Biotech"],
            "focus_stages": ["Seed", "Series A", "Series B+"],
            "check_size_display": "$100K - $10M",
            "location": "Cambridge, MA",
            "relevance_reason": "Healthcare-tech focus with Fidelity backing. Their interest in tech feasibility over regulatory risk suits PalmCare's HIPAA-compliant AI approach.",
            "source": "vcsheet.com",
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
            "relevance_reason": "Major healthcare investor with cross-portfolio AI expertise. Large fund able to support through multiple rounds.",
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
            "relevance_reason": "Data-driven VC with strong AI thesis. Their health tech vertical and multi-stage capability could support PalmCare through growth.",
            "source": "openvc.app",
            "priority": "medium",
        },
        {
            "fund_name": "Seed Healthcare",
            "investor_type": "vc_fund",
            "website": "https://www.seedhealthcare.com",
            "description": "Exclusively healthcare venture investing. $100M fund in development.",
            "focus_sectors": ["Digital Health", "HealthTech", "MedTech"],
            "focus_stages": ["Seed", "Series A", "Series B"],
            "check_size_display": "$500K - $5M",
            "location": "New York, NY / Tel Aviv",
            "relevance_reason": "Pure healthcare seed investor — their exclusive focus on healthcare startups means they understand care delivery innovation deeply.",
            "source": "openvc.app",
            "priority": "high",
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
            "relevance_reason": "Perfect thesis match — home care documentation IS an unsexy, antiquated market ripe for AI disruption. PalmCare is exactly what they look for.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Slow Ventures",
            "investor_type": "vc_fund",
            "website": "https://slow.co",
            "description": "Patient capital investor in healthcare and consumer technology with long-term orientation.",
            "focus_sectors": ["HealthTech", "Consumer", "AI"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$250K - $2M",
            "location": "San Francisco, CA",
            "relevance_reason": "Healthcare allocation with patient capital approach suits PalmCare's enterprise sales cycle in home care.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Alumni Ventures",
            "investor_type": "vc_fund",
            "website": "https://alumniventuresgroup.com",
            "description": "Non-controlling co-investor with 750K+ subscriber network and ~1,400 founders as operating asset.",
            "focus_sectors": ["AI", "HealthTech", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$250K - $1M",
            "location": "Manchester, NH",
            "relevance_reason": "Large network co-investor that adds distribution. Their AI and healthcare verticals align with PalmCare.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Gaingels",
            "investor_type": "syndicate",
            "website": "https://gaingels.com",
            "description": "Community-first syndicate with 4,000+ members offering hands-on portfolio support.",
            "focus_sectors": ["Digital Health", "FinTech", "AI"],
            "focus_stages": ["Pre-Seed", "Seed", "Series A"],
            "check_size_display": "$200K - $500K",
            "location": "New York, NY",
            "relevance_reason": "Active healthcare syndicate that adds community support and follow-on. Good fit for PalmCare's inclusion-first approach.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        # ── AI-Focused Angel Investors (from TurboFund research) ──
        {
            "fund_name": "Adrian Aoun (Forward Health)",
            "investor_type": "angel",
            "website": "https://goforward.com",
            "description": "Founder/CEO of Forward (AI-powered primary care). Former Google special projects lead. Invests at AI+health frontier.",
            "focus_sectors": ["AI", "HealthTech", "Biotech", "Consumer AI"],
            "focus_stages": ["Seed"],
            "check_size_display": "$50K - $250K",
            "location": "San Francisco, CA",
            "relevance_reason": "HIGHEST relevance — builds AI healthcare company (Forward). Deeply understands voice AI in care settings. His endorsement signals massive credibility.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "John Doerr (Kleiner Perkins)",
            "investor_type": "vc_fund",
            "website": "https://kleinerperkins.com",
            "description": "Chairman at Kleiner Perkins. Early backer of Google and Amazon. Focused on AI applied to climate and health.",
            "focus_sectors": ["AI", "Health AI", "Climate Tech", "Deep Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "Menlo Park, CA",
            "relevance_reason": "Explicit Health AI thesis. KP brand carries enormous signaling value for follow-on fundraising.",
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
            "relevance_reason": "SaaS + AI expert. HubSpot built the CRM playbook — Dharmesh would understand PalmCare's vertical CRM approach for home care.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Eric Schmidt (Innovation Endeavors)",
            "investor_type": "vc_fund",
            "website": "https://innovationendeavors.com",
            "description": "Former Google CEO. Invests in deep tech and AI at commercial/national security intersection.",
            "focus_sectors": ["AI", "Enterprise AI", "Deep Tech", "National Security"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$500K - $5M",
            "location": "Mountain View, CA",
            "relevance_reason": "Enterprise AI thesis + healthcare data security angle. PalmCare's HIPAA-compliant AI documentation has dual-use implications.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "David Sacks (Craft Ventures)",
            "investor_type": "vc_fund",
            "website": "https://craftventures.com",
            "description": "PayPal Mafia member. Sharp eye for B2B SaaS with strong product-led growth and revenue models.",
            "focus_sectors": ["AI", "Enterprise SaaS", "B2B", "Future of Work"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $10M",
            "location": "San Francisco, CA",
            "relevance_reason": "B2B SaaS + AI focus with PLG thesis. PalmCare's voice-to-contract workflow has strong product-led growth potential.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Bill Gates (Breakthrough Energy / Gates Foundation)",
            "investor_type": "angel",
            "website": "https://breakthroughenergy.org",
            "description": "Invests personally and through Breakthrough Energy in AI companies targeting global health.",
            "focus_sectors": ["AI", "Health AI", "Biotech", "Climate Tech"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $25M",
            "location": "Seattle, WA",
            "relevance_reason": "Global health AI thesis. Home care AI addresses critical care worker shortage — a problem Gates Foundation actively researches.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        # ── Pre-Seed Specialists (from vcsheet.com pre-seed sheet) ──
        {
            "fund_name": "Precursor Ventures",
            "investor_type": "vc_fund",
            "website": "https://precursorvc.com",
            "description": "Pre-seed focused fund backing underrepresented founders with hands-on support.",
            "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$250K - $1M",
            "location": "San Francisco, CA",
            "relevance_reason": "Pre-seed specialist with healthcare interest. Backs diverse founders — strong alignment with PalmCare's team and market.",
            "source": "vcsheet.com",
            "priority": "high",
        },
        {
            "fund_name": "Hustle Fund",
            "investor_type": "vc_fund",
            "website": "https://hustlefund.vc",
            "description": "Pre-seed micro-fund. Sweet spot $75K ($50K-$100K). Fast decisions, founder-friendly terms.",
            "focus_sectors": ["AI", "SaaS", "HealthTech"],
            "focus_stages": ["Pre-Seed"],
            "check_size_display": "$50K - $100K",
            "location": "San Francisco, CA",
            "relevance_reason": "Fast-moving pre-seed fund. Small checks but rapid decisions. Good for building momentum in a pre-seed round.",
            "source": "signal.nfx.com",
            "priority": "medium",
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
            "relevance_reason": "Health IT pre-seed specialist — one of the top-ranked health IT pre-seed investors. PalmCare's AI documentation platform is a perfect fit.",
            "source": "signal.nfx.com",
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
            "relevance_reason": "Network effects thesis — PalmCare's platform creates network effects as more agencies adopt, improving AI models and templates.",
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
            "relevance_reason": "Enterprise healthcare focus with NYC network. Strong operational support for B2B health-tech startups.",
            "source": "vcsheet.com",
            "priority": "medium",
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
            "relevance_reason": "Long-term AI thesis with deep industry knowledge. Understands how AI transforms legacy industries — perfect for home care disruption.",
            "source": "turbofund.io",
            "priority": "medium",
        },
        {
            "fund_name": "Cory Levy (Z Fellows)",
            "investor_type": "angel",
            "website": "https://zfellows.com",
            "description": "Prolific early-stage angel with 45+ investments. Well-networked in AI research-to-startup pipeline.",
            "focus_sectors": ["AI", "Consumer AI", "Developer Tools", "Deep Tech"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$25K - $100K",
            "location": "San Francisco, CA",
            "contact_name": "Cory Levy",
            "relevance_reason": "Strong AI network connector. His backing opens doors to other top-tier AI investors.",
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
            "relevance_reason": "Deep tech + health focus with hands-on support. PalmCare's AI voice processing technology qualifies as deep tech applied to healthcare.",
            "source": "vcsheet.com",
            "priority": "medium",
        },
        {
            "fund_name": "Y Combinator",
            "investor_type": "accelerator",
            "website": "https://ycombinator.com",
            "description": "World's top accelerator. $500K standard deal. ~40% of recent batches AI-focused.",
            "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
            "focus_stages": ["Pre-Seed", "Seed"],
            "check_size_display": "$500K",
            "location": "San Francisco, CA",
            "relevance_reason": "Gold standard for AI startups. YC's healthcare vertical has produced major companies. Application-based but highest-signal possible.",
            "source": "turbofund.io",
            "priority": "high",
        },
        {
            "fund_name": "Upfront Ventures",
            "investor_type": "vc_fund",
            "website": "https://upfront.com",
            "description": "$2B+ AUM fund investing in healthtech, biotech, AI/ML, digital health, and care delivery.",
            "focus_sectors": ["HealthTech", "AI", "Digital Health", "SaaS"],
            "focus_stages": ["Seed", "Series A"],
            "check_size_display": "$1M - $8M",
            "location": "Los Angeles, CA",
            "relevance_reason": "Major healthcare + AI investor with $2B+ AUM. Their care delivery focus maps directly to PalmCare's market.",
            "source": "openvc.app",
            "priority": "high",
        },
    ]
