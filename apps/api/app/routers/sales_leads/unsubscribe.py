"""Public unsubscribe + email preference endpoints.

Footer links open the branded preference page (choose categories).
RFC 8058 List-Unsubscribe one-click still opts out of all marketing.
"""

import logging
from datetime import datetime, timezone
from html import escape as _esc
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.email_preference import EmailPreference
from app.models.sales_lead import SalesLead

from .common import verify_unsubscribe_token, unsubscribe_url

logger = logging.getLogger(__name__)

router = APIRouter()

_BRAND_TEAL = "#0d9488"

CATEGORIES = ("outreach", "product_updates", "announcements")


def _norm_email(email: str | None) -> str:
    return (email or "").strip().lower()


def _get_or_create_prefs(db: Session, email: str) -> EmailPreference:
    pref = (
        db.query(EmailPreference)
        .filter(func.lower(EmailPreference.email) == email)
        .first()
    )
    if pref:
        return pref
    pref = EmailPreference(email=email)
    db.add(pref)
    db.flush()
    return pref


def allows_marketing(db: Session, email: str | None, category: str = "outreach") -> bool:
    """True if this address may receive the given marketing category.

    Missing preference row = subscribed (default). Account mail is never gated here.
    """
    if category not in CATEGORIES:
        return True
    norm = _norm_email(email)
    if not norm:
        return False
    pref = (
        db.query(EmailPreference)
        .filter(func.lower(EmailPreference.email) == norm)
        .first()
    )
    if not pref:
        return True
    return bool(getattr(pref, category, True))


def _apply_lead_unsubscribe(db: Session, email: str) -> int:
    """Remove opted-out addresses from the sales CRM and stop every sequence.

    Preference rows stay so a later CMS re-import cannot email them again.
    """
    leads = db.query(SalesLead).filter(
        func.lower(SalesLead.contact_email) == email
    ).all()
    removed = 0
    for lead in leads:
        logger.info(
            "Removing unsubscribed lead from CRM: %s <%s>",
            lead.provider_name,
            lead.contact_email,
        )
        db.delete(lead)
        removed += 1
    return removed


def _clear_lead_unsubscribe(db: Session, email: str) -> int:
    """No-op for CRM rows: unsubscribes delete the lead. Prefs alone gate re-import."""
    return 0


def _prefs_payload(pref: EmailPreference) -> dict[str, Any]:
    return {
        "email": pref.email,
        "outreach": bool(pref.outreach),
        "product_updates": bool(pref.product_updates),
        "announcements": bool(pref.announcements),
        "all_marketing_off": pref.all_marketing_off,
    }


def apply_preferences(
    db: Session,
    email: str,
    *,
    outreach: Optional[bool] = None,
    product_updates: Optional[bool] = None,
    announcements: Optional[bool] = None,
    unsubscribe_all: bool = False,
) -> EmailPreference:
    """Update category flags. unsubscribe_all forces every marketing category off."""
    norm = _norm_email(email)
    pref = _get_or_create_prefs(db, norm)
    if unsubscribe_all:
        pref.outreach = False
        pref.product_updates = False
        pref.announcements = False
    else:
        if outreach is not None:
            pref.outreach = bool(outreach)
        if product_updates is not None:
            pref.product_updates = bool(product_updates)
        if announcements is not None:
            pref.announcements = bool(announcements)

    if not pref.outreach:
        _apply_lead_unsubscribe(db, norm)
    else:
        _clear_lead_unsubscribe(db, norm)

    db.commit()
    db.refresh(pref)
    logger.info(
        "Email prefs for %s outreach=%s product=%s announcements=%s",
        norm,
        pref.outreach,
        pref.product_updates,
        pref.announcements,
    )
    return pref


def _page(title: str, message: str, *, show_form: bool = False,
          email: str = "", token: str = "") -> str:
    """Minimal branded HTML for API-hosted confirmation (one-click / form POST)."""
    form_html = ""
    if show_form:
        form_html = f"""
        <form method="post" action="/platform/sales/leads/unsubscribe" style="margin-top:24px;">
          <input type="hidden" name="email" value="{_esc(email, quote=True)}" />
          <input type="hidden" name="token" value="{_esc(token, quote=True)}" />
          <input type="hidden" name="unsubscribe_all" value="1" />
          <button type="submit" style="background:#0f172a;color:#fff;border:none;
            padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;">
            Unsubscribe from all marketing
          </button>
        </form>
        <p style="margin-top:16px;font-size:13px;color:#64748b;">
          Or <a href="https://palmcareai.com/unsubscribe?email={_esc(email, quote=True)}&amp;token={_esc(token, quote=True)}"
          style="color:{_BRAND_TEAL};">choose specific categories</a>.
        </p>"""
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>{title} · PalmCare AI</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;">
  <div style="max-width:480px;margin:64px auto;background:#fff;border:1px solid #e2e8f0;
    border-radius:16px;padding:40px;text-align:center;box-shadow:0 18px 40px rgba(15,23,42,0.06);">
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


@router.get("/leads/unsubscribe")
async def unsubscribe_page(
    email: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    e: Optional[str] = Query(default=None),
    t: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Browser hits redirect to the branded preference picker.

    List-Unsubscribe one-click uses POST and never hits this GET.
    """
    email = email or e
    token = token or t

    if email and token and verify_unsubscribe_token(email, token):
        _get_or_create_prefs(db, _norm_email(email))
        db.commit()
        # Send people to palmcareai.com/unsubscribe so they can pick categories.
        return RedirectResponse(unsubscribe_url(email), status_code=302)

    return HTMLResponse(_page(
        "Unsubscribe",
        "To manage preferences, use the link from your email, or write "
        "<a href=\"mailto:sales@palmtai.com?subject=unsubscribe\">sales@palmtai.com</a>.",
    ), status_code=400)


@router.get("/leads/unsubscribe/preferences")
async def get_preferences(
    email: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Return current category flags for the preference UI."""
    if not email or not token or not verify_unsubscribe_token(email, token):
        return JSONResponse({"success": False, "error": "invalid_token"}, status_code=400)
    pref = _get_or_create_prefs(db, _norm_email(email))
    db.commit()
    return JSONResponse({"success": True, "preferences": _prefs_payload(pref)})


@router.post("/leads/unsubscribe")
async def unsubscribe_submit(
    request: Request,
    db: Session = Depends(get_db),
):
    """Opt out. Supports:
    - One-click List-Unsubscribe (no body) → all marketing off
    - JSON body with category booleans from the web preference page
    - Form POST unsubscribe_all=1
    """
    qp = request.query_params
    email = qp.get("email") or qp.get("e")
    token = qp.get("token") or qp.get("t")

    body: dict[str, Any] = {}
    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        try:
            raw = await request.json()
            if isinstance(raw, dict):
                body = raw
                email = email or body.get("email")
                token = token or body.get("token")
        except Exception:
            body = {}
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            email = email or form.get("email")
            token = token or form.get("token")
            body = {k: form.get(k) for k in form.keys()}
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

    # Preference page sends JSON with category flags.
    # Everything else (List-Unsubscribe one-click, confirm-all form) opts out of all marketing.
    unsubscribe_all_flag = str(body.get("unsubscribe_all") or "").lower() in (
        "1",
        "true",
        "yes",
    )
    has_pref_fields = any(k in body for k in CATEGORIES)

    if has_pref_fields and not unsubscribe_all_flag:
        def _as_bool(value: Any, default: bool = True) -> bool:
            if value is None:
                return default
            if isinstance(value, bool):
                return value
            return str(value).lower() in ("1", "true", "yes", "on")

        pref = apply_preferences(
            db,
            email,
            outreach=_as_bool(body.get("outreach"), True),
            product_updates=_as_bool(body.get("product_updates"), True),
            announcements=_as_bool(body.get("announcements"), True),
            unsubscribe_all=False,
        )
    else:
        pref = apply_preferences(db, email, unsubscribe_all=True)

    if accepts_html:
        if pref.all_marketing_off:
            msg = (
                f"<strong>{_esc(email)}</strong> won't receive PalmCare marketing emails. "
                "Account mail is unchanged."
            )
        else:
            kept = []
            if pref.outreach:
                kept.append("sales outreach")
            if pref.product_updates:
                kept.append("product tips")
            if pref.announcements:
                kept.append("announcements")
            msg = (
                f"Preferences saved for <strong>{_esc(email)}</strong>. "
                f"Still receiving: {', '.join(kept) if kept else 'none'}."
            )
        return HTMLResponse(_page("Preferences updated", msg))

    return JSONResponse({
        "success": True,
        "email": _norm_email(email),
        "preferences": _prefs_payload(pref),
    })
