import logging
import os
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

from .common import (
    ALL_US_STATES, STATE_NAMES, EMAIL_TEMPLATES, SEQUENCE_ORDER, SEQUENCE_DAYS,
    _render_template, _auto_start_sequence,
)
from .schemas import (
    LeadSummary, LeadDetail, LeadUpdate, LeadEmailRequest, BulkStatusUpdate,
    LeadStats, ImportRequest, CampaignSendRequest, SequenceLaunchRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Lead list, stats & email templates ───

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
    """Get aggregate stats for sales leads dashboard (single query)."""
    from sqlalchemy import case, literal_column

    row = db.query(
        func.count().label("total"),
        func.sum(case((SalesLead.status == "new", 1), else_=0)).label("new"),
        func.sum(case((SalesLead.status == "contacted", 1), else_=0)).label("contacted"),
        func.sum(case((SalesLead.status == "email_sent", 1), else_=0)).label("email_sent"),
        func.sum(case((SalesLead.status == "email_opened", 1), else_=0)).label("email_opened"),
        func.sum(case((SalesLead.status == "responded", 1), else_=0)).label("responded"),
        func.sum(case((SalesLead.status == "converted", 1), else_=0)).label("converted"),
        func.sum(case((SalesLead.status == "not_interested", 1), else_=0)).label("not_interested"),
        func.sum(case((SalesLead.status == "no_response", 1), else_=0)).label("no_response"),
        func.sum(case((SalesLead.state == "NE", 1), else_=0)).label("ne"),
        func.sum(case((SalesLead.state == "IA", 1), else_=0)).label("ia"),
        func.sum(case((and_(SalesLead.years_in_operation.isnot(None), SalesLead.years_in_operation <= 5), 1), else_=0)).label("last5"),
        func.sum(case((and_(SalesLead.years_in_operation.isnot(None), SalesLead.years_in_operation <= 10), 1), else_=0)).label("last10"),
        func.sum(case((and_(SalesLead.contact_email.isnot(None), SalesLead.contact_email != ""), 1), else_=0)).label("has_email"),
        func.sum(case((and_(SalesLead.website.isnot(None), SalesLead.website != ""), 1), else_=0)).label("has_website"),
    ).one()

    return LeadStats(
        total=row.total or 0,
        new=row.new or 0,
        contacted=row.contacted or 0,
        email_sent=row.email_sent or 0,
        email_opened=row.email_opened or 0,
        responded=row.responded or 0,
        converted=row.converted or 0,
        not_interested=row.not_interested or 0,
        no_response=row.no_response or 0,
        nebraska_count=row.ne or 0,
        iowa_count=row.ia or 0,
        last_5_years=row.last5 or 0,
        last_10_years=row.last10 or 0,
        has_email=row.has_email or 0,
        has_website=row.has_website or 0,
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


