"""
Email Service using Resend

Handles all transactional emails for the platform.
Each email category uses a dedicated sender address:
  - onboarding@palmtai.com  → Registration, new user onboarding
  - welcome@palmtai.com     → Approvals, team invites, account setup
  - sales@palmtai.com       → Demo bookings, contracts, proposals
  - support@palmtai.com     → Password resets, support tickets, reminders
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
        self.api_key = os.getenv("RESEND_API_KEY")
        self.app_url = os.getenv("APP_URL", "https://palmcareai.com")

        # Dedicated sender addresses — each maps to a verified Resend identity
        self.from_onboarding = os.getenv(
            "EMAIL_FROM_ONBOARDING", f"{BRAND} <onboarding@palmtai.com>"
        )
        self.from_welcome = os.getenv(
            "EMAIL_FROM_WELCOME", f"{BRAND} <welcome@palmtai.com>"
        )
        self.from_sales = os.getenv(
            "EMAIL_FROM_SALES", f"{BRAND} <sales@palmtai.com>"
        )
        self.from_support = os.getenv(
            "EMAIL_FROM_SUPPORT", f"{BRAND} <support@palmtai.com>"
        )

        # Legacy fallback (used by generic send_email when no sender specified)
        self.from_email = os.getenv("EMAIL_FROM", self.from_onboarding)
        self.support_email = os.getenv("SUPPORT_EMAIL", "support@palmtai.com")

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
        """Send welcome email after registration."""
        subject = f"Welcome to {BRAND} - Let's Get You to Revenue Faster!"
        html = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 20px; text-align: center; border-radius: 0 0 30px 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    PalmCare AI
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">
                    The #1 CRM for Home Healthcare Agencies
                </p>
            </div>
            
            <!-- Main content -->
            <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png" alt="Party" style="width: 50px; height: 50px;">
                    <h2 style="color: #1f2937; margin: 15px 0 10px 0; font-size: 24px;">Welcome, {business_name}!</h2>
                    <p style="color: #6b7280; margin: 0; font-size: 16px;">Your account is ready to transform your agency</p>
                </div>
                
                <!-- Value proposition box -->
                <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 16px; padding: 25px; margin: 25px 0; border-left: 4px solid #6366f1;">
                    <p style="color: #4c1d95; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.5;">
                        The #1 Complete CRM for Home Healthcare Agencies
                    </p>
                    <p style="color: #5b21b6; margin: 12px 0 0 0; font-size: 15px; line-height: 1.6;">
                        Reduce your workload, save hours every week, and start generating revenue faster with AI-powered assessments and instant contract creation.
                    </p>
                </div>
                
                <!-- Features grid -->
                <div style="margin: 30px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; text-align: center;">What You Can Do Today</h3>
                    
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0 12px;">
                        <tr>
                            <td style="background: #faf5ff; border-radius: 12px; padding: 20px;">
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="width: 50px; vertical-align: top;">
                                            <div style="background: #6366f1; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px;">
                                                <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f399.png" alt="Mic" style="width: 20px; height: 20px; vertical-align: middle;">
                                            </div>
                                        </td>
                                        <td style="vertical-align: top; padding-left: 10px;">
                                            <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 15px;">Record or Upload Assessments</p>
                                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">AI transcribes and extracts billable services automatically</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #faf5ff; border-radius: 12px; padding: 20px;">
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="width: 50px; vertical-align: top;">
                                            <div style="background: #8b5cf6; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px;">
                                                <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c4.png" alt="Document" style="width: 20px; height: 20px; vertical-align: middle;">
                                            </div>
                                        </td>
                                        <td style="vertical-align: top; padding-left: 10px;">
                                            <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 15px;">Generate Contracts Instantly</p>
                                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">Professional service agreements created in seconds, not hours</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #faf5ff; border-radius: 12px; padding: 20px;">
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="width: 50px; vertical-align: top;">
                                            <div style="background: #a855f7; width: 40px; height: 40px; border-radius: 10px; text-align: center; line-height: 40px;">
                                                <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png" alt="Money" style="width: 20px; height: 20px; vertical-align: middle;">
                                            </div>
                                        </td>
                                        <td style="vertical-align: top; padding-left: 10px;">
                                            <p style="color: #1f2937; margin: 0; font-weight: 600; font-size: 15px;">Get to Revenue Faster</p>
                                            <p style="color: #6b7280; margin: 4px 0 0 0; font-size: 13px;">Close deals same-day with ready-to-sign proposals</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{self.app_url}" 
                       style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
                        Start Your First Assessment →
                    </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
                    Questions? Reply to this email - we're here to help you succeed.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6366f1; font-weight: 600; margin: 0 0 5px 0; font-size: 14px;">PalmCare AI</p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    AI-Powered CRM for Home Healthcare Agencies
                </p>
                <p style="color: #d1d5db; font-size: 11px; margin: 15px 0 0 0;">
                    © 2026 PalmCare AI. All rights reserved.
                </p>
            </div>
        </div>
        """
        return self.send_email(business_email, subject, html, sender=self.from_onboarding)
    
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
