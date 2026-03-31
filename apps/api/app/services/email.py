"""
Email Service using Resend

Handles all transactional emails for the platform.
Dual-domain strategy:
  - palmcareai.com  → Agency outreach, product emails, onboarding, support
  - palmtai.com     → Investor emails (corporate/fundraising identity)

Sender addresses (via Resend-verified subdomains):
  - sales@send.palmcareai.com    → Agency outreach, demos, contracts
  - onboarding@send.palmcareai.com → Registration, new user onboarding
  - support@send.palmcareai.com  → Password resets, support tickets
  - invest@send.palmtai.com      → Investor outreach
"""

import os
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality disabled.")

BRAND = "PalmCare AI"


class EmailService:
    """Service for sending transactional emails via Resend."""

    def __init__(self):
        self.api_key = (os.getenv("RESEND_API_KEY") or "").strip()
        self.app_url = os.getenv("APP_URL", "https://palmcareai.com")

        # Product/agency emails → palmcareai.com
        self.from_onboarding = os.getenv(
            "EMAIL_FROM_ONBOARDING", f"{BRAND} <onboarding@send.palmcareai.com>"
        )
        self.from_welcome = os.getenv(
            "EMAIL_FROM_WELCOME", f"{BRAND} <welcome@send.palmcareai.com>"
        )
        self.from_sales = os.getenv(
            "EMAIL_FROM_SALES", "Muse Ibrahim <sales@send.palmcareai.com>"
        )
        self.from_support = os.getenv(
            "EMAIL_FROM_SUPPORT", f"{BRAND} <support@send.palmcareai.com>"
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
    ) -> dict:
        """
        Send an email via Resend.

        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML body
            sender: Override from address (defaults to self.from_email)
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
    
    def send_password_reset(self, user_email: str, user_name: str, reset_url: str):
        """Send password reset email with link."""
        subject = f"Reset Your Password - {BRAND}"
        html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 20px; text-align: center; border-radius: 0 0 30px 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                    PalmCare AI
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">
                    Password Reset Request
                </p>
            </div>
            
            <!-- Main content -->
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f512.png" alt="Lock" style="width: 50px; height: 50px;">
                    <h2 style="color: #1f2937; margin: 15px 0 10px 0; font-size: 24px;">Reset Your Password</h2>
                </div>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Hi {user_name},
                </p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password.
                    This link will expire in <strong>1 hour</strong>.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{reset_url}" 
                       style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                        Reset Password
                    </a>
                </div>
                
                <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>Didn't request this?</strong> If you didn't request a password reset, 
                        you can safely ignore this email. Your password will not be changed.
                    </p>
                </div>
                
                <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <span style="color: #6366f1; word-break: break-all;">{reset_url}</span>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6366f1; font-weight: 600; margin: 0 0 5px 0; font-size: 14px;">PalmCare AI</p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    AI-Powered CRM for Home Healthcare Agencies
                </p>
                <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">
                    &copy; 2026 PalmCare AI. All rights reserved.
                </p>
            </div>
        </div>
        """
        return self.send_email(user_email, subject, html, sender=self.from_support)
    
    # ==================== Business Emails ====================
    
    def send_business_registration_received(self, business_email: str, business_name: str):
        """Send branded welcome email with product screenshots and demo booking CTA."""
        subject = f"Welcome to {BRAND} — Your 14-Day Free Trial Is Live"
        app = self.app_url
        screenshots = f"{app}/screenshots"
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">

            <!-- ══ HEADER ══ -->
            <div style="background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); padding: 48px 32px 40px; text-align: center;">
                <img src="{app}/app-logo.png" alt="PalmCare AI" width="52" height="52" style="margin-bottom: 12px; border-radius: 12px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.3px;">
                    PalmCare AI
                </h1>
                <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">
                    WHERE CARE MEETS INTELLIGENCE
                </p>
            </div>

            <!-- ══ WELCOME ══ -->
            <div style="padding: 40px 32px 0;">
                <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 22px; font-weight: 700;">
                    Welcome aboard, {business_name}!
                </h2>
                <p style="color: #475569; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
                    Your 14-day free trial is active. You have full access to every feature — AI voice assessments,
                    instant contract generation, the CRM dashboard, and our iOS mobile app.
                    Here's a quick look at what you can do right now.
                </p>
            </div>

            <!-- ══ STEP 1: RECORD ══ -->
            <div style="padding: 0 32px;">
                <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 28px;">
                    <tr>
                        <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                            <div style="background: #0d9488; color: #fff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; font-weight: 700;">1</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                            <p style="color: #0f172a; margin: 0 0 4px; font-size: 16px; font-weight: 700;">Record a Client Assessment</p>
                            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">
                                Open the PalmCare AI mobile app, tap <strong>Record</strong>, and speak naturally with your client.
                                Our AI transcribes the conversation in real-time using Deepgram Nova-3 and automatically
                                identifies speakers, care needs, and billable services.
                            </p>
                        </td>
                    </tr>
                </table>
                <div style="text-align: center; margin-bottom: 32px;">
                    <img src="{screenshots}/email/recording_screen.png" alt="PalmCare AI — Voice Recording"
                         width="520" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0;">
                </div>
            </div>

            <!-- ══ STEP 2: CRM ══ -->
            <div style="padding: 0 32px;">
                <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 28px;">
                    <tr>
                        <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                            <div style="background: #0891b2; color: #fff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; font-weight: 700;">2</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                            <p style="color: #0f172a; margin: 0 0 4px; font-size: 16px; font-weight: 700;">Manage Everything in the CRM</p>
                            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">
                                Your web dashboard gives you a complete view of clients, assessments, visits, 
                                contracts, and billing — all in one place. Track your team, monitor revenue,
                                and never lose a client to paperwork again.
                            </p>
                        </td>
                    </tr>
                </table>
                <div style="text-align: center; margin-bottom: 32px;">
                    <img src="{screenshots}/email/crm_dashboard.png" alt="PalmCare AI — CRM Dashboard"
                         width="520" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0;">
                </div>
            </div>

            <!-- ══ STEP 3: CONTRACT ══ -->
            <div style="padding: 0 32px;">
                <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 28px;">
                    <tr>
                        <td style="width: 40px; vertical-align: top; padding-top: 2px;">
                            <div style="background: #0d9488; color: #fff; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-size: 14px; font-weight: 700;">3</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                            <p style="color: #0f172a; margin: 0 0 4px; font-size: 16px; font-weight: 700;">Generate Contracts Instantly</p>
                            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">
                                After the assessment, a state-compliant service agreement is generated automatically.
                                Review, customize, send for signature — all within seconds. Our AI knows the
                                regulations for all 50 states.
                            </p>
                        </td>
                    </tr>
                </table>
                <div style="text-align: center; margin-bottom: 32px;">
                    <img src="{screenshots}/email/crm_contract.png" alt="PalmCare AI — Contract Generation"
                         width="520" style="max-width: 100%; border-radius: 12px; border: 1px solid #e2e8f0;">
                </div>
            </div>

            <!-- ══ PRIMARY CTA ══ -->
            <div style="padding: 0 32px 12px; text-align: center;">
                <a href="{app}/login"
                   style="display: inline-block; background: linear-gradient(135deg, #0d9488, #0891b2); color: #ffffff; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; letter-spacing: 0.3px;">
                    Log In &amp; Start Your First Assessment
                </a>
            </div>

            <!-- ══ DEMO BOOKING ══ -->
            <div style="margin: 32px; background: linear-gradient(135deg, #f0fdfa, #ecfeff); border: 1px solid #99f6e4; border-radius: 16px; padding: 28px; text-align: center;">
                <p style="color: #0f172a; margin: 0 0 6px; font-size: 17px; font-weight: 700;">
                    Want a Personal Walkthrough?
                </p>
                <p style="color: #475569; margin: 0 0 20px; font-size: 14px; line-height: 1.5;">
                    Book a free 30-minute demo with our team. We'll show you the full platform live
                    and answer any questions about your agency's specific needs.
                </p>
                <a href="{app}/book-demo"
                   style="display: inline-block; background: #0f172a; color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 600;">
                    Schedule a Free Demo
                </a>
            </div>

            <!-- ══ QUICK LINKS ══ -->
            <div style="padding: 0 32px 32px;">
                <table cellpadding="0" cellspacing="0" style="width: 100%;">
                    <tr>
                        <td style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; width: 33%;">
                            <p style="color: #0d9488; margin: 0 0 4px; font-size: 22px; font-weight: 800;">50</p>
                            <p style="color: #64748b; margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">States Covered</p>
                        </td>
                        <td style="width: 12px;"></td>
                        <td style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; width: 33%;">
                            <p style="color: #0d9488; margin: 0 0 4px; font-size: 22px; font-weight: 800;">60s</p>
                            <p style="color: #64748b; margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Avg Contract Time</p>
                        </td>
                        <td style="width: 12px;"></td>
                        <td style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; width: 33%;">
                            <p style="color: #0d9488; margin: 0 0 4px; font-size: 22px; font-weight: 800;">HIPAA</p>
                            <p style="color: #64748b; margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Compliant</p>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- ══ HELP ══ -->
            <div style="padding: 0 32px 32px; text-align: center;">
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
                    Questions? Reach us at
                    <a href="mailto:support@palmcareai.com" style="color: #0d9488; text-decoration: none; font-weight: 600;">support@palmcareai.com</a>
                    — we typically respond within a few hours.
                </p>
            </div>

            <!-- ══ FOOTER ══ -->
            <div style="background: #0f172a; padding: 32px; text-align: center;">
                <img src="{app}/app-logo.png" alt="PalmCare AI" width="28" height="28" style="margin-bottom: 8px; opacity: 0.8; border-radius: 6px;">
                <p style="color: #94a3b8; margin: 0 0 4px; font-size: 13px; font-weight: 600;">PalmCare AI</p>
                <p style="color: #64748b; margin: 0 0 16px; font-size: 11px;">Where care meets intelligence</p>
                <div style="margin-bottom: 16px;">
                    <a href="{app}" style="color: #0d9488; text-decoration: none; font-size: 12px; margin: 0 8px;">Website</a>
                    <span style="color: #334155;">|</span>
                    <a href="{app}/features" style="color: #0d9488; text-decoration: none; font-size: 12px; margin: 0 8px;">Features</a>
                    <span style="color: #334155;">|</span>
                    <a href="{app}/pricing" style="color: #0d9488; text-decoration: none; font-size: 12px; margin: 0 8px;">Pricing</a>
                    <span style="color: #334155;">|</span>
                    <a href="{app}/privacy" style="color: #0d9488; text-decoration: none; font-size: 12px; margin: 0 8px;">Privacy</a>
                </div>
                <p style="color: #475569; font-size: 11px; margin: 0;">
                    &copy; 2026 Palm Technologies, INC. All rights reserved.
                </p>
            </div>
        </div>
        """
        return self.send_email(
            business_email, subject, html,
            sender=self.from_onboarding,
            reply_to="support@palmcareai.com",
        )
    
    def send_business_approved(self, business_email: str, business_name: str, login_url: str):
        """Send approval notification with login link."""
        subject = f"Your Account is Approved! - {BRAND}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Account Approved!</h1>
            <p>Hello {business_name},</p>
            <p>Great news! Your PalmCare AI account has been approved and is now active.</p>
            <p>You can now log in and start using our platform to:</p>
            <ul>
                <li>Upload care assessment recordings</li>
                <li>Generate service contracts</li>
                <li>Manage your clients and caregivers</li>
            </ul>
            <p style="margin: 30px 0;">
                <a href="{login_url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Log In Now
                </a>
            </p>
            <p>If you have any questions, please contact our support team.</p>
            <br>
            <p>Best regards,<br>The PalmCare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html, sender=self.from_welcome)
    
    def send_business_rejected(self, business_email: str, business_name: str, reason: Optional[str] = None):
        """Send rejection notification."""
        subject = f"Registration Update - {BRAND}"
        reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Registration Update</h1>
            <p>Hello {business_name},</p>
            <p>Unfortunately, we were unable to approve your registration at this time.</p>
            {reason_text}
            <p>If you believe this is an error or would like to provide additional information, please contact our support team.</p>
            <br>
            <p>Best regards,<br>The PalmCare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html, sender=self.from_welcome)
    
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
    
    def send_admin_new_registration(self, admin_email: str, business_name: str, business_id: str):
        """Notify admin of new business registration."""
        subject = f"New Registration: {business_name}"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">New Business Registration</h1>
            <p>A new business has registered and requires approval:</p>
            <p><strong>Business Name:</strong> {business_name}</p>
            <p><strong>Business ID:</strong> {business_id}</p>
            <p>Please review their application in the admin dashboard.</p>
        </div>
        """
        return self.send_email(admin_email, subject, html, sender=self.from_onboarding)
    
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
