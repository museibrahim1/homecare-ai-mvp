"""
Email Service for Worker

Lightweight email service for sending notifications from Celery tasks.

IMPORTANT: You MUST set the EMAIL_FROM env var to a verified domain sender
for emails to reach real customers. The default "onboarding@resend.dev"
can ONLY deliver to the Resend account owner's email.
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


class EmailService:
    """Service for sending emails via Resend."""
    
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        self.app_url = os.getenv("APP_URL", "https://app.palmtai.com")
        
        custom_from = os.getenv("EMAIL_FROM")
        if custom_from:
            self.from_email = custom_from
        else:
            self.from_email = "Homecare AI <onboarding@resend.dev>"
            logger.warning(
                "EMAIL_FROM not set — using Resend test domain (onboarding@resend.dev). "
                "Emails will ONLY be delivered to the Resend account owner."
            )
        
        if self.api_key and RESEND_AVAILABLE:
            resend.api_key = self.api_key
            self.enabled = True
            logger.info(f"Worker email service enabled (from={self.from_email})")
        else:
            self.enabled = False
            if not self.api_key:
                logger.warning("RESEND_API_KEY not set. Worker email disabled.")
    
    def send_email(
        self,
        to: str | List[str],
        subject: str,
        html: str,
    ) -> dict:
        """Send an email via Resend.
        
        Returns:
            dict with 'success' (bool), 'id' (str or None), and 'error' (str or None)
        """
        recipients = [to] if isinstance(to, str) else to
        
        if not self.enabled:
            logger.warning(f"Email disabled. Would have sent to {recipients}: {subject}")
            return {"success": False, "id": None, "error": "email_disabled"}
        
        try:
            params = {
                "from": self.from_email,
                "to": recipients,
                "subject": subject,
                "html": html,
            }
            
            response = resend.Emails.send(params)
            
            email_id = None
            if isinstance(response, dict):
                email_id = response.get("id")
            elif hasattr(response, "id"):
                email_id = response.id
            
            logger.info(f"Email sent to {recipients}: {subject} (id={email_id or 'unknown'})")
            return {"success": True, "id": email_id, "error": None}
            
        except Exception as e:
            error_str = str(e)
            logger.error(
                f"Failed to send email to {recipients} "
                f"(subject={subject}, from={self.from_email}): {error_str}",
                exc_info=True,
            )
            return {"success": False, "id": None, "error": error_str}
    
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


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    """Get the email service singleton."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
