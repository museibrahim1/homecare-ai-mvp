"""UTM tagging helpers for every outbound PalmCare link.

Convention (lowercase, underscores):
  utm_source   — where the click came from (email, linkedin, instagram, ...)
  utm_medium   — channel type (email, social, referral, qr, investor)
  utm_campaign — campaign name (app_launch, agency_outreach, investor_seed, ...)
  utm_content  — optional placement (cta_button, footer, qr, hero)

Short branded paths (preferred in social captions — keep them short):
  palmcareai.com/a/meta   → App Store via /app with Meta UTMs
  palmcareai.com/a/li     → App Store via /app with LinkedIn UTMs
  palmcareai.com/r/meta   → /register with Meta UTMs
  palmcareai.com/r/li     → /register with LinkedIn UTMs
  palmcareai.com/a/email  → App Store via /app with email UTMs

Always prefer tagging the palmcareai.com hop (so GA4 sees the session)
over linking straight to apps.apple.com.
"""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

SITE = "https://palmcareai.com"
APP_STORE = "https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988"

# Short caption-friendly paths (resolved by Next.js redirects → /app or /register)
SHORT = {
    "app_meta": f"{SITE}/a/meta",
    "app_li": f"{SITE}/a/li",
    "app_email": f"{SITE}/a/email",
    "app_qr": f"{SITE}/a/qr",
    "register_meta": f"{SITE}/r/meta",
    "register_li": f"{SITE}/r/li",
    "register_email": f"{SITE}/r/email",
}


def with_utm(
    url: str,
    *,
    source: str,
    medium: str,
    campaign: str,
    content: str | None = None,
    term: str | None = None,
) -> str:
    """Return url with UTM params merged in. Existing UTMs are preserved unless overridden."""
    if not url:
        return url
    # Allow bare host paths like "palmcareai.com/register"
    if url.startswith("palmcareai.com"):
        url = "https://" + url
    parsed = urlparse(url)
    if not parsed.scheme:
        return url  # mailto:, tel:, relative with no host — leave alone

    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params["utm_source"] = source.lower().strip()
    params["utm_medium"] = medium.lower().strip()
    params["utm_campaign"] = campaign.lower().strip()
    if content:
        params["utm_content"] = content.lower().strip()
    if term:
        params["utm_term"] = term.lower().strip()

    return urlunparse(parsed._replace(query=urlencode(params)))


def site(path: str = "", **utm) -> str:
    """Build a palmcareai.com URL with optional UTMs.

    site() -> https://palmcareai.com
    site('/register', source='email', medium='email', campaign='outreach')
    """
    base = SITE.rstrip("/")
    if path and not path.startswith("/"):
        path = "/" + path
    url = base + (path or "")
    if not utm:
        return url
    return with_utm(
        url,
        source=utm.get("source", "email"),
        medium=utm.get("medium", "email"),
        campaign=utm.get("campaign", "outreach"),
        content=utm.get("content"),
        term=utm.get("term"),
    )


def app_link(
    *,
    source: str,
    medium: str = "email",
    campaign: str = "app_download",
    content: str | None = None,
) -> str:
    """Tagged /app hop (fires GA4, then redirects to the App Store)."""
    return with_utm(
        f"{SITE}/app",
        source=source,
        medium=medium,
        campaign=campaign,
        content=content,
    )


def register_link(
    *,
    source: str,
    medium: str = "email",
    campaign: str = "agency_outreach",
    content: str | None = None,
) -> str:
    return with_utm(
        f"{SITE}/register",
        source=source,
        medium=medium,
        campaign=campaign,
        content=content,
    )


def deck_link(
    filename: str = "PalmCare_Deck_v5.pdf",
    *,
    source: str = "email",
    medium: str = "investor",
    campaign: str = "investor_seed",
    content: str | None = "deck",
) -> str:
    return with_utm(
        f"{SITE}/{filename}",
        source=source,
        medium=medium,
        campaign=campaign,
        content=content,
    )


# Presets used by the active outreach scripts
PRESETS = {
    "email_launch": dict(source="email", medium="email", campaign="app_launch"),
    "email_outreach": dict(source="email", medium="email", campaign="agency_outreach"),
    "email_followup": dict(source="email", medium="email", campaign="followup"),
    "investor_seed": dict(source="email", medium="investor", campaign="investor_seed"),
    "social_meta": dict(source="meta", medium="social", campaign="content_calendar"),
    "social_li": dict(source="linkedin", medium="social", campaign="content_calendar"),
    "qr_print": dict(source="qr", medium="qr", campaign="print_materials"),
}
