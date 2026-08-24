"""
Resend Webhook Handler — receives email events (opened, clicked, bounced, etc.)
and updates investor/lead records in the CRM automatically.

Webhook events: email.opened, email.clicked, email.bounced, email.complained,
email.delivered, email.suppressed
"""

import os
import json
import hmac
import hashlib
import base64
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import func

from app.db.session import SessionLocal
from app.models.investor import Investor
from app.models.sales_lead import SalesLead

logger = logging.getLogger(__name__)
router = APIRouter()

# Hot outreach: email Muse immediately when these contacts open or click.
WATCHED_OUTREACH_EMAILS = {
    "familylovebehavioral@gmail.com": "Nurdennis Pena / Family Love Behavioral",
    "info@ednascarehhc.com": "Wanda / Edna's Care",
    "kenatriplett@accentcare.com": "Kena / AccentCare",
    "staciewitts@comfortkeepers.com": "Stacie Witts / Comfort Keepers",
}
ENGAGEMENT_ALERT_TO = [
    e.strip()
    for e in (os.getenv("ADMIN_NOTIFICATION_EMAILS") or os.getenv("ADMIN_NOTIFICATION_EMAIL") or "museibrahim@palmtai.com").split(",")
    if e.strip()
]

# Process-local fallback when Redis is down (survives only until restart).
_ALERT_DEDUPE_SEEN: set[str] = set()
_ALERT_DEDUPE_TTL_SECONDS = 60 * 60 * 24 * 120  # 120 days


def _claim_engagement_alert(email_id: str, kind: str) -> bool:
    """Return True only the first time we should alert for this email_id + kind.

    Resend can fire email.opened many times (prefetch, re-open). Muse only
    wants the first open and the first click per outbound message.
    """
    if not email_id:
        return False
    key = f"engagement_alert:{email_id}:{kind}"

    try:
        import redis
        from app.core.config import settings

        r = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        claimed = r.set(key, "1", nx=True, ex=_ALERT_DEDUPE_TTL_SECONDS)
        return bool(claimed)
    except Exception as exc:
        logger.warning(f"Engagement alert Redis dedupe unavailable: {exc}")

    if key in _ALERT_DEDUPE_SEEN:
        return False
    _ALERT_DEDUPE_SEEN.add(key)
    return True


def _verify_resend_signature(
    raw_body: bytes,
    svix_id: str,
    svix_timestamp: str,
    svix_signature: str,
    secret: str,
) -> bool:
    """Verify a Resend (Svix) webhook signature.

    Resend signs webhooks with Svix using HMAC-SHA256 over
    `{svix_id}.{svix_timestamp}.{body}`. The signature header may include
    multiple `v1,<base64>` pairs space-separated; any one valid match is
    enough.

    The secret can be either a plain string or the `whsec_<base64>` form
    that Resend's dashboard issues — we strip the prefix and base64-decode
    the rest when present.
    """
    if not (svix_id and svix_timestamp and svix_signature and secret):
        return False

    if secret.startswith("whsec_"):
        try:
            key = base64.b64decode(secret[len("whsec_"):])
        except Exception:
            return False
    else:
        key = secret.encode("utf-8")

    payload = f"{svix_id}.{svix_timestamp}.".encode("utf-8") + raw_body
    expected = base64.b64encode(hmac.new(key, payload, hashlib.sha256).digest()).decode("utf-8")

    for sig in svix_signature.split():
        if "," not in sig:
            continue
        _ver, value = sig.split(",", 1)
        if hmac.compare_digest(value, expected):
            return True
    return False


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


def _alert_muse_engagement(
    *,
    to_email: str,
    label: str,
    event_type: str,
    subject: str,
    email_id: str,
    click_link: str = "",
) -> None:
    """Fire-and-forget Resend alert when a watched outreach email is opened/clicked."""
    import requests as _requests

    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key or not ENGAGEMENT_ALERT_TO:
        return

    kind = "OPENED" if event_type == "email.opened" else "CLICKED"
    click_row = (
        f'<p style="margin:0 0 4px;color:#334155;"><strong>Link:</strong> {click_link}</p>'
        if click_link
        else ""
    )
    html = f"""
    <div style="font-family:-apple-system,sans-serif;max-width:560px;">
      <div style="background:#ecfdf5;border:1px solid #99f6e4;border-radius:12px;padding:20px;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f766e;">
          Outreach email {kind}
        </p>
        <p style="margin:0 0 4px;color:#334155;"><strong>Who:</strong> {label}</p>
        <p style="margin:0 0 4px;color:#334155;"><strong>Email:</strong> {to_email}</p>
        <p style="margin:0 0 4px;color:#334155;"><strong>Subject:</strong> {subject}</p>
        {click_row}
        <p style="margin:0;color:#64748b;font-size:13px;">Resend id: {email_id}</p>
      </div>
      <p style="font-size:12px;color:#94a3b8;margin:12px 0 0;">
        Note: open pixels can fire from Gmail prefetch. Clicks are the stronger read signal.
      </p>
    </div>
    """
    _requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "from": "PalmCare Tracking <sales@send.palmtai.com>",
            "to": ENGAGEMENT_ALERT_TO,
            "reply_to": "sales@palmtai.com",
            "subject": f"[Engagement] {label} {kind.lower()}",
            "html": html,
        },
        timeout=15,
    )


@router.post("/resend")
async def resend_webhook(request: Request):
    """Handle Resend webhook events for email tracking.

    Verifies the Svix signature using `RESEND_WEBHOOK_SECRET`. If the env
    var is unset we fail-closed in production to prevent CRM tampering;
    in local dev we allow unsigned traffic for ease of testing.
    """
    raw_body = await request.body()
    secret = os.getenv("RESEND_WEBHOOK_SECRET", "")
    is_production = bool(os.getenv("RAILWAY_ENVIRONMENT"))

    if secret:
        valid = _verify_resend_signature(
            raw_body=raw_body,
            svix_id=request.headers.get("svix-id", ""),
            svix_timestamp=request.headers.get("svix-timestamp", ""),
            svix_signature=request.headers.get("svix-signature", ""),
            secret=secret,
        )
        if not valid:
            logger.warning("Resend webhook signature verification failed")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    elif is_production:
        logger.error("RESEND_WEBHOOK_SECRET not set in production — rejecting webhook")
        raise HTTPException(status_code=503, detail="Webhook verification not configured")
    else:
        logger.warning("RESEND_WEBHOOK_SECRET not set — accepting unsigned webhook (dev only)")

    try:
        payload = json.loads(raw_body or b"{}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

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
    tags = data.get("tags") or {}
    click_link = (data.get("click") or {}).get("link") or ""

    # Immediate Muse alert for watched agency outreach (first open / first click only).
    if event_type in ("email.opened", "email.clicked"):
        watched_label = WATCHED_OUTREACH_EMAILS.get(str(to_email).lower())
        campaign = ""
        if isinstance(tags, dict):
            campaign = str(tags.get("campaign") or "")
        elif isinstance(tags, list):
            for tag in tags:
                if isinstance(tag, dict) and tag.get("name") == "campaign":
                    campaign = str(tag.get("value") or "")
                    break
        kind = "opened" if event_type == "email.opened" else "clicked"
        if (watched_label or campaign in ("platform_info", "comfort_keepers_followup")) and _claim_engagement_alert(
            str(email_id), kind
        ):
            try:
                _alert_muse_engagement(
                    to_email=str(to_email),
                    label=watched_label or campaign or "platform_info",
                    event_type=event_type,
                    subject=subject,
                    email_id=email_id,
                    click_link=click_link,
                )
            except Exception as alert_err:
                logger.warning(f"Engagement alert failed: {alert_err}")

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

            if lead:
                lead.email_open_count = (getattr(lead, "email_open_count", 0) or 0) + 1
                lead.last_email_opened_at = now
                lead.updated_at = now
                logger.info(f"Lead email clicked: {lead.provider_name} ({to_email})")
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
