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

# ─── Per-lead email send, open/response logging, webhook ───

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

