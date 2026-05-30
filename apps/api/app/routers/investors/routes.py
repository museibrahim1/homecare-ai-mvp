import logging
import os
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, or_, cast, case, and_
from sqlalchemy.dialects.postgresql import JSONB
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.investor import Investor, InvestorStatus, InvestorType
from app.services.email import email_service

from .common import INVESTOR_EMAIL_TEMPLATES, _investor_email_wrap
from .seed_data import _get_seed_investors
from .schemas import (
    InvestorSummary, InvestorDetail, InvestorCreate, InvestorUpdate,
    BulkEmailRequest, SingleEmailRequest, BulkStatusUpdate, InvestorStats,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/email-templates")
def list_investor_email_templates(user: User = Depends(require_permission("investors"))):
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
def get_investor_email_template(template_id: str, user: User = Depends(require_permission("investors"))):
    """Get full email template with HTML body."""
    tmpl = INVESTOR_EMAIL_TEMPLATES.get(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.get("/stats", response_model=InvestorStats)
def get_investor_stats(db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
    """Single-query aggregate stats for investor dashboard."""
    row = db.query(
        func.count().label("total"),
        func.sum(case((Investor.status == "new", 1), else_=0)).label("new"),
        func.sum(case((Investor.status == "contacted", 1), else_=0)).label("contacted"),
        func.sum(case((Investor.status == "email_sent", 1), else_=0)).label("email_sent"),
        func.sum(case((Investor.status == "responded", 1), else_=0)).label("responded"),
        func.sum(case((Investor.status == "meeting_scheduled", 1), else_=0)).label("meeting"),
        func.sum(case((Investor.status == "interested", 1), else_=0)).label("interested"),
        func.sum(case((Investor.status == "passed", 1), else_=0)).label("passed"),
        func.sum(case((Investor.status == "committed", 1), else_=0)).label("committed"),
        func.sum(case((Investor.contact_email.isnot(None), 1), else_=0)).label("has_email"),
        func.sum(case((Investor.investor_type == "vc_fund", 1), else_=0)).label("vc_funds"),
        func.sum(case((Investor.investor_type == "angel", 1), else_=0)).label("angels"),
    ).one()

    return InvestorStats(
        total=row.total or 0, new=row.new or 0, contacted=row.contacted or 0,
        email_sent=row.email_sent or 0, responded=row.responded or 0,
        meeting_scheduled=row.meeting or 0, interested=row.interested or 0,
        passed=row.passed or 0, committed=row.committed or 0,
        has_email=row.has_email or 0, vc_funds=row.vc_funds or 0,
        angels=row.angels or 0, avg_priority_score=0,
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
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("investors")),
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
        import json as _json
        q = q.filter(Investor.focus_sectors.op("@>")(cast(_json.dumps([sector]), JSONB)))

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
def get_investor(investor_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
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
def create_investor(data: InvestorCreate, db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
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
def update_investor(investor_id: UUID, data: InvestorUpdate, db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
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
def delete_investor(investor_id: UUID, db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
    inv = db.query(Investor).filter(Investor.id == investor_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investor not found")
    db.delete(inv)
    db.commit()
    return {"ok": True}


@router.post("/batch-import")
def batch_import_investors(
    request: Request,
    investors: List[InvestorCreate],
    db: Session = Depends(get_db),
):
    """Batch import investors via internal API key. Skips duplicates by fund_name."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    added, skipped = 0, 0
    results = []
    for data in investors:
        existing = db.query(Investor).filter(Investor.fund_name == data.fund_name).first()
        if existing:
            skipped += 1
            results.append({"fund_name": data.fund_name, "status": "skipped", "reason": "already_exists"})
            continue

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
        added += 1
        results.append({"fund_name": data.fund_name, "status": "added"})

    db.commit()
    return {"added": added, "skipped": skipped, "results": results}


@router.post("/batch-update-emails")
def batch_update_emails(
    request: Request,
    updates: List[dict],
    db: Session = Depends(get_db),
):
    """Batch update investor contact emails via internal API key."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    updated, skipped, not_found = 0, 0, 0
    results = []
    for item in updates:
        fund_name = item.get("fund_name", "")
        contact_email = item.get("contact_email", "")
        if not fund_name or not contact_email:
            skipped += 1
            results.append({"fund_name": fund_name, "status": "skipped", "reason": "missing_data"})
            continue

        inv = db.query(Investor).filter(Investor.fund_name == fund_name).first()
        if not inv:
            not_found += 1
            results.append({"fund_name": fund_name, "status": "not_found"})
            continue

        force = item.get("force", False)
        if inv.contact_email and inv.contact_email.strip() and not force:
            skipped += 1
            results.append({"fund_name": fund_name, "status": "skipped", "reason": "already_has_email", "existing": inv.contact_email})
            continue

        inv.contact_email = contact_email
        if item.get("contact_name"):
            inv.contact_name = item["contact_name"]
        inv.updated_at = datetime.now(timezone.utc)
        updated += 1
        results.append({"fund_name": fund_name, "status": "updated", "email": contact_email})

    db.commit()
    return {"updated": updated, "skipped": skipped, "not_found": not_found, "results": results}


@router.post("/batch-mark-sent")
def batch_mark_emails_sent(
    request: Request,
    updates: List[dict],
    db: Session = Depends(get_db),
):
    """Batch mark investors as emailed via internal API key.
    Each item: {"contact_email": "...", "subject": "...", "send_count": 1}
    """
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    updated, not_found = 0, 0
    now = datetime.now(timezone.utc)
    for item in updates:
        email = item.get("contact_email", "").strip().lower()
        if not email:
            continue
        inv = db.query(Investor).filter(
            func.lower(Investor.contact_email) == email
        ).first()
        if not inv:
            not_found += 1
            continue
        send_count = item.get("send_count", 1)
        inv.email_send_count = (inv.email_send_count or 0) + send_count
        inv.last_email_sent_at = now
        inv.last_email_subject = item.get("subject", inv.last_email_subject)
        if inv.status in ("new", "researched"):
            inv.status = "email_sent"
        inv.updated_at = now
        updated += 1

    db.commit()
    return {"updated": updated, "not_found": not_found, "total": len(updates)}


@router.post("/bulk-status")
def bulk_update_status(data: BulkStatusUpdate, db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
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
    user: User = Depends(require_permission("investors")),
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
    user: User = Depends(require_permission("investors")),
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
def seed_investor_data(db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
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
def clear_all_investors(db: Session = Depends(get_db), user: User = Depends(require_permission("investors"))):
    """Clear all investor data (dev/reset only)."""
    deleted = db.query(Investor).delete()
    db.commit()
    return {"deleted": deleted}


