"""
Email Service using Resend

Handles all transactional emails for the platform.
Dual-domain strategy:
  - palmcareai.com  → Agency outreach, product emails, onboarding, support
  - palmtai.com     → Investor emails (corporate/fundraising identity)

Sender addresses (via Resend-verified subdomains):
  - sales@palmcareai.com    → Agency outreach, demos, contracts
  - onboarding@palmcareai.com → Registration, new user onboarding
  - support@palmcareai.com  → Password resets, support tickets
  - invest@send.palmtai.com      → Investor outreach
"""

import os
import base64
import logging
from pathlib import Path
from typing import Optional, List

logger = logging.getLogger(__name__)

# Marketing collateral bundled with the API (attached to emails).
_ASSETS = Path(__file__).resolve().parent.parent / "assets"
BROCHURE_PATH = _ASSETS / "PalmCare-AI-Brochure.pdf"
PITCH_DECK_PATH = _ASSETS / "PalmCare_Deck_v5.pdf"


def _file_attachment(path: Path, filename: str) -> Optional[dict]:
    """Load a bundled file as a Resend attachment (None if missing)."""
    try:
        content = path.read_bytes()
        return {
            "filename": filename,
            "content": base64.b64encode(content).decode("ascii"),
        }
    except OSError:
        logger.warning(f"Attachment not found at {path}; sending without it")
        return None


def _brochure_attachment() -> Optional[dict]:
    """Load the brochure PDF as a Resend attachment (None if missing)."""
    return _file_attachment(BROCHURE_PATH, "PalmCare-AI-Brochure.pdf")


def _pitch_deck_attachment() -> Optional[dict]:
    """Load the pitch deck PDF (v5) as a Resend attachment (None if missing)."""
    return _file_attachment(PITCH_DECK_PATH, "PalmCare_Deck_v5.pdf")



try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality disabled.")

BRAND = "PalmCare AI"

# Pipeline Glass palette (matches Paper Email Glass + product tokens).
# Email clients ignore backdrop-filter, so we simulate glass with a soft
# slate field, frosted white card, hairline border, and teal accent.
_GLASS = {
    "bg": "#F8FAFC",
    "card": "#FFFFFF",
    "border": "#E2E8F0",
    "text": "#0F172A",
    "muted": "#64748B",
    "faint": "#94A3B8",
    "teal": "#0D9488",
    "teal_dark": "#115E59",
    "teal_soft": "#F0FDFA",
    "teal_edge": "#99F6E4",
}

_PUBLIC_SITE = "https://palmcareai.com"
_PUBLIC_API_URL = (
    os.getenv("PUBLIC_API_URL")
    or os.getenv("API_BASE_URL")
    or "https://api-production-a0a2.up.railway.app"
).rstrip("/")
_UNSUB_MAILTO = os.getenv("UNSUBSCRIBE_MAILTO", "sales@palmtai.com")


def _unsubscribe_secret() -> str:
    return (
        os.getenv("UNSUBSCRIBE_SECRET")
        or os.getenv("CRON_SECRET")
        or os.getenv("JWT_SECRET")
        or "palmcare-unsubscribe-dev-secret"
    )


def unsubscribe_token(email: str | None) -> str:
    """HMAC token shared with /unsubscribe and sales_leads one-click."""
    import hashlib
    import hmac

    norm = (email or "").strip().lower()
    return hmac.new(
        _unsubscribe_secret().encode("utf-8"),
        norm.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]


def unsubscribe_url(email: str | None) -> str:
    from urllib.parse import urlencode

    params = {
        "email": (email or "").strip().lower(),
        "token": unsubscribe_token(email),
        "utm_source": "email",
        "utm_medium": "email",
        "utm_campaign": "product",
        "utm_content": "unsubscribe",
    }
    return f"{_PUBLIC_SITE}/unsubscribe?{urlencode(params)}"


def unsubscribe_headers(email: str | None) -> dict:
    """RFC 8058 headers so Gmail/Apple Mail show a native Unsubscribe control."""
    from urllib.parse import urlencode

    params = {
        "email": (email or "").strip().lower(),
        "token": unsubscribe_token(email),
    }
    api = f"{_PUBLIC_API_URL}/platform/sales/leads/unsubscribe?{urlencode(params)}"
    return {
        "List-Unsubscribe": f"<mailto:{_UNSUB_MAILTO}?subject=unsubscribe>, <{api}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


def _glass_email(
    *,
    title: str,
    body_html: str,
    cta_label: str,
    cta_url: str,
    note_title: str,
    note_body: str,
    unsubscribe_href: str,
    fallback_label: str = "Button not working? Paste this link:",
    logo_url: Optional[str] = None,
    app_url: str = "https://palmcareai.com",
) -> str:
    """Simple glass-card shell. App logo mark + unsubscribe on every send."""
    g = _GLASS
    mark = logo_url or f"{app_url.rstrip('/')}/app-logo.png"
    logo = (
        f'<img src="{mark}" width="40" height="40" alt="PalmCare AI" '
        f'style="display:block;width:40px;height:40px;border-radius:10px;border:0;outline:none;" />'
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:{g['bg']};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{g['bg']};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
      <tr><td style="background:{g['card']};border:1px solid {g['border']};border-radius:20px;padding:28px 24px;box-shadow:0 18px 40px rgba(15,23,42,0.06);">

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;width:40px;">{logo}</td>
            <td style="vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:{g['text']};letter-spacing:-0.02em;">PalmCare AI</td>
          </tr>
        </table>
        <div style="width:36px;height:3px;border-radius:99px;background:{g['teal']};margin:0 0 24px;"></div>

        <h1 style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:26px;line-height:32px;font-weight:700;color:{g['text']};letter-spacing:-0.03em;">{title}</h1>
        <div style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:{g['muted']};">{body_html}</div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr><td align="center">
            <a href="{cta_url}" style="display:inline-block;background:{g['teal']};color:#FFFFFF;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">{cta_label}</a>
          </td></tr>
        </table>

        <div style="background:{g['teal_soft']};border:1px solid {g['teal_edge']};border-radius:12px;padding:14px 16px;margin:0 0 20px;">
          <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:{g['teal_dark']};">{note_title}</p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:20px;color:{g['muted']};">{note_body}</p>
        </div>

        <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:{g['muted']};">{fallback_label}</p>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:{g['teal']};word-break:break-all;"><a href="{cta_url}" style="color:{g['teal']};text-decoration:none;">{cta_url}</a></p>

      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0;">
        <p style="margin:0 0 4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:500;color:{g['muted']};">PalmCare AI</p>
        <p style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:{g['faint']};">palmcareai.com · support@palmcareai.com</p>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:16px;color:{g['faint']};">
          <a href="{unsubscribe_href}" style="color:{g['muted']};text-decoration:underline;">Email preferences</a>
          from PalmCare emails
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


class EmailService:
    """Service for sending transactional emails via Resend."""

    def __init__(self):
        self.api_key = (os.getenv("RESEND_API_KEY") or "").strip()
        self.app_url = os.getenv("APP_URL", "https://palmcareai.com")

        # Product/agency emails → palmcareai.com
        self.from_onboarding = os.getenv(
            "EMAIL_FROM_ONBOARDING", f"{BRAND} <onboarding@palmcareai.com>"
        )
        self.from_welcome = os.getenv(
            "EMAIL_FROM_WELCOME", f"{BRAND} <welcome@palmcareai.com>"
        )
        self.from_sales = os.getenv(
            "EMAIL_FROM_SALES", "Muse Ibrahim <sales@palmcareai.com>"
        )
        self.from_support = os.getenv(
            "EMAIL_FROM_SUPPORT", f"{BRAND} <support@palmcareai.com>"
        )

        # Investor emails → palmtai.com (corporate identity)
        self.from_investor = os.getenv(
            "EMAIL_FROM_INVESTOR", "Muse Ibrahim <invest@send.palmtai.com>"
        )

        self.from_email = os.getenv("EMAIL_FROM", self.from_onboarding)
        self.support_email = os.getenv("SUPPORT_EMAIL", "support@palmcareai.com")

        if self.api_key and RESEND_AVAILABLE:
            resend.api_key = self.api_key
            self.enabled = True
            logger.info(f"Email service enabled (onboarding={self.from_onboarding})")
        else:
            self.enabled = False
            if not self.api_key:
                logger.warning("RESEND_API_KEY not set. Email disabled.")
    
    def send_email(
        self,
        to: str | List[str],
        subject: str,
        html: str,
        text: Optional[str] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
        sender: Optional[str] = None,
        headers: Optional[dict] = None,
    ) -> dict:
        """
        Send an email via Resend.

        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML body
            sender: Override from address (defaults to self.from_email)
            headers: Extra SMTP headers (e.g. List-Unsubscribe / one-click).
                Marketing sends pass the RFC 8058 unsubscribe headers here so
                Gmail/Apple Mail show a native "Unsubscribe" button.
        """
        recipients = [to] if isinstance(to, str) else to
        from_addr = sender or self.from_email

        if not self.enabled:
            logger.warning(f"Email disabled. Would have sent to [REDACTED]: {subject}")
            return {"success": False, "id": None, "error": "email_disabled"}

        try:
            params: dict = {
                "from": from_addr,
                "to": recipients,
                "subject": subject,
                "html": html,
            }

            if text:
                params["text"] = text
            if reply_to:
                params["reply_to"] = reply_to
            if attachments:
                params["attachments"] = attachments
            if headers:
                params["headers"] = headers

            response = resend.Emails.send(params)

            email_id = None
            if isinstance(response, dict):
                email_id = response.get("id")
            elif hasattr(response, "id"):
                email_id = response.id

            logger.info(f"Email sent to [REDACTED]: {subject} (id={email_id or 'unknown'})")
            return {"success": True, "id": email_id, "error": None}

        except Exception as e:
            error_str = str(e)
            logger.error(
                f"Failed to send email to {recipients} "
                f"(subject={subject}, from={from_addr}): {error_str}",
                exc_info=True,
            )
            return {"success": False, "id": None, "error": error_str}
    
    # ==================== Password Reset ====================

    def _send_glass(
        self,
        *,
        to: str,
        subject: str,
        title: str,
        body_html: str,
        cta_label: str,
        cta_url: str,
        note_title: str,
        note_body: str,
        sender: Optional[str] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
        fallback_label: str = "Button not working? Paste this link:",
    ) -> dict:
        html = _glass_email(
            title=title,
            body_html=body_html,
            cta_label=cta_label,
            cta_url=cta_url,
            note_title=note_title,
            note_body=note_body,
            unsubscribe_href=unsubscribe_url(to),
            fallback_label=fallback_label,
            logo_url=f"{self.app_url.rstrip('/')}/app-logo.png",
            app_url=self.app_url,
        )
        return self.send_email(
            to,
            subject,
            html,
            sender=sender,
            reply_to=reply_to,
            attachments=attachments,
            headers=unsubscribe_headers(to),
        )
    
    def send_password_reset(self, user_email: str, user_name: str, reset_url: str):
        """Send password reset email with link."""
        return self._send_glass(
            to=user_email,
            subject=f"Reset your password · {BRAND}",
            title="Reset your password",
            body_html=(
                f"Hi {user_name}, we got a request to reset your PalmCare password. "
                "Use the button below. This link expires in <strong>1 hour</strong>."
            ),
            cta_label="Reset password",
            cta_url=reset_url,
            note_title="Didn't request this?",
            note_body="Ignore this email. Your password stays the same.",
            sender=self.from_support,
        )

    # ==================== Email Verification ====================

    def send_email_verification(self, user_email: str, user_name: str, verify_url: str):
        """Send an email-address verification link."""
        return self._send_glass(
            to=user_email,
            subject=f"Confirm your email · {BRAND}",
            title="Confirm your email",
            body_html=(
                f"Hi {user_name}, confirm this email to secure your PalmCare account. "
                "This link expires in <strong>24 hours</strong>."
            ),
            cta_label="Verify email",
            cta_url=verify_url,
            note_title="Didn't create an account?",
            note_body="Ignore this email. Nothing will change.",
            sender=self.from_support,
        )

    # ==================== Business Emails ====================
    
    def send_business_registration_received(self, business_email: str, business_name: str):
        """Send a simple glass welcome email for new trial signups."""
        brochure = _brochure_attachment()
        return self._send_glass(
            to=business_email,
            subject=f"Welcome to {BRAND}. Your trial is live",
            title="Welcome aboard",
            body_html=(
                f"Hi {business_name}. Your 14-day trial is live. "
                "Record a visit, review the docs, and send the agreement when you're ready."
            ),
            cta_label="Open PalmCare",
            cta_url=f"{self.app_url}/login",
            note_title="What's included",
            note_body="Voice assessments, notes, billables, and contracts from one recording.",
            sender=self.from_onboarding,
            reply_to="support@palmcareai.com",
            attachments=[brochure] if brochure else None,
        )

    # ==================== Marketing Studio ====================

    def marketing_attachments(self) -> List[dict]:
        """Collateral attached to Marketing Studio emails (brochure PDF)."""
        return [a for a in (_brochure_attachment(),) if a]

    def investor_attachments(self) -> List[dict]:
        """Collateral attached to investor emails (pitch deck v5)."""
        return [a for a in (_pitch_deck_attachment(),) if a]

    def send_business_approved(self, business_email: str, business_name: str, login_url: str):
        """Send approval notification with login link."""
        return self._send_glass(
            to=business_email,
            subject=f"Your account is approved · {BRAND}",
            title="You're approved",
            body_html=(
                f"Hi {business_name}. Your PalmCare account is active. "
                "Download the iPhone app or log in on the web to start your first visit."
            ),
            cta_label="Download PALM for iPhone",
            cta_url="https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988",
            note_title="Prefer the web?",
            note_body=(
                f'<a href="{login_url}" style="color:#0D9488;text-decoration:none;">'
                "Log in at palmcareai.com</a>"
            ),
            sender=self.from_welcome,
        )

    def send_business_rejected(self, business_email: str, business_name: str, reason: Optional[str] = None):
        """Send rejection notification."""
        reason_text = f" Reason: {reason}." if reason else ""
        return self._send_glass(
            to=business_email,
            subject=f"Registration update · {BRAND}",
            title="Registration update",
            body_html=(
                f"Hi {business_name}. We were unable to approve your registration at this time."
                f"{reason_text} Reply to this email if you want to share more information."
            ),
            cta_label="Contact support",
            cta_url="mailto:support@palmcareai.com",
            note_title="Need help?",
            note_body="Our team reads every reply. We usually respond within one business day.",
            sender=self.from_welcome,
        )
    
    def send_business_pending_documents(self, business_email: str, business_name: str, missing_docs: List[str]):
        """Request additional documents from business."""
        docs_list = "".join([f"<li>{doc}</li>" for doc in missing_docs])
        subject = f"Additional Documents Required - {BRAND}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Additional Documents Required</h1>
            <p>Hello {business_name},</p>
            <p>To complete your registration, we need the following additional documents:</p>
            <ul>
                {docs_list}
            </ul>
            <p>Please log in to your account and upload these documents at your earliest convenience.</p>
            <br>
            <p>Best regards,<br>The PalmCare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html, sender=self.from_onboarding)
    
    # ==================== Admin Notifications ====================
    
    def send_admin_new_registration(
        self,
        admin_email: str,
        business_name: str,
        business_id: str,
        owner_name: Optional[str] = None,
        owner_email: Optional[str] = None,
        signup_source: Optional[str] = None,
        referral_source: Optional[str] = None,
        attribution: Optional[dict] = None,
        selected_plan: Optional[str] = None,
    ):
        """Notify admin of a new signup, including where the user came from."""
        subject = f"New Signup: {business_name} ({signup_source or 'unknown source'})"

        attribution = attribution or {}
        first = attribution.get("first_touch") or {}
        last = attribution.get("last_touch") or {}

        def row(label: str, value) -> str:
            if not value:
                return ""
            return f"""
            <tr>
                <td style="padding: 6px 12px 6px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">{label}</td>
                <td style="padding: 6px 0; color: #0f172a; font-size: 13px; word-break: break-all;">{value}</td>
            </tr>"""

        attribution_rows = (
            row("Signup source", signup_source)
            + row("They said they found us via", referral_source if referral_source != "not_answered" else None)
            + row("First-touch channel", first.get("channel"))
            + row("First referrer", first.get("referrer"))
            + row("Landing page", first.get("landing_page"))
            + row("First seen", first.get("captured_at"))
            + row("Last-touch channel", last.get("channel"))
            + row("Last referrer", last.get("referrer"))
            + row("UTM campaign", last.get("utm_campaign") or first.get("utm_campaign"))
            + row("UTM source / medium",
                  " / ".join(filter(None, [
                      last.get("utm_source") or first.get("utm_source"),
                      last.get("utm_medium") or first.get("utm_medium"),
                  ])))
        )
        if not attribution_rows:
            attribution_rows = row("Signup source", signup_source or "unknown (no attribution data)")

        html = f"""
        <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0d9488; font-size: 22px;">New Signup 🎉</h1>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <table cellpadding="0" cellspacing="0">
                    {row("Agency", business_name)}
                    {row("Owner", owner_name)}
                    {row("Email", owner_email)}
                    {row("Plan", selected_plan)}
                    {row("Business ID", business_id)}
                </table>
            </div>

            <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px;">
                <p style="margin: 0 0 8px; color: #0f172a; font-size: 14px; font-weight: 700;">Where they came from</p>
                <table cellpadding="0" cellspacing="0">
                    {attribution_rows}
                </table>
            </div>
        </div>
        """
        return self.send_email(admin_email, subject, html, sender=self.from_onboarding)
    
    # ==================== iOS Beta (TestFlight) ====================

    def send_beta_request_admin(
        self,
        admin_email: str,
        requester_name: str,
        requester_email: str,
        agency_name: Optional[str] = None,
        device: Optional[str] = None,
        note: Optional[str] = None,
    ):
        """Notify admin that someone requested TestFlight access.

        The requester's email is what you add to TestFlight → Internal/External
        Testing in App Store Connect.
        """
        subject = f"TestFlight Request: {requester_name} ({requester_email})"
        note_html = f"""
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-top: 14px;">
                <p style="margin: 0; color: #92400e; font-size: 13px;"><strong>Note from requester:</strong> {note}</p>
            </div>""" if note else ""
        html = f"""
        <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0d9488; font-size: 22px;">New iOS Beta Request</h1>
            <p style="color: #475569; font-size: 14px;">
                Add this tester in <strong>App Store Connect → TestFlight</strong> to send their invite:
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                <p style="margin: 0 0 8px; font-size: 14px;"><strong>Name:</strong> {requester_name}</p>
                <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email:</strong>
                    <a href="mailto:{requester_email}" style="color: #0d9488;">{requester_email}</a></p>
                {f'<p style="margin: 0 0 8px; font-size: 14px;"><strong>Agency:</strong> {agency_name}</p>' if agency_name else ''}
                {f'<p style="margin: 0; font-size: 14px;"><strong>Device:</strong> {device}</p>' if device else ''}
            </div>
            {note_html}
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
                Reply to this email to reach the requester directly.
            </p>
        </div>
        """
        return self.send_email(
            admin_email, subject, html,
            sender=self.from_onboarding,
            reply_to=requester_email,
        )

    def send_beta_request_confirmation(self, requester_email: str, requester_name: str):
        """Confirm receipt of a TestFlight beta request."""
        subject = f"You're on the list — {BRAND} iOS Beta"
        html = f"""
        <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">PalmCare AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px; letter-spacing: 0.5px;">iOS BETA PROGRAM</p>
            </div>
            <div style="padding: 36px 32px;">
                <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px;">You're on the list, {requester_name}!</h2>
                <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                    Thanks for requesting early access to the PalmCare AI iOS app.
                    We add new testers personally, so keep an eye out for a
                    <strong>TestFlight invitation</strong> from Apple — it usually arrives within 1&ndash;2 business days.
                </p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                    <p style="margin: 0 0 8px; color: #0f172a; font-size: 14px; font-weight: 700;">What happens next</p>
                    <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.7;">
                        1. You'll get an email from TestFlight with an invite link.<br>
                        2. Install the free <a href="https://apps.apple.com/app/testflight/id899247664" style="color: #0d9488;">TestFlight app</a> from the App Store.<br>
                        3. Accept the invite and start Palm-ing your visits.
                    </p>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">
                    Questions? Just reply to this email — a real person reads it.
                </p>
            </div>
            <div style="background: #f9fafb; padding: 22px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #0d9488; font-weight: 600; margin: 0 0 4px; font-size: 13px;">PalmCare AI</p>
                <p style="color: #9ca3af; font-size: 11px; margin: 0;">Where care meets intelligence &middot; &copy; 2026 Palm Technologies, INC.</p>
            </div>
        </div>
        """
        return self.send_email(
            requester_email, subject, html,
            sender=self.from_onboarding,
            reply_to="sales@palmtai.com",
        )

    # ==================== Support Emails ====================
    
    def send_support_request(self, user_email: str, user_name: str, subject: str, message: str):
        """Forward support request to support team."""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Support Request</h1>
            <p><strong>From:</strong> {user_name} ({user_email})</p>
            <p><strong>Subject:</strong> {subject}</p>
            <hr>
            <p>{message}</p>
        </div>
        """
        return self.send_email(
            self.support_email,
            f"Support Request: {subject}",
            html,
            reply_to=user_email,
            sender=self.from_support,
        )
    
    # ==================== Client/Visit Notifications ====================
    
    def send_client_status_change(
        self, 
        user_email: str, 
        client_name: str, 
        old_status: str, 
        new_status: str,
        changed_by: str = "System"
    ):
        """Notify when a client's status changes."""
        status_colors = {
            "intake": "#3B82F6",  # blue
            "assessment": "#8B5CF6",  # purple
            "proposal": "#F97316",  # orange
            "active": "#22C55E",  # green
            "follow_up": "#EAB308",  # yellow
        }
        new_color = status_colors.get(new_status.lower(), "#6B7280")
        
        subject = f"Client Status Updated: {client_name}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #374151; margin-bottom: 5px;">Client Status Changed</h2>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Client:</strong> {client_name}</p>
                <p style="margin: 0;">
                    <strong>Status:</strong> 
                    <span style="text-decoration: line-through; color: #9CA3AF;">{old_status.replace('_', ' ').title()}</span>
                    →
                    <span style="background: {new_color}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
                        {new_status.replace('_', ' ').title()}
                    </span>
                </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">Changed by: {changed_by}</p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="{self.app_url}/clients" 
                   style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    View Client
                </a>
            </div>
        </div>
        """
        return self.send_email(user_email, subject, html, sender=self.from_onboarding)
    
    def send_assessment_complete(
        self,
        user_email: str,
        client_name: str,
        visit_id: str,
        billables_count: int = 0,
        note_generated: bool = True,
        contract_generated: bool = True,
    ):
        """Notify when an assessment pipeline completes."""
        subject = f"Assessment Complete: {client_name}"
        
        checkmark = "✓"
        items_html = ""
        if billables_count > 0:
            items_html += f'<p style="color: #22C55E;">{checkmark} {billables_count} billable items extracted</p>'
        if note_generated:
            items_html += f'<p style="color: #22C55E;">{checkmark} SOAP note generated</p>'
        if contract_generated:
            items_html += f'<p style="color: #22C55E;">{checkmark} Service contract created</p>'
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
                <h2 style="color: #374151; margin-bottom: 5px;">Assessment Complete!</h2>
                <p style="color: #6B7280;">AI processing finished for {client_name}</p>
            </div>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="color: #166534; margin-top: 0;">What's Ready:</h3>
                {items_html}
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="{self.app_url}/visits/{visit_id}" 
                   style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Review Results
                </a>
            </div>
        </div>
        """
        return self.send_email(user_email, subject, html, sender=self.from_onboarding)
    
    def send_contract_ready(
        self,
        user_email: str,
        client_name: str,
        client_email: str,
        weekly_cost: str,
        visit_id: str,
    ):
        """Notify when a contract is ready to send."""
        subject = f"Contract Ready for {client_name}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                <h2 style="color: #374151; margin-bottom: 5px;">Contract Ready to Send</h2>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Client:</strong> {client_name}</p>
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {client_email}</p>
                <p style="margin: 0;"><strong>Estimated Weekly:</strong> {weekly_cost}</p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
                The service agreement is ready for your review. You can preview it, make edits, 
                and send it directly to the client for signature.
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="{self.app_url}/visits/{visit_id}" 
                   style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Review & Send Contract
                </a>
            </div>
        </div>
        """
        return self.send_email(user_email, subject, html, sender=self.from_sales)
    
    def send_follow_up_reminder(
        self,
        user_email: str,
        client_name: str,
        client_id: str,
        days_since_last_visit: int,
    ):
        """Send reminder for client follow-up."""
        subject = f"Follow-up Reminder: {client_name}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
                <h2 style="color: #374151; margin-bottom: 5px;">Follow-up Reminder</h2>
            </div>
            
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Client:</strong> {client_name}</p>
                <p style="margin: 0; color: #92400e;">
                    <strong>{days_since_last_visit} days</strong> since last visit
                </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
                It's time to schedule a follow-up assessment for this client.
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
                <a href="{self.app_url}/visits/new?client={client_id}" 
                   style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Schedule Assessment
                </a>
            </div>
        </div>
        """
        return self.send_email(user_email, subject, html, sender=self.from_support)


# Singleton instance (lazy-loaded to avoid issues during module import)
_email_service = None


def get_email_service() -> EmailService:
    """Get the email service singleton."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


# Backward-compat alias used by some routers that import `email_service` directly
class _LazyEmailProxy:
    """Proxy that forwards calls to the lazily-initialized singleton."""
    def __getattr__(self, name):
        return getattr(get_email_service(), name)

email_service = _LazyEmailProxy()
