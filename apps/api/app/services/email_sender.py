"""
"Send from my business email" service.

Lets a caregiver/agency connect their own Google Workspace / Gmail mailbox
(OAuth, gmail.send scope) so service agreements are sent *from* their address
and land in their Sent folder. Kept separate from the platform's Resend service
(app/services/email.py), which still handles platform transactional mail.

OAuth scopes requested: "openid email https://www.googleapis.com/auth/gmail.send".
- gmail.send  → send mail as the user
- openid/email → read the connected address (for display + the From header)
"""
import base64
import logging
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional, List

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/gmail.send"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

# Only redirect URIs we control may participate in the OAuth flow. Google
# enforces its own registered-URI list, but we must not depend on another
# system's configuration for our own auth boundary.
ALLOWED_REDIRECT_URIS = {
    "https://palmcareai.com/oauth/google-email",
    "https://www.palmcareai.com/oauth/google-email",
}


def validate_redirect_uri(redirect_uri: str) -> str:
    if redirect_uri not in ALLOWED_REDIRECT_URIS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported redirect URI.",
        )
    return redirect_uri


def _require_oauth_configured():
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured on the server.",
        )


async def exchange_and_store(user: User, db: Session, code: str, redirect_uri: str) -> str:
    """Exchange an OAuth authorization code for tokens, look up the connected
    address, and persist everything on the user. Returns the connected email."""
    _require_oauth_configured()
    validate_redirect_uri(redirect_uri)

    async with httpx.AsyncClient(timeout=30.0) as client:
        token_resp = await client.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_resp.status_code != 200:
            err = {}
            try:
                err = token_resp.json()
            except Exception:
                pass
            logger.error("email_sender token exchange failed: %s", err.get("error", token_resp.text[:200]))
            detail = "Could not connect your email. Please try again."
            if err.get("error") == "invalid_grant":
                detail = "The connection request expired. Please try connecting again."
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No access token returned by Google.")

        # Resolve the connected mailbox address.
        address = None
        info_resp = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if info_resp.status_code == 200:
            address = info_resp.json().get("email")

    if not refresh_token and not user.email_sender_refresh_token:
        # Without a refresh token we can't keep sending after the access token
        # expires. This happens when the user previously granted consent and
        # Google omits it; force re-consent on the client (prompt=consent).
        logger.warning("email_sender: no refresh_token returned for user %s", user.id)

    user.email_sender_connected = True
    user.email_sender_provider = "google"
    user.email_sender_address = address or user.email_sender_address
    user.email_sender_access_token = access_token
    if refresh_token:
        user.email_sender_refresh_token = refresh_token
    user.email_sender_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    db.commit()

    return user.email_sender_address or ""


async def get_valid_access_token(user: User, db: Session) -> str:
    """Return a valid access token, refreshing if expired."""
    if not user.email_sender_connected:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail="Connect your business email before sending.",
        )

    expiry = user.email_sender_token_expiry
    needs_refresh = expiry is None or datetime.now(timezone.utc) >= (expiry - timedelta(minutes=5))

    if needs_refresh:
        refresh_token = user.email_sender_refresh_token
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="Your email connection expired. Please reconnect your business email.",
            )
        _require_oauth_configured()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
        if resp.status_code != 200:
            user.email_sender_connected = False
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="Your email connection expired. Please reconnect your business email.",
            )
        tokens = resp.json()
        user.email_sender_access_token = tokens["access_token"]
        user.email_sender_token_expiry = datetime.now(timezone.utc) + timedelta(
            seconds=tokens.get("expires_in", 3600)
        )
        db.commit()

    return user.email_sender_access_token


def _clean_header(value: str) -> str:
    """Strip CR/LF so user-supplied values can't inject extra MIME headers."""
    return value.replace("\r", " ").replace("\n", " ").strip()


def _build_mime(
    *,
    sender: str,
    sender_name: Optional[str],
    to: str,
    subject: str,
    html: str,
    cc: Optional[str],
    attachment_bytes: Optional[bytes],
    attachment_filename: Optional[str],
) -> str:
    """Build a base64url-encoded MIME message for the Gmail send API."""
    msg = MIMEMultipart("mixed")
    msg["To"] = _clean_header(to)
    msg["Subject"] = _clean_header(subject)
    msg["From"] = _clean_header(f"{sender_name} <{sender}>" if sender_name else sender)
    if cc:
        msg["Cc"] = _clean_header(cc)

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html, "html", "utf-8"))
    msg.attach(alt)

    if attachment_bytes and attachment_filename:
        part = MIMEApplication(attachment_bytes, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=attachment_filename)
        msg.attach(part)

    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")


async def send_via_gmail(
    user: User,
    db: Session,
    *,
    to: str,
    subject: str,
    html: str,
    cc: Optional[str] = None,
    attachment_bytes: Optional[bytes] = None,
    attachment_filename: Optional[str] = None,
    sender_name: Optional[str] = None,
) -> dict:
    """Send an email as the user's connected mailbox via the Gmail API."""
    access_token = await get_valid_access_token(user, db)
    sender = user.email_sender_address or user.email

    raw = _build_mime(
        sender=sender,
        sender_name=sender_name or user.full_name,
        to=to,
        subject=subject,
        html=html,
        cc=cc,
        attachment_bytes=attachment_bytes,
        attachment_filename=attachment_filename,
    )

    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(
            GMAIL_SEND_URL,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={"raw": raw},
        )

    if resp.status_code not in (200, 201):
        detail = "Failed to send from your email."
        try:
            gerr = resp.json().get("error", {})
            if resp.status_code in (401, 403):
                user.email_sender_connected = False
                db.commit()
                detail = "Your email permission was revoked. Please reconnect your business email."
            elif gerr.get("message"):
                detail = f"Gmail error: {gerr['message']}"
        except Exception:
            pass
        logger.error("Gmail send failed (%s): %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    return {"id": resp.json().get("id"), "sender": sender}


def disconnect(user: User, db: Session) -> None:
    user.email_sender_connected = False
    user.email_sender_provider = None
    user.email_sender_address = None
    user.email_sender_access_token = None
    user.email_sender_refresh_token = None
    user.email_sender_token_expiry = None
    db.commit()
