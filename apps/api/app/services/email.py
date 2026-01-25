"""
Email Service

Handles email notifications for business registration, approval, and user management.
Uses SMTP for sending emails with HTML templates.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Email configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@homecareai.com")
FROM_NAME = os.getenv("FROM_NAME", "Homecare AI")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


class EmailService:
    """
    Service for sending email notifications.
    
    All email sending is non-blocking and errors are logged but not raised
    to prevent email failures from affecting the main application flow.
    """
    
    def __init__(self):
        self.enabled = bool(SMTP_USER and SMTP_PASSWORD)
        if not self.enabled:
            logger.warning("Email service disabled - SMTP credentials not configured")
    
    def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email. Returns True if successful."""
        if not self.enabled:
            logger.info(f"Email would be sent to {to_email}: {subject}")
            return True
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
            msg["To"] = to_email
            
            # Plain text fallback
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            
            # HTML content
            msg.attach(MIMEText(html_content, "html"))
            
            # Send
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(FROM_EMAIL, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    # =========================================================================
    # Registration Emails
    # =========================================================================
    
    def send_registration_confirmation(
        self,
        to_email: str,
        business_name: str,
        business_id: str,
    ):
        """Send confirmation after registration submission."""
        subject = "Registration Received - Homecare AI"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Registration Received</h1>
                </div>
                <div class="content">
                    <p>Hi there,</p>
                    <p>Thank you for registering <strong>{business_name}</strong> with Homecare AI!</p>
                    <p>Your registration has been received and is currently under review. Our team will verify your business information and documents.</p>
                    <p><strong>What happens next?</strong></p>
                    <ul>
                        <li>Our team reviews your submitted documents</li>
                        <li>We verify your business with state records</li>
                        <li>You'll receive an email once your account is approved</li>
                    </ul>
                    <p>This typically takes 1-2 business days.</p>
                    <a href="{APP_URL}/register/status?id={business_id}" class="button">Check Status</a>
                </div>
                <div class="footer">
                    <p>Homecare AI - Simplifying Home Care Administration</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(to_email, subject, html)
    
    def send_approval_notification(
        self,
        to_email: str,
        business_name: str,
        owner_name: str,
    ):
        """Send notification when business is approved."""
        subject = "Your Business is Approved! - Homecare AI"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🎉 Congratulations!</h1>
                </div>
                <div class="content">
                    <p>Hi {owner_name},</p>
                    <p>Great news! <strong>{business_name}</strong> has been approved to use Homecare AI.</p>
                    <p>You can now log in and start using all features:</p>
                    <ul>
                        <li>Upload and transcribe care assessment recordings</li>
                        <li>Generate contracts automatically from conversations</li>
                        <li>Manage clients and caregivers</li>
                        <li>And much more!</li>
                    </ul>
                    <a href="{APP_URL}/login" class="button">Log In Now</a>
                </div>
                <div class="footer">
                    <p>Homecare AI - Simplifying Home Care Administration</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(to_email, subject, html)
    
    def send_rejection_notification(
        self,
        to_email: str,
        business_name: str,
        owner_name: str,
        rejection_reason: str,
    ):
        """Send notification when business is rejected."""
        subject = "Registration Update - Homecare AI"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .reason {{ background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Registration Update</h1>
                </div>
                <div class="content">
                    <p>Hi {owner_name},</p>
                    <p>We were unable to approve the registration for <strong>{business_name}</strong> at this time.</p>
                    <div class="reason">
                        <strong>Reason:</strong><br>
                        {rejection_reason}
                    </div>
                    <p>If you believe this was an error or would like to provide additional information, please contact our support team.</p>
                    <p>You may also submit a new registration with the corrected information.</p>
                </div>
                <div class="footer">
                    <p>Homecare AI - Simplifying Home Care Administration</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(to_email, subject, html)
    
    # =========================================================================
    # User Invitation Emails
    # =========================================================================
    
    def send_user_invitation(
        self,
        to_email: str,
        inviter_name: str,
        business_name: str,
        role: str,
        invite_token: str,
    ):
        """Send invitation to join a business."""
        subject = f"You've been invited to {business_name} - Homecare AI"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
                .role {{ display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 14px; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">You're Invited!</h1>
                </div>
                <div class="content">
                    <p>Hi there,</p>
                    <p><strong>{inviter_name}</strong> has invited you to join <strong>{business_name}</strong> on Homecare AI.</p>
                    <p>Your role: <span class="role">{role.capitalize()}</span></p>
                    <p>Click the button below to set up your account:</p>
                    <a href="{APP_URL}/accept-invite?token={invite_token}" class="button">Accept Invitation</a>
                    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                        This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                </div>
                <div class="footer">
                    <p>Homecare AI - Simplifying Home Care Administration</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(to_email, subject, html)
    
    # =========================================================================
    # Password Reset Emails
    # =========================================================================
    
    def send_password_reset(
        self,
        to_email: str,
        user_name: str,
        reset_token: str,
    ):
        """Send password reset email."""
        subject = "Reset Your Password - Homecare AI"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #64748b; color: white; padding: 30px; border-radius: 12px 12px 0 0; }}
                .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }}
                .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
                .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">Password Reset</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <a href="{APP_URL}/reset-password?token={reset_token}" class="button">Reset Password</a>
                    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
                        This link expires in 24 hours. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </div>
                <div class="footer">
                    <p>Homecare AI - Simplifying Home Care Administration</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        self._send_email(to_email, subject, html)


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create the email service instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
