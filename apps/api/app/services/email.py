"""
Email Service using Resend

Handles all transactional emails for the platform.
"""

import os
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

# Check if resend is available
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality disabled.")


class EmailService:
    """Service for sending transactional emails via Resend."""
    
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        # Use Resend's default sender if custom domain not verified
        # To use custom domain: verify it at https://resend.com/domains
        custom_from = os.getenv("EMAIL_FROM")
        # Use Resend's test domain until palmtai.com is verified
        # Change to "Homecare AI <welcome@palmtai.com>" once domain is verified
        self.from_email = custom_from if custom_from else "Homecare AI <onboarding@resend.dev>"
        self.support_email = os.getenv("SUPPORT_EMAIL", "support@palmtai.com")
        self.app_url = os.getenv("APP_URL", "https://app.palmtai.com")
        
        if self.api_key and RESEND_AVAILABLE:
            resend.api_key = self.api_key
            self.enabled = True
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
    ) -> bool:
        """
        Send an email via Resend.
        
        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML body
            text: Plain text body (optional)
            reply_to: Reply-to address (optional)
            attachments: List of attachments, each with 'filename' and 'content' (base64 or bytes)
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning(f"Email disabled. Would have sent to {to}: {subject}")
            return False
        
        try:
            params = {
                "from": self.from_email,
                "to": [to] if isinstance(to, str) else to,
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
            logger.info(f"Email sent to {to}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False
    
    # ==================== Business Emails ====================
    
    def send_business_registration_received(self, business_email: str, business_name: str):
        """Send welcome email after registration."""
        subject = "Welcome to Homecare AI!"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin-bottom: 10px;">Welcome to Homecare AI!</h1>
                <p style="color: #666; font-size: 16px;">Your account is ready to use</p>
            </div>
            
            <p>Hello <strong>{business_name}</strong>,</p>
            
            <p>Thank you for joining Homecare AI! Your account has been created and is ready to use.</p>
            
            <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Getting Started:</h3>
                <ol style="color: #555; line-height: 1.8;">
                    <li><strong>Upload an Assessment</strong> - Record or upload a care assessment conversation</li>
                    <li><strong>AI Processing</strong> - We'll transcribe and analyze the assessment</li>
                    <li><strong>Generate Contract</strong> - Get a proposal-ready service contract</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{self.app_url}/login" 
                   style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Log In to Your Dashboard
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Questions? Reply to this email or contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
                © 2026 Homecare AI. All rights reserved.
            </p>
        </div>
        """
        return self.send_email(business_email, subject, html)
    
    def send_business_approved(self, business_email: str, business_name: str, login_url: str):
        """Send approval notification with login link."""
        subject = "Your Account is Approved! - Homecare AI"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981;">Account Approved!</h1>
            <p>Hello {business_name},</p>
            <p>Great news! Your Homecare AI account has been approved and is now active.</p>
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
            <p>Best regards,<br>The Homecare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html)
    
    def send_business_rejected(self, business_email: str, business_name: str, reason: Optional[str] = None):
        """Send rejection notification."""
        subject = "Registration Update - Homecare AI"
        reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Registration Update</h1>
            <p>Hello {business_name},</p>
            <p>Unfortunately, we were unable to approve your registration at this time.</p>
            {reason_text}
            <p>If you believe this is an error or would like to provide additional information, please contact our support team.</p>
            <br>
            <p>Best regards,<br>The Homecare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html)
    
    def send_business_pending_documents(self, business_email: str, business_name: str, missing_docs: List[str]):
        """Request additional documents from business."""
        docs_list = "".join([f"<li>{doc}</li>" for doc in missing_docs])
        subject = "Additional Documents Required - Homecare AI"
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
            <p>Best regards,<br>The Homecare AI Team</p>
        </div>
        """
        return self.send_email(business_email, subject, html)
    
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
        return self.send_email(admin_email, subject, html)
    
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
            reply_to=user_email
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
        return self.send_email(user_email, subject, html)
    
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
        return self.send_email(user_email, subject, html)
    
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
        return self.send_email(user_email, subject, html)
    
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
        return self.send_email(user_email, subject, html)


# Singleton instance
email_service = EmailService()


def get_email_service() -> EmailService:
    """Get the email service singleton."""
    return email_service
