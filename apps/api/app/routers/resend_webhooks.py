"""
Resend Webhook Handler — receives email events (opened, clicked, bounced, etc.)
and updates investor/lead records in the CRM automatically.

Webhook events: email.opened, email.clicked, email.bounced, email.complained,
email.delivered, email.suppressed
"""

import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import func

from app.db.session import SessionLocal
from app.models.investor import Investor
from app.models.sales_lead import SalesLead

logger = logging.getLogger(__name__)
router = APIRouter()


def _find_investor_by_email(db, to_email: str):
    """Find an investor by their contact_email (case-insensitive)."""
    return db.query(Investor).filter(
        func.lower(Investor.contact_email) == to_email.lower()
    ).first()


def _find_lead_by_email(db, to_email: str):
    """Find a sales lead by their contact_email (case-insensitive)."""
    return db.query(SalesLead).filter(
        func.lower(SalesLead.contact_email) == to_email.lower()
    ).first()


@router.post("/resend")
async def resend_webhook(request: Request):
    """Handle Resend webhook events for email tracking."""
    payload = await request.json()

    event_type = payload.get("type", "")
    data = payload.get("data", {})
    to_list = data.get("to", [])
    email_id = data.get("email_id", "")
    subject = data.get("subject", "")
    created_at = data.get("created_at", "")

    if not to_list:
        return {"ok": True, "detail": "no recipients"}

    to_email = to_list[0] if isinstance(to_list, list) else to_list
    now = datetime.now(timezone.utc)

    db = SessionLocal()
    try:
        inv = _find_investor_by_email(db, to_email)
        lead = _find_lead_by_email(db, to_email)

        if event_type == "email.opened":
            if inv:
                inv.email_open_count = (inv.email_open_count or 0) + 1
                inv.last_email_opened_at = now
                if inv.status in ("new", "researched", "email_sent"):
                    inv.status = "email_opened"
                inv.updated_at = now
                logger.info(f"Investor email opened: {inv.fund_name} ({to_email})")

            if lead:
                lead.email_open_count = (getattr(lead, "email_open_count", 0) or 0) + 1
                lead.last_email_opened_at = now
                lead.updated_at = now
                logger.info(f"Lead email opened: {lead.provider_name} ({to_email})")

        elif event_type == "email.clicked":
            if inv:
                inv.email_open_count = (inv.email_open_count or 0) + 1
                inv.last_email_opened_at = now
                if inv.status in ("new", "researched", "email_sent", "email_opened"):
                    inv.status = "email_opened"
                inv.updated_at = now
                logger.info(f"Investor email clicked: {inv.fund_name} ({to_email})")

        elif event_type == "email.bounced":
            if inv:
                log_entry = {
                    "event": "bounced",
                    "email_id": email_id,
                    "at": now.isoformat(),
                }
                activity = inv.activity_log or []
                activity.append(log_entry)
                inv.activity_log = activity
                inv.updated_at = now
                logger.warning(f"Investor email bounced: {inv.fund_name} ({to_email})")

        elif event_type == "email.complained":
            if inv:
                log_entry = {
                    "event": "spam_complaint",
                    "email_id": email_id,
                    "at": now.isoformat(),
                }
                activity = inv.activity_log or []
                activity.append(log_entry)
                inv.activity_log = activity
                inv.updated_at = now
                logger.warning(f"Investor marked as spam: {inv.fund_name} ({to_email})")

        elif event_type == "email.suppressed":
            if inv:
                log_entry = {
                    "event": "suppressed",
                    "email_id": email_id,
                    "at": now.isoformat(),
                }
                activity = inv.activity_log or []
                activity.append(log_entry)
                inv.activity_log = activity
                inv.updated_at = now
                logger.warning(f"Investor email suppressed: {inv.fund_name} ({to_email})")

        elif event_type == "email.delivered":
            if inv:
                if inv.status == "new":
                    inv.status = "email_sent"
                inv.updated_at = now

        db.commit()
        logger.info(f"Webhook processed: {event_type} -> {to_email}")

    except Exception as e:
        db.rollback()
        logger.error(f"Webhook processing error: {e}")
    finally:
        db.close()

    return {"ok": True, "event": event_type, "to": to_email}
