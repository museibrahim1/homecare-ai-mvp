"""Public one-click unsubscribe endpoint for outreach email.

This is the target of the personalized unsubscribe link in every marketing
email and of the RFC 8058 List-Unsubscribe / List-Unsubscribe-Post headers.
It is intentionally PUBLIC (no auth) and token-gated: the link carries an
HMAC token derived from the recipient's address so only links we generated
can opt someone out.

Routes (mounted under /platform/sales):
  GET  /leads/unsubscribe   -> branded confirmation page (POSTs back)
  POST /leads/unsubscribe   -> performs the opt-out (one-click / form / fetch)

We never auto-unsubscribe on GET so email link-scanners that prefetch the URL
can't opt people out by accident; the state change only happens on POST.
"""

import logging
from datetime import datetime, timezone
from html import escape as _esc
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.sales_lead import SalesLead

from .common import verify_unsubscribe_token

logger = logging.getLogger(__name__)

router = APIRouter()

_BRAND_TEAL = "#0d9488"


def _page(title: str, message: str, *, show_form: bool = False,
          email: str = "", token: str = "") -> str:
    """Minimal branded HTML page for the browser-facing flows."""
    form_html = ""
    if show_form:
        form_html = f"""
        <form method="post" action="/platform/sales/leads/unsubscribe" style="margin-top:24px;">
          <input type="hidden" name="email" value="{_esc(email, quote=True)}" />
          <input type="hidden" name="token" value="{_esc(token, quote=True)}" />
          <button type="submit" style="background:#0f172a;color:#fff;border:none;
            padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
            Confirm unsubscribe
          </button>
        </form>"""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>{title} · PalmCare AI</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;">
  <div style="max-width:480px;margin:64px auto;background:#fff;border:1px solid #e2e8f0;
    border-radius:16px;padding:40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:{_BRAND_TEAL};">PalmCare AI</p>
    <h1 style="margin:16px 0 8px;font-size:22px;color:#0f172a;">{title}</h1>
    <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">{message}</p>
    {form_html}
    <p style="margin-top:28px;">
      <a href="https://palmcareai.com" style="color:{_BRAND_TEAL};font-size:13px;text-decoration:none;">
        Back to palmcareai.com</a>
    </p>
  </div>
</body></html>"""


def _apply_unsubscribe(db: Session, email: str) -> int:
    """Mark every lead with this address as unsubscribed. Returns rows updated."""
    norm = (email or "").strip().lower()
    if not norm:
        return 0

    leads = db.query(SalesLead).filter(
        func.lower(SalesLead.contact_email) == norm
    ).all()

    now = datetime.now(timezone.utc)
    updated = 0
    for lead in leads:
        if not lead.unsubscribed:
            updated += 1
        lead.unsubscribed = True
        lead.unsubscribed_at = now
        lead.sequence_completed = True
        lead.next_email_scheduled_at = None
        if lead.status not in ("converted", "responded"):
            lead.status = "not_interested"
        activity = lead.activity_log or []
        activity.append({"action": "Unsubscribed (one-click)", "at": now.isoformat()})
        lead.activity_log = activity

    if leads:
        db.commit()
    logger.info("Unsubscribe processed for %s (%d lead rows)", norm, len(leads))
    return updated


@router.get("/leads/unsubscribe")
async def unsubscribe_page(
    email: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    e: Optional[str] = Query(default=None),
    t: Optional[str] = Query(default=None),
):
    """Confirmation page. Does not change state (POST does)."""
    email = email or e
    token = token or t

    if email and token and verify_unsubscribe_token(email, token):
        return HTMLResponse(_page(
            "Unsubscribe",
            f"Click the button below to stop marketing emails to "
            f"<strong>{_esc(email)}</strong>. Transactional mail (receipts, password "
            f"resets) is unaffected.",
            show_form=True,
            email=email,
            token=token,
        ))

    # Missing/invalid token: fall back to emailing us so no one is stuck.
    return HTMLResponse(_page(
        "Unsubscribe",
        "To unsubscribe, email "
        "<a href=\"mailto:sales@palmtai.com?subject=unsubscribe\">sales@palmtai.com</a> "
        "with the word Unsubscribe and we'll remove you within one business day.",
    ), status_code=400)


@router.post("/leads/unsubscribe")
async def unsubscribe_submit(
    request: Request,
    db: Session = Depends(get_db),
):
    """Perform the opt-out. Used by the one-click header, the branded web page,
    and the confirmation form. Idempotent.

    Reads email/token from the query string (the personalized link and the
    List-Unsubscribe header both carry them there) and, as a fallback, from a
    posted form body so the browser confirmation form also works.
    """
    qp = request.query_params
    email = qp.get("email") or qp.get("e")
    token = qp.get("token") or qp.get("t")

    if not email or not token:
        content_type = (request.headers.get("content-type") or "").lower()
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            try:
                form = await request.form()
                email = email or form.get("email")
                token = token or form.get("token")
            except Exception:
                pass

    accepts_html = "text/html" in (request.headers.get("accept") or "")

    if not email or not token or not verify_unsubscribe_token(email, token):
        logger.warning("Unsubscribe rejected: invalid token for %r", email)
        if accepts_html:
            return HTMLResponse(_page(
                "Link expired",
                "This unsubscribe link is invalid or expired. Email "
                "<a href=\"mailto:sales@palmtai.com?subject=unsubscribe\">sales@palmtai.com</a> "
                "and we'll remove you.",
            ), status_code=400)
        return JSONResponse({"success": False, "error": "invalid_token"}, status_code=400)

    _apply_unsubscribe(db, email)

    if accepts_html:
        return HTMLResponse(_page(
            "You're unsubscribed",
            f"<strong>{_esc(email)}</strong> won't receive any more marketing emails "
            f"from PalmCare AI.",
        ))
    return JSONResponse({"success": True, "email": email.strip().lower()})
