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
        self.from_email = os.getenv("EMAIL_FROM", "Homecare AI <noreply@homecare.ai>")
        self.support_email = os.getenv("SUPPORT_EMAIL", "support@homecare.ai")
        
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
    ) -> bool:
        """
        Send an email via Resend.
        
        Args:
            to: Recipient email(s)
            subject: Email subject
            html: HTML body
            text: Plain text body (optional)
            reply_to: Reply-to address (optional)
        
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
            
            response = resend.Emails.send(params)
            logger.info(f"Email sent to {to}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            return False
    
    # ==================== Business Emails ====================
    
    def send_business_registration_received(self, business_email: str, business_name: str):
        """Send confirmation that registration was received."""
        subject = "Registration Received - Homecare AI"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6366f1;">Registration Received</h1>
            <p>Hello {business_name},</p>
            <p>Thank you for registering with Homecare AI. We have received your application and it is currently under review.</p>
            <p>Our team will verify your business information and you will receive an email once your account has been approved.</p>
            <p>This process typically takes 1-2 business days.</p>
            <br>
            <p>Best regards,<br>The Homecare AI Team</p>
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


# Singleton instance
email_service = EmailService()
