import logging
import os
import uuid as _uuid
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, case, and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

from .common import (
    _drafts,
    EXCLUDED_LEAD_STATUSES, EXCLUDED_CALL_STATUSES, EXCLUDED_INVESTOR_STATUSES,
    PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER, TZ_ORDER,
    BUSINESS_TZ, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY,
    FULL_WORK_DAYS, LAUNCH_DATE,
    EASTERN_STATES, CENTRAL_STATES, MOUNTAIN_STATES, PACIFIC_STATES,
    AGENCY_SUBJECT_HOOKS, AGENCY_TEMPLATES, AGENCY_FOOTER, SITE_URL, IMG, PITCH_DECK_URL,
    _now_eastern, _today_eastern, _today_start, _week_bounds,
    _build_agency_html, _build_investor_text,
    _week_work_days, _cumulative_days_before,
)
from .schemas import (
    AgencyEmailItem, AgencyCallItem, InvestorEmailItem, OutreachStats,
    WeekDayProgress, DailyPlanResponse, MarkCalledBody, GenerateDraftBody,
    DraftResponse, ApproveDraftBody, WeeklySummaryResponse,
    AgencyDraftItem, InvestorDraftItem, WeeklyDayPlan, WeeklyPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate-draft", response_model=DraftResponse)
def generate_draft(
    body: GenerateDraftBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
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
    return DraftResponse(**{k: draft[k] for k in DraftResponse.model_fields})


@router.get("/drafts")
def list_drafts(user: User = Depends(require_permission("command_center"))):
    return list(_drafts.values())


@router.post("/approve-draft/{draft_id}")
def approve_draft(
    draft_id: str,
    body: ApproveDraftBody = ApproveDraftBody(),
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
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
            reply_to="sales@palmcareai.com",
            sender="Muse Ibrahim <sales@palmcareai.com>",
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
            reply_to="invest@palmtai.com" if target_type == "investor" else "sales@palmcareai.com",
            attachments=attachments,
            sender="Muse Ibrahim <invest@send.palmtai.com>" if target_type == "investor" else "Muse Ibrahim <sales@palmcareai.com>",
        )

    if not result.get("success"):
        raise HTTPException(
            status_code=502,
            detail=f"Email failed to send: {result.get('error', 'unknown error')}",
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

            from app.routers.sales_leads import _auto_start_sequence
            _auto_start_sequence(lead, lead.campaign_tag or "outreach-draft", db)

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


class BatchSendRequest(BaseModel):
    day_index: int
    week_offset: int = 0
    types: List[str] = ["agency", "investor"]


@router.post("/batch-send")
def batch_send_day(
    body: BatchSendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Send all unsent emails for a given day. Only sends to leads whose last email
    was sent BEFORE the assigned day (avoids double-sending)."""
    import time as _time

    work_days = _week_work_days(body.week_offset)
    if body.day_index < 0 or body.day_index >= len(work_days):
        raise HTTPException(status_code=400, detail="Invalid day_index")
    day_name, day_date = work_days[body.day_index]
    global_idx = _cumulative_days_before(body.week_offset) + body.day_index

    results = {"agencies": {"sent": 0, "skipped": 0, "failed": 0, "errors": []},
               "investors": {"sent": 0, "skipped": 0, "failed": 0, "errors": []}}
    now = datetime.now(timezone.utc)

    if "agency" in body.types:
        unsent_agencies = (
            db.query(SalesLead)
            .filter(
                SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
            )
            .order_by(PRIORITY_ORDER, SalesLead.created_at)
            .limit(EMAILS_PER_DAY)
            .all()
        )
        day_agencies = unsent_agencies

        for lead in day_agencies:
            if lead.last_email_sent_at and lead.last_email_sent_at.date() >= day_date:
                results["agencies"]["skipped"] += 1
                continue

            subj, body_html = _build_agency_html(
                lead.provider_name, lead.city or "your area", lead.state or "US"
            )
            result = email_service.send_email(
                to=lead.contact_email, subject=subj, html=body_html,
                reply_to="sales@palmcareai.com",
                sender="Muse Ibrahim <sales@palmcareai.com>",
            )
            if result.get("success"):
                lead.last_email_sent_at = now
                lead.last_email_subject = subj
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.status = "email_sent"
                lead.updated_at = now
                activity = list(lead.activity_log or [])
                activity.append({"action": "email_sent", "timestamp": now.isoformat(),
                                 "subject": subj, "by": user.email})
                lead.activity_log = activity
                results["agencies"]["sent"] += 1
            else:
                results["agencies"]["failed"] += 1
                results["agencies"]["errors"].append(
                    f"{lead.provider_name}: {result.get('error', 'unknown')}"
                )
            _time.sleep(0.6)

    if "investor" in body.types:
        unsent_investors = (
            db.query(Investor)
            .filter(
                Investor.contact_email.isnot(None), Investor.contact_email != "",
                Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
            )
            .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
            .limit(INVESTORS_PER_DAY)
            .all()
        )
        day_investors = unsent_investors

        for inv in day_investors:
            if inv.last_email_sent_at and inv.last_email_sent_at.date() >= day_date:
                results["investors"]["skipped"] += 1
                continue

            focus = ", ".join(inv.focus_sectors or []) or "early-stage technology"
            subj, body_text = _build_investor_text(
                inv.fund_name, inv.contact_name or "", focus
            )
            html = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{body_text}</pre>"
            result = email_service.send_email(
                to=inv.contact_email, subject=subj, html=html, text=body_text,
                reply_to="invest@palmtai.com",
                sender="Muse Ibrahim <invest@send.palmtai.com>",
            )
            if result.get("success"):
                inv.last_email_sent_at = now
                inv.last_email_subject = subj
                inv.email_send_count = (inv.email_send_count or 0) + 1
                inv.status = "email_sent"
                inv.updated_at = now
                activity = list(inv.activity_log or [])
                activity.append({"action": "email_sent", "timestamp": now.isoformat(),
                                 "subject": subj, "by": user.email})
                inv.activity_log = activity
                results["investors"]["sent"] += 1
            else:
                results["investors"]["failed"] += 1
                results["investors"]["errors"].append(
                    f"{inv.fund_name}: {result.get('error', 'unknown')}"
                )
            _time.sleep(0.6)

    db.commit()
    return {"ok": True, "day": day_name, "date": day_date.isoformat(), "results": results}


@router.delete("/drafts/{draft_id}")
def delete_draft(draft_id: str, user: User = Depends(require_permission("command_center"))):
    if draft_id not in _drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    del _drafts[draft_id]
    return {"ok": True, "draft_id": draft_id}


