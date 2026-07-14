import logging
import os
import json
import time
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
    OPENED_REENGAGE_ORDER, REENGAGE_CAMPAIGN_TAG, REENGAGE_MIN_DAYS_BETWEEN,
    REENGAGE_DAILY_CAP, MARKETING_RESEND_TAG,
    _render_template, _auto_start_sequence,
)
from .schemas import (
    LeadSummary, LeadDetail, LeadUpdate, LeadEmailRequest, BulkStatusUpdate,
    LeadStats, ImportRequest, CampaignSendRequest, SequenceLaunchRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Campaigns & email sequences ───

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




@router.post("/leads/campaigns/sequence/launch")
async def launch_email_sequence(
    req: SequenceLaunchRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Launch the full drip sequence for matching leads.

    Sends Email 1 immediately and schedules the rest
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
    tmpl = EMAIL_TEMPLATES[SEQUENCE_ORDER[0]]
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
            lead.last_template_sent = SEQUENCE_ORDER[0]
            lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS[SEQUENCE_ORDER[1]])

            if lead.status == LeadStatus.new.value:
                lead.status = LeadStatus.email_sent.value
            if result.get("id"):
                lead.resend_email_id = result["id"]

            db.add(EmailCampaignEvent(
                lead_id=lead.id,
                template_id=SEQUENCE_ORDER[0],
                campaign_tag=req.campaign_name,
                event_type="sent",
                resend_email_id=result.get("id"),
                subject=subject,
                to_email=lead.contact_email,
                created_at=now,
            ))

            activity = lead.activity_log or []
            activity.append({
                "action": f"Sequence started (Email 1/{len(SEQUENCE_ORDER)})",
                "campaign": req.campaign_name,
                "template": SEQUENCE_ORDER[0],
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
        "next_batch": f"{SEQUENCE_ORDER[1]} in {SEQUENCE_DAYS[SEQUENCE_ORDER[1]]} days",
    }


def _process_due_sequence_emails(db: Session) -> dict:
    """Advance every lead whose next sequence email is due. Shared by the
    admin endpoint and the internal cron endpoint."""
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

        # Never send the same template twice to a lead, no matter which engine
        # sent it (sequence, opened-reengage, or the broad resend). Skip forward
        # over any step whose template this lead already received.
        already = {
            r[0] for r in db.query(EmailCampaignEvent.template_id).filter(
                EmailCampaignEvent.lead_id == lead.id,
                EmailCampaignEvent.event_type == "sent",
            ).all() if r[0]
        }
        while step < len(SEQUENCE_ORDER) and SEQUENCE_ORDER[step] in already:
            step += 1

        if step >= len(SEQUENCE_ORDER):
            lead.sequence_step = step
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
                "action": f"Sequence email {step + 1}/{len(SEQUENCE_ORDER)} sent",
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


def _reengage_templates_sent(lead_id, db: Session) -> set[str]:
    """Template IDs already sent in the opened-reengage campaign for this lead."""
    rows = db.query(EmailCampaignEvent.template_id).filter(
        EmailCampaignEvent.lead_id == lead_id,
        EmailCampaignEvent.campaign_tag == REENGAGE_CAMPAIGN_TAG,
        EmailCampaignEvent.event_type == "sent",
    ).all()
    return {r[0] for r in rows if r[0]}


def _next_reengage_template(sent_ids: set[str]) -> str | None:
    for tid in OPENED_REENGAGE_ORDER:
        if tid not in sent_ids:
            return tid
    return None


def _process_opened_reengagement(db: Session) -> dict:
    """Send the next unique Just PALM IT template to leads who opened but did not convert.

    Picks leads with at least one open, spaces sends REENGAGE_MIN_DAYS_BETWEEN apart,
    rotates through OPENED_REENGAGE_ORDER so every resend is a different email.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=REENGAGE_MIN_DAYS_BETWEEN)

    candidates = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
        SalesLead.status.notin_(["not_interested", "converted", "responded"]),
        or_(
            SalesLead.email_open_count >= 1,
            SalesLead.status == LeadStatus.email_opened.value,
        ),
        or_(
            SalesLead.last_email_sent_at.is_(None),
            SalesLead.last_email_sent_at <= cutoff,
        ),
    ).order_by(SalesLead.last_email_opened_at.desc().nullslast()).all()

    sent = 0
    skipped = 0
    exhausted = 0

    for lead in candidates:
        if sent >= REENGAGE_DAILY_CAP:
            break

        sent_ids = _reengage_templates_sent(lead.id, db)
        template_id = _next_reengage_template(sent_ids)
        if not template_id:
            exhausted += 1
            continue

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

        if not result.get("success"):
            skipped += 1
            continue

        lead.last_email_sent_at = now
        lead.last_email_subject = subject
        lead.email_send_count = (lead.email_send_count or 0) + 1
        lead.last_template_sent = template_id
        if result.get("id"):
            lead.resend_email_id = result["id"]
        if lead.status == LeadStatus.email_sent.value:
            lead.status = LeadStatus.email_opened.value

        db.add(EmailCampaignEvent(
            lead_id=lead.id,
            template_id=template_id,
            campaign_tag=REENGAGE_CAMPAIGN_TAG,
            event_type="sent",
            resend_email_id=result.get("id"),
            subject=subject,
            to_email=lead.contact_email,
            created_at=now,
        ))

        activity = lead.activity_log or []
        activity.append({
            "action": f"Opened-lead reengage sent ({template_id})",
            "campaign": REENGAGE_CAMPAIGN_TAG,
            "subject": subject,
            "at": now.isoformat(),
        })
        lead.activity_log = activity
        sent += 1

    db.commit()
    return {
        "candidates": len(candidates),
        "sent": sent,
        "skipped": skipped,
        "exhausted_all_templates": exhausted,
        "daily_cap": REENGAGE_DAILY_CAP,
    }


def _marketing_templates_sent(lead_id, db: Session) -> set[str]:
    """The new-marketing template IDs already sent to this lead, across ANY campaign
    (reengage or broad resend), so a lead never receives the same email twice."""
    rows = db.query(EmailCampaignEvent.template_id).filter(
        EmailCampaignEvent.lead_id == lead_id,
        EmailCampaignEvent.template_id.in_(OPENED_REENGAGE_ORDER),
        EmailCampaignEvent.event_type == "sent",
    ).all()
    return {r[0] for r in rows if r[0]}


def _process_marketing_resend(db: Session, limit: int = 50, dry_run: bool = True) -> dict:
    """Resend the new app-download marketing emails to every agency contacted before
    today. Rotates the 7 standalone templates, one unsent template per lead per run,
    engaged leads first. Stops cleanly if Resend returns a rate/quota error so we send
    as many as the plan allows without erroring out.
    """
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    candidates = db.query(SalesLead).filter(
        SalesLead.contact_email.isnot(None),
        SalesLead.contact_email != "",
        SalesLead.email_send_count > 0,
        SalesLead.last_email_sent_at < start_today,
        SalesLead.status.notin_(["not_interested", "converted", "responded"]),
    ).order_by(
        SalesLead.email_open_count.desc(),
        SalesLead.last_email_sent_at.asc(),
    ).all()

    total_matching = len(candidates)
    sent = 0
    failed = 0
    skipped = 0
    exhausted = 0
    consecutive_fail = 0
    per_template: dict[str, int] = {}
    sample: list[dict] = []
    sent_ids: list[dict] = []
    stopped_reason = None

    for lead in candidates:
        if sent >= limit:
            break

        template_id = _next_reengage_template(_marketing_templates_sent(lead.id, db))
        if not template_id:
            exhausted += 1
            continue
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

        if dry_run:
            per_template[template_id] = per_template.get(template_id, 0) + 1
            if len(sample) < 15:
                sample.append({
                    "provider": lead.provider_name,
                    "email": lead.contact_email,
                    "state": lead.state,
                    "template": template_id,
                })
            sent += 1
            continue

        result = email_service.send_email(
            to=lead.contact_email,
            subject=subject,
            sender=email_service.from_sales,
            html=body,
        )

        if not result.get("success"):
            err = (result.get("error") or "").lower()
            if any(k in err for k in ("rate", "quota", "limit", "daily", "429", "too many",
                                      "unauthorized", "api key", "api_key", "invalid", "forbidden", "401", "403")):
                stopped_reason = result.get("error")
                break
            failed += 1
            consecutive_fail += 1
            if consecutive_fail >= 5:
                stopped_reason = f"stopped after 5 consecutive send failures: {result.get('error')}"
                break
            continue

        consecutive_fail = 0
        lead.last_email_sent_at = now
        lead.last_email_subject = subject
        lead.email_send_count = (lead.email_send_count or 0) + 1
        lead.campaign_tag = MARKETING_RESEND_TAG
        lead.last_template_sent = template_id
        if result.get("id"):
            lead.resend_email_id = result["id"]

        db.add(EmailCampaignEvent(
            lead_id=lead.id,
            template_id=template_id,
            campaign_tag=MARKETING_RESEND_TAG,
            event_type="sent",
            resend_email_id=result.get("id"),
            subject=subject,
            to_email=lead.contact_email,
            created_at=now,
        ))
        activity = lead.activity_log or []
        activity.append({
            "action": f"Marketing resend sent ({template_id})",
            "campaign": MARKETING_RESEND_TAG,
            "subject": subject,
            "at": now.isoformat(),
        })
        lead.activity_log = activity
        per_template[template_id] = per_template.get(template_id, 0) + 1
        if result.get("id"):
            sent_ids.append({
                "lead_id": str(lead.id),
                "email": lead.contact_email,
                "resend_email_id": result["id"],
            })
        sent += 1
        time.sleep(0.55)  # stay under Resend's 2 req/sec

    if not dry_run:
        db.commit()

    return {
        "dry_run": dry_run,
        "total_already_emailed_before_today": total_matching,
        "limit": limit,
        ("would_send" if dry_run else "sent"): sent,
        "per_template": per_template,
        "exhausted_all_7_templates": exhausted,
        "failed": failed,
        "skipped": skipped,
        "stopped_reason": stopped_reason,
        "sample": sample if dry_run else None,
        "sent_ids": None if dry_run else sent_ids,
    }


@router.post("/leads/campaigns/sequence/process")
async def process_scheduled_emails(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Process all leads that have a scheduled next email due now or in the past.

    Call this endpoint periodically (cron, manual, or on-demand) to advance
    leads through the drip sequence.
    """
    return _process_due_sequence_emails(db)


@router.post("/leads/campaigns/reengage-opened")
async def reengage_opened_leads(
    db: Session = Depends(get_db),
    admin: User = Depends(require_permission("sales_leads")),
):
    """Send the next unique Just PALM IT email to leads who opened but did not convert."""
    return _process_opened_reengagement(db)


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

