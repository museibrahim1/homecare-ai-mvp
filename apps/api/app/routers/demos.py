"""
Demo Booking Router

Public endpoints for scheduling product demo calls via Google Meet.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.config import settings
from app.models.user import User
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()

DEMO_DURATION_MINUTES = 30

DEMO_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30",
]

DEMO_TIMEZONE = os.getenv("DEMO_TIMEZONE", "America/New_York")


class DemoBookingRequest(BaseModel):
    name: str
    email: EmailStr
    company_name: str
    phone: Optional[str] = None
    date: str  # YYYY-MM-DD
    time_slot: str  # HH:MM (24h)
    message: Optional[str] = None


class DemoBookingResponse(BaseModel):
    success: bool
    meeting_link: Optional[str] = None
    date: str
    time: str
    message: str


def _find_calendar_admin(db: Session) -> Optional[User]:
    """Find an admin user with Google Calendar connected."""
    admin = db.query(User).filter(
        User.google_calendar_connected == True,
        User.google_calendar_access_token.isnot(None),
    ).first()
    return admin


async def _refresh_token_if_needed(user: User, db: Session) -> str:
    """Refresh Google OAuth token if expired."""
    if user.google_calendar_token_expiry:
        buffer = timedelta(minutes=5)
        if datetime.now(timezone.utc) >= user.google_calendar_token_expiry - buffer:
            if not user.google_calendar_refresh_token:
                raise RuntimeError("Token expired, no refresh token")

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "refresh_token": user.google_calendar_refresh_token,
                        "grant_type": "refresh_token",
                    },
                )
                if resp.status_code != 200:
                    raise RuntimeError(f"Token refresh failed: {resp.text}")

                tokens = resp.json()
                user.google_calendar_access_token = tokens["access_token"]
                user.google_calendar_token_expiry = (
                    datetime.now(timezone.utc)
                    + timedelta(seconds=tokens.get("expires_in", 3600))
                )
                db.commit()

    return user.google_calendar_access_token


async def _create_calendar_event(
    access_token: str,
    summary: str,
    description: str,
    start_iso: str,
    end_iso: str,
    attendee_email: str,
) -> dict:
    """Create a Google Calendar event with Google Meet conferencing."""
    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": DEMO_TIMEZONE},
        "end": {"dateTime": end_iso, "timeZone": DEMO_TIMEZONE},
        "attendees": [{"email": attendee_email}],
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email", "minutes": 60},
                {"method": "popup", "minutes": 15},
            ],
        },
        "guestsCanModify": False,
        "sendUpdates": "all",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"conferenceDataVersion": 1, "sendUpdates": "all"},
            json=event_body,
        )

        if resp.status_code not in (200, 201):
            logger.error(f"Calendar event creation failed: {resp.text}")
            raise RuntimeError(f"Calendar API error: {resp.status_code}")

        return resp.json()


@router.get("/slots")
async def get_available_slots():
    """Return available demo time slots for the next 14 weekdays."""
    slots = {}
    today = datetime.now(timezone.utc).date()

    days_added = 0
    current = today + timedelta(days=1)  # start from tomorrow
    while days_added < 14:
        if current.weekday() < 5:  # Mon-Fri
            slots[current.isoformat()] = DEMO_SLOTS.copy()
            days_added += 1
        current += timedelta(days=1)

    return {"timezone": DEMO_TIMEZONE, "duration_minutes": DEMO_DURATION_MINUTES, "slots": slots}


@router.post("/book", response_model=DemoBookingResponse)
async def book_demo(
    booking: DemoBookingRequest,
    db: Session = Depends(get_db),
):
    """Book a product demo with a Google Meet link."""

    if booking.time_slot not in DEMO_SLOTS:
        raise HTTPException(status_code=400, detail="Invalid time slot")

    try:
        selected_date = datetime.strptime(booking.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format (use YYYY-MM-DD)")

    if selected_date <= datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="Date must be in the future")
    if selected_date.weekday() >= 5:
        raise HTTPException(status_code=400, detail="Demos are only available on weekdays")

    hour, minute = map(int, booking.time_slot.split(":"))
    start_dt = datetime(selected_date.year, selected_date.month, selected_date.day, hour, minute)
    end_dt = start_dt + timedelta(minutes=DEMO_DURATION_MINUTES)

    start_iso = start_dt.isoformat()
    end_iso = end_dt.isoformat()

    formatted_date = selected_date.strftime("%B %d, %Y")
    formatted_time = start_dt.strftime("%I:%M %p")

    meeting_link = None
    calendar_created = False

    # Try to create a Google Calendar event with Meet
    admin_user = _find_calendar_admin(db)
    if admin_user:
        try:
            token = await _refresh_token_if_needed(admin_user, db)

            summary = f"PalmCare AI Demo — {booking.company_name}"
            description = (
                f"Product demo for {booking.name} from {booking.company_name}\n"
                f"Email: {booking.email}\n"
                f"Phone: {booking.phone or 'N/A'}\n"
                f"\n{booking.message or ''}"
            )

            event = await _create_calendar_event(
                access_token=token,
                summary=summary,
                description=description,
                start_iso=start_iso,
                end_iso=end_iso,
                attendee_email=booking.email,
            )

            # Extract Meet link
            conf = event.get("conferenceData", {})
            entry_points = conf.get("entryPoints", [])
            for ep in entry_points:
                if ep.get("entryPointType") == "video":
                    meeting_link = ep.get("uri")
                    break

            calendar_created = True
            logger.info(f"Demo booked: {booking.email} on {formatted_date} at {formatted_time} — Meet: {meeting_link}")

        except Exception as e:
            logger.error(f"Failed to create calendar event for demo: {e}")

    # Send confirmation emails
    email_svc = get_email_service()
    app_url = os.getenv("APP_URL", "https://palmcareai.com")

    meet_section = ""
    if meeting_link:
        meet_section = f"""
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #166534; font-weight: 600;">Your Google Meet Link</p>
                <a href="{meeting_link}"
                   style="background: #22c55e; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                    Join Meeting
                </a>
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #6b7280; word-break: break-all;">{meeting_link}</p>
            </div>
        """
    else:
        meet_section = """
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                    We'll send you a Google Meet link before the meeting.
                </p>
            </div>
        """

    # Email to prospect — from sales@
    email_svc.send_email(
        to=booking.email,
        subject=f"Your PalmCare AI Demo — {formatted_date} at {formatted_time}",
        sender=email_svc.from_sales,
        html=f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 40px 20px; text-align: center; border-radius: 0 0 30px 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">PalmCare AI</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Demo is Confirmed</p>
            </div>
            <div style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; text-align: center;">See you soon, {booking.name}!</h2>
                <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date</td>
                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{formatted_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{formatted_time} ET</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration</td>
                            <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">{DEMO_DURATION_MINUTES} minutes</td>
                        </tr>
                    </table>
                </div>
                {meet_section}
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                    During the demo we'll show you how PalmCare AI can help {booking.company_name}
                    turn care assessments into contracts in minutes, manage clients, and grow revenue.
                </p>
                <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
                    Need to reschedule? Just reply to this email.
                </p>
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6366f1; font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">PalmCare AI</p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; 2026 PalmCare AI. All rights reserved.</p>
            </div>
        </div>
        """,
    )

    # Notify admin — from sales@
    admin_email = os.getenv("ADMIN_NOTIFICATION_EMAIL", "admin@palmtai.com")
    email_svc.send_email(
        to=admin_email,
        subject=f"New Demo Booked: {booking.company_name} — {formatted_date}",
        sender=email_svc.from_sales,
        html=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">New Demo Booking</h2>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p><strong>Name:</strong> {booking.name}</p>
                <p><strong>Email:</strong> {booking.email}</p>
                <p><strong>Company:</strong> {booking.company_name}</p>
                <p><strong>Phone:</strong> {booking.phone or 'N/A'}</p>
                <p><strong>Date:</strong> {formatted_date} at {formatted_time} ET</p>
                <p><strong>Message:</strong> {booking.message or 'None'}</p>
                <p><strong>Calendar Event:</strong> {'Created with Meet link' if calendar_created else 'Not created (no admin calendar connected)'}</p>
                {f'<p><strong>Meet Link:</strong> <a href="{meeting_link}">{meeting_link}</a></p>' if meeting_link else ''}
            </div>
        </div>
        """,
    )

    return DemoBookingResponse(
        success=True,
        meeting_link=meeting_link,
        date=formatted_date,
        time=formatted_time,
        message="Demo booked! Check your email for confirmation and meeting details.",
    )
