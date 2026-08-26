"""
Shared constants, email templates, and helpers for the sales_leads package.

Split out of the original monolithic sales_leads.py. `_auto_start_sequence`
is re-exported from app.routers.sales_leads (see __init__.py) because the
outreach package imports it directly.
"""

import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone, timedelta
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from app.models.sales_lead import SalesLead, LeadStatus
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

logger = logging.getLogger(__name__)


# ─── Unsubscribe (one-click, token-signed) ───
#
# Every marketing email carries a personalized, signed unsubscribe link so a
# recipient can opt out in one click instead of emailing us. The same token is
# used for the RFC 8058 List-Unsubscribe / List-Unsubscribe-Post headers so
# Gmail and Apple Mail render a native "Unsubscribe" button.
#
# The signing secret is shared between the API and the outreach scripts. We
# resolve it in a fixed order so both sides agree without any extra config:
# UNSUBSCRIBE_SECRET, then CRON_SECRET (already shared with the scripts), then
# JWT_SECRET, then a dev-only fallback.

_PUBLIC_SITE = "https://palmcareai.com"
_PUBLIC_API_URL = (
    os.getenv("PUBLIC_API_URL")
    or os.getenv("API_BASE_URL")
    or "https://api-production-a0a2.up.railway.app"
).rstrip("/")
# Monitored mailbox for the mailto: fallback in the List-Unsubscribe header
# (matches the reply-to on outreach mail, so opt-outs land where a human reads).
_UNSUB_MAILTO = os.getenv("UNSUBSCRIBE_MAILTO", "sales@palmtai.com")


def _unsubscribe_secret() -> str:
    from app.core.config import settings

    return (
        os.getenv("UNSUBSCRIBE_SECRET")
        or os.getenv("CRON_SECRET")
        or (settings.jwt_secret or "")
        or "palmcare-unsubscribe-dev-secret"
    )


def _normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def unsubscribe_token(email: str | None) -> str:
    """Signed, URL-safe token that proves an unsubscribe link is ours.

    HMAC-SHA256 over the lowercased email, truncated to 32 hex chars. Stable
    across restarts (unlike a random per-process value), so links stay valid.
    """
    norm = _normalize_email(email)
    return hmac.new(
        _unsubscribe_secret().encode("utf-8"), norm.encode("utf-8"), hashlib.sha256
    ).hexdigest()[:32]


def verify_unsubscribe_token(email: str | None, token: str | None) -> bool:
    """Constant-time check that `token` matches the email's expected token."""
    if not email or not token:
        return False
    return hmac.compare_digest(unsubscribe_token(email), token.strip())


def unsubscribe_url(email: str | None) -> str:
    """Branded footer link → palmcareai.com/unsubscribe (auto-completes via API)."""
    params = {
        "email": _normalize_email(email),
        "token": unsubscribe_token(email),
        "utm_source": "email",
        "utm_medium": "email",
        "utm_campaign": "agency_outreach",
        "utm_content": "unsubscribe",
    }
    return f"{_PUBLIC_SITE}/unsubscribe?{urlencode(params)}"


def unsubscribe_api_url(email: str | None) -> str:
    """Direct API endpoint for the List-Unsubscribe header (one-click, no JS)."""
    params = {"email": _normalize_email(email), "token": unsubscribe_token(email)}
    return f"{_PUBLIC_API_URL}/platform/sales/leads/unsubscribe?{urlencode(params)}"


def unsubscribe_headers(email: str | None) -> dict:
    """RFC 8058 one-click unsubscribe headers for a marketing send."""
    return {
        "List-Unsubscribe": (
            f"<mailto:{_UNSUB_MAILTO}?subject=unsubscribe>, <{unsubscribe_api_url(email)}>"
        ),
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


def render_email(template_body: str, subject: str, data: dict, email: str | None):
    """Render a marketing template for one recipient.

    Fills the shared merge tags plus the per-recipient {unsubscribe_url} used in
    the footer, and returns (subject, html, headers) ready for email_service.
    """
    merged = dict(data)
    merged["unsubscribe_url"] = unsubscribe_url(email)
    return (
        _render_template(subject, merged),
        _render_template(template_body, merged),
        unsubscribe_headers(email),
    )


def _utm(path: str = "", *, content: str | None = None, campaign: str = "agency_outreach") -> str:
    """Build a palmcareai.com URL with standard email UTMs."""
    base = "https://palmcareai.com" + (path if path.startswith("/") else f"/{path}" if path else "")
    params = {
        "utm_source": "email",
        "utm_medium": "email",
        "utm_campaign": campaign,
    }
    if content:
        params["utm_content"] = content
    return f"{base}?{urlencode(params)}"

# ─── US states for bulk import ───

ALL_US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "GU", "VI", "AS", "MP",
]




# ─── Brand colors, email wrapper, templates & state names ───

_SITE = "https://palmcareai.com"
_SITE_LINK = _utm("/", content="signature")
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_CYAN = "#0891b2"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"
_GH_MARKETING = "https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/main/apps/web/public/marketing"
# Hop through /app so GA4 attributes the click before the App Store redirect.
_APP_STORE = _utm("/app", content="cta_button", campaign="app_download")
_REGISTER = _utm("/register", content="cta_trial")
_PRIVACY = _utm("/privacy", content="footer")
_UNSUB = _utm("/unsubscribe", content="footer")
_QR_APP = f"{_SITE}/marketing/social/palm-appstore-qr.png"
_LAUNCH_VIDEO = _utm("/launch/palm-app-launch.mp4", content="launch_video", campaign="app_download")
# Paper glass UI (Pipeline / App / Web), not legacy dark App Store captures.
_SHOT = f"{_SITE}/screenshots/glass"
_IMG_RECORD = f"{_SHOT}/pipeline-recording.png"
_IMG_CONTRACT = f"{_SHOT}/pipeline-contract.png"
_IMG_HOME = f"{_SHOT}/pipeline-palm-it.png"
_IMG_CARE = f"{_SHOT}/pipeline-care-plan.png"
_IMG_BILLABLES = f"{_SHOT}/pipeline-billables.png"
_IMG_NOTES = f"{_SHOT}/pipeline-notes.png"
_IMG_PROCESS = f"{_SHOT}/pipeline-processing.png"
_IMG_WEB_HOME = f"{_SHOT}/web-home.png"
_IMG_WEB_CLIENTS = f"{_SHOT}/web-clients.png"

_FONT = (
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
)


def _email_wrap(
    headline: str,
    body_html: str,
    *,
    preview_html: str = "",
    note: str = "14-day free trial. No credit card.",
    provider_name: str = "{provider_name}",
) -> str:
    """Glass drip card: short copy, product preview, one CTA, QR.

    Forced light so Apple Mail does not invert the card. Still one job per
    email: show the product, then download.
    """
    logo = f"{_SITE}/app-logo.png"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>PalmCare AI</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid {_SLATE_200};border-radius:20px;">
      <tr><td style="padding:28px 24px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;width:40px;">
              <img src="{logo}" width="40" height="40" alt="PalmCare AI" style="display:block;width:40px;height:40px;border-radius:10px;border:0;" />
            </td>
            <td style="vertical-align:middle;{_FONT}font-size:16px;font-weight:700;color:{_SLATE_900};">PalmCare AI</td>
          </tr>
        </table>
        <div style="width:36px;height:3px;border-radius:99px;background:{_TEAL};margin:16px 0 20px;"></div>
        <h1 style="margin:0 0 12px;{_FONT}font-size:24px;line-height:30px;font-weight:700;color:{_SLATE_900};letter-spacing:-0.03em;">{headline}</h1>
        <div style="{_FONT}font-size:15px;line-height:24px;color:{_SLATE_600};">{body_html}</div>
      </td></tr>
      {preview_html}
      <tr><td align="center" style="padding:16px 24px 16px;">
        <a href="{_APP_STORE}" style="display:inline-block;background:{_TEAL};color:#FFFFFF;text-decoration:none;{_FONT}font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">Download PALM for iPhone</a>
      </td></tr>
      <tr><td align="center" style="padding:0 24px 8px;">
        <a href="{_APP_STORE}" style="text-decoration:none;">
          <img src="{_QR_APP}" width="100" height="100" alt="Scan to download PALM" style="display:block;width:100px;height:100px;border-radius:12px;border:1px solid {_SLATE_200};" />
        </a>
        <p style="margin:8px 0 0;{_FONT}font-size:12px;color:#94A3B8;">Scan with your iPhone camera</p>
      </td></tr>
      <tr><td style="padding:8px 24px 24px;">
        <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:14px 16px;">
          <p style="margin:0;{_FONT}font-size:13px;font-weight:600;color:{_TEAL_DARK};">Just Palm It</p>
          <p style="margin:4px 0 0;{_FONT}font-size:13px;line-height:20px;color:{_SLATE_600};">{note}</p>
        </div>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
      <tr><td align="center" style="padding:18px 8px 0;">
        <p style="margin:0 0 4px;{_FONT}font-size:12px;font-weight:500;color:{_SLATE_600};">PalmCare AI · Omaha, NE</p>
        <p style="margin:0 0 10px;{_FONT}font-size:11px;color:#94A3B8;line-height:16px;">
          You received this because {provider_name} is listed in public agency directories.
        </p>
        <p style="margin:0;{_FONT}font-size:11px;color:#94A3B8;">
          <a href="{_PRIVACY}" style="color:#94A3B8;text-decoration:underline;">Privacy</a>
          &nbsp;·&nbsp;
          <a href="{{unsubscribe_url}}" style="color:#94A3B8;text-decoration:underline;">Unsubscribe</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


def _p(text: str) -> str:
    return (
        f'<p style="margin:0 0 12px;{_FONT}font-size:15px;line-height:24px;color:{_SLATE_600};">{text}</p>'
    )


def _bullets(items: list[str]) -> str:
    rows = "".join(
        f'<tr><td style="padding:0 0 8px;{_FONT}font-size:14px;line-height:20px;color:{_SLATE_900};">'
        f'<span style="color:{_TEAL};font-weight:700;">&#10003;</span>&nbsp;&nbsp;{item}</td></tr>'
        for item in items
    )
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" width="100%" '
        f'style="margin:4px 0 16px;">{rows}</table>'
    )


def _preview_pair(left_src: str, left_alt: str, right_src: str, right_alt: str, caption: str) -> str:
    return f"""
      <tr><td style="padding:8px 20px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_SLATE_100};border-radius:16px;">
          <tr>
            <td width="50%" style="padding:14px 6px 14px 14px;" align="center">
              <a href="{_APP_STORE}" style="text-decoration:none;">
                <img src="{left_src}" width="200" alt="{left_alt}" style="display:block;width:100%;max-width:200px;border-radius:12px;border:1px solid {_SLATE_200};" />
              </a>
            </td>
            <td width="50%" style="padding:14px 14px 14px 6px;" align="center">
              <a href="{_APP_STORE}" style="text-decoration:none;">
                <img src="{right_src}" width="200" alt="{right_alt}" style="display:block;width:100%;max-width:200px;border-radius:12px;border:1px solid {_SLATE_200};" />
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0;{_FONT}font-size:12px;line-height:16px;color:#94A3B8;text-align:center;">{caption}</p>
      </td></tr>"""


def _preview_wide(src: str, alt: str, caption: str) -> str:
    return f"""
      <tr><td style="padding:8px 20px 4px;" align="center">
        <a href="{_APP_STORE}" style="text-decoration:none;">
          <img src="{src}" width="460" alt="{alt}" style="display:block;width:100%;max-width:460px;border-radius:14px;border:1px solid {_SLATE_200};" />
        </a>
        <p style="margin:10px 0 0;{_FONT}font-size:12px;line-height:16px;color:#94A3B8;text-align:center;">{caption}</p>
      </td></tr>"""


def _preview_phone(src: str, alt: str, caption: str) -> str:
    return f"""
      <tr><td style="padding:8px 20px 4px;" align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:{_SLATE_100};border-radius:16px;">
          <tr><td style="padding:16px 40px;" align="center">
            <a href="{_APP_STORE}" style="text-decoration:none;">
              <img src="{src}" width="220" alt="{alt}" style="display:block;width:220px;max-width:100%;border-radius:14px;border:1px solid {_SLATE_200};" />
            </a>
          </td></tr>
        </table>
        <p style="margin:10px 0 0;{_FONT}font-size:12px;line-height:16px;color:#94A3B8;text-align:center;">{caption}</p>
      </td></tr>"""


def _preview_triple(
    left_src: str,
    mid_src: str,
    right_src: str,
    caption: str,
) -> str:
    cell = (
        'style="padding:12px 4px;" align="center"'
    )
    img = (
        f'style="display:block;width:100%;max-width:140px;border-radius:12px;border:1px solid {_SLATE_200};"'
    )
    return f"""
      <tr><td style="padding:8px 16px 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_SLATE_100};border-radius:16px;">
          <tr>
            <td width="33%" {cell}>
              <a href="{_APP_STORE}" style="text-decoration:none;">
                <img src="{left_src}" width="140" alt="Record" {img} />
              </a>
            </td>
            <td width="33%" {cell}>
              <a href="{_APP_STORE}" style="text-decoration:none;">
                <img src="{mid_src}" width="140" alt="Care plan" {img} />
              </a>
            </td>
            <td width="33%" {cell}>
              <a href="{_APP_STORE}" style="text-decoration:none;">
                <img src="{right_src}" width="140" alt="Contract" {img} />
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:10px 0 0;{_FONT}font-size:12px;line-height:16px;color:#94A3B8;text-align:center;">{caption}</p>
      </td></tr>"""


EMAIL_TEMPLATES = {
    # Product-proof glass drips (Aug 2026). Same SEQUENCE_ORDER / cadence.
    "just_palm_it": {
        "id": "just_palm_it",
        "name": "Just PALM IT",
        "subject": "stop typing what was already said out loud",
        "description": "Day 0 — double documentation → record + contract preview.",
        "body": _email_wrap(
            "Don't type it twice",
            _p("Hi,")
            + _p(
                "At agencies like {provider_name}, every assessment is said out loud, then typed again "
                "into a care plan, billables, and a contract. That second pass is where evenings disappear."
            )
            + _p(
                "PALM records the visit on iPhone and writes the paperwork from that conversation. "
                "Your assessor reviews once. The family can sign the same day."
            )
            + _bullets(
                [
                    "One recording becomes care plan, billables, notes, and contract",
                    "Built for home care agencies, not generic AI chat",
                    "You review before anything is final",
                ]
            ),
            preview_html=_preview_pair(
                _IMG_RECORD,
                "Voice recording screen",
                _IMG_CONTRACT,
                "Contract ready on iPhone",
                "Record the visit. Contract is ready to review.",
            ),
            note="Free for 14 days. No credit card to start.",
        ),
    },
    "app_qr_download": {
        "id": "app_qr_download",
        "name": "The QR Download",
        "subject": "point your iPhone camera at this email",
        "description": "Day 3 — install + home screen proof.",
        "body": _email_wrap(
            "Your next assessment starts on iPhone",
            _p("Hi,")
            + _p(
                "Scan the code, install PALM, and open the app before your next home visit. "
                "Clients, visits, and docs live in one place so the office and the field stop "
                "handing papers back and forth."
            )
            + _bullets(
                [
                    "Field staff record assessments during the visit",
                    "{state_full} contract rules are already loaded",
                    "Office sees the same packet without retyping",
                ]
            ),
            preview_html=_preview_phone(
                _IMG_HOME,
                "PALM Palm It screen",
                "Start screen: tap Palm It to record the next visit.",
            ),
            note="Scan below. Free for 14 days.",
        ),
    },
    "seven_second_demo": {
        "id": "seven_second_demo",
        "name": "The 7 Second Demo",
        "subject": "a 7 second demo of your evenings coming back",
        "description": "Day 7 — glass product flow + video.",
        "body": _email_wrap(
            "7 seconds. That's the demo.",
            _p("Hi,")
            + _p(
                f'Assessment in. Care plan, billables, and contract out. '
                f'<a href="{_LAUNCH_VIDEO}" style="color:{_TEAL};font-weight:600;text-decoration:none;">Watch the 7-second clip</a>, '
                "then download the app and try it on a real visit."
            )
            + _bullets(
                [
                    "Voice assessment on the phone in the home",
                    "Four documents from one recording",
                    "Same-day signature when the family is ready",
                ]
            ),
            preview_html=_preview_triple(
                _IMG_RECORD,
                _IMG_CARE,
                _IMG_CONTRACT,
                "Record → care plan → contract. The new glass UI.",
            ),
            note="Product facts only. No pitch call required to try it.",
        ),
    },
    "evenings_back": {
        "id": "evenings_back",
        "name": "Your Evenings Back",
        "subject": "what would you do with Tuesday nights again",
        "description": "Day 12 — evenings + web glass office view.",
        "body": _email_wrap(
            "Get Tuesday nights back",
            _p("Hi,")
            + _p(
                "Most assessors finish the visit at 4 and start typing at 8. "
                "The hard part already happened in the living room. PALM keeps that version "
                "so paperwork does not restart when they get home."
            )
            + _p(
                "Review the care plan and contract before you leave the driveway. "
                "Then go home. The office still gets a clean packet."
            )
            + _bullets(
                [
                    "Docs drafted before the car leaves the curb",
                    "Office dashboard stays in sync with the field",
                    "Less after-hours typing for your team",
                ]
            ),
            preview_html=_preview_wide(
                _IMG_WEB_HOME,
                "PalmCare web glass dashboard",
                "Office view: glass dashboard stays in sync with the field.",
            ),
            note="Review in the driveway. Sign when the family is ready.",
        ),
    },
    "same_day_contract": {
        "id": "same_day_contract",
        "name": "Same Day Contract",
        "subject": "the family signed before dinner",
        "description": "Day 18 — glass contract preview + state rules.",
        "body": _email_wrap(
            "The family signed before dinner",
            _p("Hi,")
            + _p(
                "When the service agreement is clear and sitting in front of the family "
                "the same afternoon as the assessment, decisions happen faster. "
                "PALM drafts that contract from the visit recording."
            )
            + _p(
                "Built on {state_full} rules. Your team reviews every line before anything is final. "
                "No overnight wait for someone to type the agreement."
            )
            + _bullets(
                [
                    "Contract drafted from the assessment conversation",
                    "State rules included so you are not starting from a blank page",
                    "Send or sign after a human review",
                ]
            ),
            preview_html=_preview_phone(
                _IMG_CONTRACT,
                "Contract ready on iPhone",
                "Contract screen: review, then send or sign.",
            ),
            note="You review before anything is final.",
        ),
    },
    "one_visit_proof": {
        "id": "one_visit_proof",
        "name": "One Visit Proof",
        "subject": "try it on one visit, then decide",
        "description": "Day 25 — one-visit proof with glass recording UI.",
        "body": _email_wrap(
            "Prove it on one visit",
            _p("Hi,")
            + _p(
                "Pick one upcoming assessment at {provider_name}. Record it in PALM. "
                "Compare the care plan, billables, and contract to your usual process."
            )
            + _p(
                "If the packet is better than what your team types by hand, keep the app. "
                "If not, delete it. No pitch call required."
            )
            + _bullets(
                [
                    "14-day free trial on the App Store",
                    "Works on a real client visit, not a sandbox demo",
                    "One visit is enough to judge the fit",
                ]
            ),
            preview_html=_preview_phone(
                _IMG_RECORD,
                "Recording an assessment",
                "Tap record. Talk through the assessment. PALM writes the docs.",
            ),
            note="One visit. Real docs. Then you decide.",
        ),
    },
    "download_today": {
        "id": "download_today",
        "name": "Download Today",
        "subject": "PALM is on your App Store, download today",
        "description": "Day 33 — glass product flow + direct ask.",
        "body": _email_wrap(
            "PALM is on the App Store",
            _p("Hi,")
            + _p(
                "Home care agencies use PALM so assessors stop rebuilding the same visit "
                "on a keyboard after hours. Record once. Review the care plan, billables, "
                "notes, and contract. Sign when the family is ready."
            )
            + _bullets(
                [
                    "iPhone app for the field, web for the office",
                    "50-state contract rules built in",
                    "14-day free trial. Download today.",
                ]
            ),
            preview_html=_preview_triple(
                _IMG_HOME,
                _IMG_BILLABLES,
                _IMG_CONTRACT,
                "Palm It → billables → contract. Download today.",
            ),
            note="Just Palm It. Free for 14 days.",
        ),
    },
}

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


# =============================================================================
# LIST & FILTER
# =============================================================================



# ─── Template renderer ───

def _render_template(template_str: str, data: dict) -> str:
    """Replace merge tags like {provider_name} with actual values."""
    result = template_str
    for key, value in data.items():
        result = result.replace("{" + key + "}", str(value))
    return result




# ─── Drip-sequence order & cadence ───

# Drip sequence now runs entirely on the new (Jul 2026) app-download material.
# The old May "warm_open" family was deleted. Values are cumulative day offsets
# from the first send.
SEQUENCE_ORDER = [
    "just_palm_it", "app_qr_download", "seven_second_demo", "evenings_back",
    "same_day_contract", "one_visit_proof", "download_today",
]
SEQUENCE_DAYS = {
    "just_palm_it": 0,
    "app_qr_download": 3,
    "seven_second_demo": 7,
    "evenings_back": 12,
    "same_day_contract": 18,
    "one_visit_proof": 25,
    "download_today": 33,
}

# Rotating templates for leads who opened but did not convert. Each lead gets the
# next template they have not received yet. Sent by the daily reengage cron.
OPENED_REENGAGE_ORDER = [
    "just_palm_it",
    "app_qr_download",
    "seven_second_demo",
    "evenings_back",
    "same_day_contract",
    "one_visit_proof",
    "download_today",
]
REENGAGE_CAMPAIGN_TAG = "opened-reengage-2026"
REENGAGE_MIN_DAYS_BETWEEN = 4
REENGAGE_DAILY_CAP = 40

# Broad resend: send the new app-download marketing emails to EVERY agency we have
# already contacted before today (not just openers). Rotates the same 7 standalone
# templates, tracked cross-campaign so no lead ever gets the same email twice.
MARKETING_RESEND_TAG = "marketing-resend-2026"




# ─── Auto-start drip sequence (also used by the outreach package) ───

def _auto_start_sequence(lead: SalesLead, campaign_name: str, db: Session):
    """Start the drip sequence for a lead if not already in one.

    Called automatically whenever an email is sent to a lead that
    doesn't have an active sequence. Sets sequence_step=1 and schedules
    the next email a few days later.
    """
    if lead.sequence_step and lead.sequence_step > 0:
        return
    if lead.sequence_completed:
        return
    if getattr(lead, "unsubscribed", False):
        return
    # Respect email_preferences even if the CRM row was re-imported.
    try:
        from .unsubscribe import allows_marketing
        if lead.contact_email and not allows_marketing(db, lead.contact_email, "outreach"):
            return
    except Exception:
        pass

    now = datetime.now(timezone.utc)
    lead.sequence_step = 1
    lead.sequence_started_at = now
    lead.sequence_completed = False
    lead.last_template_sent = SEQUENCE_ORDER[0]
    lead.campaign_tag = campaign_name or "auto-sequence"
    lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS[SEQUENCE_ORDER[1]])

    activity = lead.activity_log or []
    activity.append({
        "action": f"Auto-sequence started (Email 1/{len(SEQUENCE_ORDER)} counted from initial send)",
        "campaign": lead.campaign_tag,
        "at": now.isoformat(),
    })
    lead.activity_log = activity

    db.add(EmailCampaignEvent(
        lead_id=lead.id,
        template_id=SEQUENCE_ORDER[0],
        campaign_tag=lead.campaign_tag,
        event_type="sent",
        subject=lead.last_email_subject or "initial outreach",
        to_email=lead.contact_email,
        created_at=now,
    ))

