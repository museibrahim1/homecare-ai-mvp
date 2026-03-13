"""
Demo Booking Router

Public endpoints for scheduling product demo calls via Google Meet.
"""

import os
import time
import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.config import settings
from app.models.user import User
from app.services.email import get_email_service

logger = logging.getLogger(__name__)

router = APIRouter()

_demo_rate_store: dict[str, list[float]] = defaultdict(list)
DEMO_RATE_WINDOW = 300  # 5 minutes
DEMO_RATE_MAX = 5


def _check_demo_rate_limit(ip: str) -> None:
    key = f"demo_book:{ip}"
    now = time.time()
    _demo_rate_store[key] = [t for t in _demo_rate_store[key] if now - t < DEMO_RATE_WINDOW]
    if len(_demo_rate_store[key]) >= DEMO_RATE_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many booking requests. Please try again in a few minutes.",
        )
    _demo_rate_store[key].append(now)

DEMO_DURATION_MINUTES = 30

DEMO_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30",
]

DEMO_TIMEZONE = os.getenv("DEMO_TIMEZONE", "America/New_York")
SALES_EMAIL = os.getenv("SALES_CALENDAR_EMAIL", "sales@palmtai.com")


class DemoBookingRequest(BaseModel):
    name: str
    email: EmailStr
    company_name: str
    phone: Optional[str] = None
    date: Optional[str] = None  # YYYY-MM-DD (optional for request-only flow)
    time_slot: Optional[str] = None  # HH:MM 24h (optional)
    message: Optional[str] = None
    state: Optional[str] = None
    role: Optional[str] = None
    services: Optional[list[str]] = None
    estimated_clients: Optional[str] = None
    current_software: Optional[str] = None
    referral_source: Optional[str] = None  # How did you hear about us?


class DemoBookingResponse(BaseModel):
    success: bool
    meeting_link: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    message: str


class DemoFunnelEvent(BaseModel):
    step: int
    email: Optional[str] = None
    name: Optional[str] = None
    company: Optional[str] = None
    referrer: Optional[str] = None


_funnel_events: list[dict] = []


@router.post("/funnel-event")
def track_funnel_event(event: DemoFunnelEvent, request: Request):
    """Track demo booking funnel progression (lightweight, in-memory)."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    _funnel_events.append({
        "step": event.step,
        "email": event.email,
        "name": event.name,
        "company": event.company,
        "referrer": event.referrer,
        "ip": ip.split(",")[0].strip(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    if len(_funnel_events) > 5000:
        _funnel_events[:] = _funnel_events[-2500:]
    return {"ok": True}


@router.get("/funnel-stats")
def get_funnel_stats(request: Request):
    """Return demo booking funnel stats. Requires internal key."""
    cron_secret = os.getenv("CRON_SECRET", "palmcare-cron-2026")
    key = request.headers.get("X-Internal-Key", "") or request.query_params.get("key", "")
    if key != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    from collections import Counter
    step_counts = Counter(e["step"] for e in _funnel_events)
    step_labels = {1: "Contact Info", 2: "Agency Info", 3: "Details", 4: "Pick Time", 5: "Booked"}
    funnel = [
        {"step": s, "label": step_labels.get(s, f"Step {s}"), "count": step_counts.get(s, 0)}
        for s in sorted(step_labels.keys())
    ]
    unique_visitors = len(set(e["ip"] for e in _funnel_events))
    recent = _funnel_events[-20:][::-1]
    return {"funnel": funnel, "unique_visitors": unique_visitors, "total_events": len(_funnel_events), "recent": recent}


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
    attendees = [
        {"email": attendee_email},
        {"email": SALES_EMAIL},
    ]
    event_body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_iso, "timeZone": DEMO_TIMEZONE},
        "end": {"dateTime": end_iso, "timeZone": DEMO_TIMEZONE},
        "attendees": attendees,
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
    request: Request,
    booking: DemoBookingRequest,
    db: Session = Depends(get_db),
):
    """Book a product demo — auto-schedules via Google Calendar when connected."""
    client_ip = request.client.host if request.client else "unknown"
    _check_demo_rate_limit(client_ip)

    has_schedule = booking.date and booking.time_slot
    meeting_link = None
    calendar_created = False
    formatted_date = None
    formatted_time = None

    admin_user = _find_calendar_admin(db)

    if has_schedule:
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
        formatted_date = selected_date.strftime("%B %d, %Y")
        formatted_time = start_dt.strftime("%I:%M %p")

    elif admin_user:
        # Auto-pick the next available weekday at 10:00 AM
        today = datetime.now(timezone.utc).date()
        candidate = today + timedelta(days=1)
        while candidate.weekday() >= 5:
            candidate += timedelta(days=1)
        auto_slot = "10:00"
        hour, minute = 10, 0
        start_dt = datetime(candidate.year, candidate.month, candidate.day, hour, minute)
        end_dt = start_dt + timedelta(minutes=DEMO_DURATION_MINUTES)
        formatted_date = candidate.strftime("%B %d, %Y")
        formatted_time = start_dt.strftime("%I:%M %p")
        has_schedule = True

    if has_schedule and admin_user:
        try:
            token = await _refresh_token_if_needed(admin_user, db)
            summary = f"PalmCare AI Demo — {booking.company_name}"
            description = (
                f"Product demo for {booking.name} from {booking.company_name}\n"
                f"Email: {booking.email}\n"
                f"Phone: {booking.phone or 'N/A'}\n"
                f"State: {booking.state or 'N/A'}\n"
                f"Services: {', '.join(booking.services or []) or 'N/A'}\n"
                f"Estimated Clients: {booking.estimated_clients or 'N/A'}\n"
                f"Current Software: {booking.current_software or 'N/A'}\n"
            )
            event = await _create_calendar_event(
                access_token=token, summary=summary, description=description,
                start_iso=start_dt.isoformat(), end_iso=end_dt.isoformat(),
                attendee_email=booking.email,
            )
            conf = event.get("conferenceData", {})
            for ep in conf.get("entryPoints", []):
                if ep.get("entryPointType") == "video":
                    meeting_link = ep.get("uri")
                    break
            calendar_created = True
            logger.info(f"Demo booked on {formatted_date} at {formatted_time} for {booking.email}")
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            if not booking.date:
                has_schedule = False

    # Also store as a sales lead for CRM tracking
    try:
        from app.models.sales_lead import SalesLead
        lead = SalesLead(
            provider_name=booking.company_name,
            contact_name=booking.name,
            contact_email=booking.email,
            phone=booking.phone,
            state=booking.state or "NA",
            source="demo_request",
            status="new",
            notes=f"Role: {booking.role or 'N/A'}\nServices: {', '.join(booking.services or [])}\nClients: {booking.estimated_clients or 'N/A'}\nCurrent Software: {booking.current_software or 'N/A'}\nHeard About Us: {booking.referral_source or 'N/A'}",
        )
        db.add(lead)
        db.commit()
    except Exception as e:
        logger.warning(f"Could not save demo request as lead: {e}")
        db.rollback()

    email_svc = get_email_service()

    verified_sender = "Muse Ibrahim <sales@send.palmtai.com>"

    services_list = ', '.join(booking.services or []) or 'Not specified'

    # Confirmation email to prospect
    if has_schedule and formatted_date:
        subject = f"Your PalmCare AI Demo is Confirmed — {formatted_date}"
    else:
        subject = f"We Received Your Demo Request — {booking.company_name}"

    if has_schedule and formatted_date:
        prospect_html = f"""
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f6f6f6; padding: 40px 20px;">
            <div style="max-width: 520px; margin: 0 auto;">
                <div style="text-align: center; padding-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #0d9488; letter-spacing: -0.5px;">PalmCare AI</h1>
                </div>
                <div style="background: #ffffff; border-radius: 8px; padding: 40px 40px 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #333333; line-height: 1.5;">Hi {booking.name},</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #333333; line-height: 1.5;">Your demo with PalmCare AI has been confirmed:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0; width: 140px;">Topic</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">PalmCare AI Demo — {booking.company_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Date</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{formatted_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Time</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{formatted_time} Eastern Time (US and Canada)</td>
                        </tr>
                        {f'<tr><td style="padding: 10px 0; font-size: 14px; color: #747487;">Meeting Link</td><td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600;"><a href="{meeting_link}" style="color: #0d9488; text-decoration: none;">{meeting_link}</a></td></tr>' if meeting_link else ''}
                    </table>
                    <div style="text-align: center; margin: 30px 0 20px;">
                        <a href="{meeting_link or 'https://palmcareai.com'}" style="background-color: #0d9488; color: #ffffff; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Join Demo</a>
                    </div>
                    <p style="margin: 24px 0 0 0; font-size: 14px; color: #747487; line-height: 1.5;">Thank you for choosing PalmCare AI.<br>-The PalmCare Team</p>
                </div>
                <div style="text-align: center; padding-top: 24px;">
                    <p style="margin: 0; font-size: 12px; color: #aaaaaa;">Copyright &copy; 2026 Palm Technologies, INC. All rights reserved.</p>
                </div>
            </div>
        </div>
        """
    else:
        prospect_html = f"""
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f6f6f6; padding: 40px 20px;">
            <div style="max-width: 520px; margin: 0 auto;">
                <div style="text-align: center; padding-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #0d9488; letter-spacing: -0.5px;">PalmCare AI</h1>
                </div>
                <div style="background: #ffffff; border-radius: 8px; padding: 40px 40px 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #333333; line-height: 1.5;">Hi {booking.name},</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #333333; line-height: 1.5;">We&rsquo;ve received your demo request for <strong>{booking.company_name}</strong>. Our team will reach out within 1 business day to schedule your personalized demo.</p>
                    <p style="margin: 0 0 0 0; font-size: 14px; color: #747487; line-height: 1.5;">Thank you for choosing PalmCare AI.<br>-The PalmCare Team</p>
                </div>
                <div style="text-align: center; padding-top: 24px;">
                    <p style="margin: 0; font-size: 12px; color: #aaaaaa;">Copyright &copy; 2026 Palm Technologies, INC. All rights reserved.</p>
                </div>
            </div>
        </div>
        """

    prospect_result = email_svc.send_email(
        to=booking.email,
        subject=subject,
        sender=verified_sender,
        reply_to="sales@palmtai.com",
        html=prospect_html,
    )
    if not prospect_result.get("success"):
        logger.error(f"Failed to send demo confirmation to {booking.email}: {prospect_result.get('error')}")

    # Admin notification to sales, business, and personal email
    admin_emails = [
        os.getenv("ADMIN_NOTIFICATION_EMAIL", "sales@palmtai.com"),
        "museibrahim@palmtai.com",
        "musajama89@gmail.com",
    ]
    admin_subject = f"{'Demo Booked' if has_schedule else 'New Demo Request'}: {booking.company_name} — {booking.name}"
    admin_html = f"""
        <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f6f6f6; padding: 40px 20px;">
            <div style="max-width: 520px; margin: 0 auto;">
                <div style="text-align: center; padding-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #0d9488; letter-spacing: -0.5px;">PalmCare AI</h1>
                </div>
                <div style="background: #ffffff; border-radius: 8px; padding: 40px 40px 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #333333; line-height: 1.5;">Hi Muse,</p>
                    <p style="margin: 0 0 28px 0; font-size: 15px; color: #333333; line-height: 1.5;">{booking.name} from <strong>{booking.company_name}</strong> has {'booked a demo' if has_schedule else 'requested a demo'}:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0; width: 140px;">Name</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Email</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;"><a href="mailto:{booking.email}" style="color: #0d9488; text-decoration: none;">{booking.email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Company</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.company_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Phone</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.phone or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">State</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.state or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Services</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{services_list}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Clients</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.estimated_clients or 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Heard About Us</td>
                            <td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">{booking.referral_source or 'N/A'}</td>
                        </tr>
                        {'<tr><td style="padding: 10px 0; font-size: 14px; color: #747487; border-bottom: 1px solid #ededf0;">Date</td><td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600; border-bottom: 1px solid #ededf0;">' + (formatted_date or '') + ' at ' + (formatted_time or '') + ' ET</td></tr>' if has_schedule else ''}
                        {'<tr><td style="padding: 10px 0; font-size: 14px; color: #747487;">Meet Link</td><td style="padding: 10px 0; font-size: 14px; color: #232333; font-weight: 600;"><a href="' + (meeting_link or '') + '" style="color: #0d9488; text-decoration: none;">' + (meeting_link or '') + '</a></td></tr>' if meeting_link else ''}
                    </table>
                    {f'<div style="text-align: center; margin: 20px 0;"><a href="{meeting_link}" style="background-color: #0d9488; color: #ffffff; padding: 14px 48px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Start Meeting</a></div>' if meeting_link else '<p style="font-size: 14px; color: #e65100; font-weight: 600;">Action needed: Reach out to schedule this demo.</p>'}
                </div>
                <div style="text-align: center; padding-top: 24px;">
                    <p style="margin: 0; font-size: 12px; color: #aaaaaa;">Copyright &copy; 2026 Palm Technologies, INC. All rights reserved.</p>
                </div>
            </div>
        </div>
        """
    for ae in admin_emails:
        result = email_svc.send_email(
            to=ae, subject=admin_subject, sender=verified_sender, html=admin_html,
        )
        if not result.get("success"):
            logger.error(f"Failed to send admin demo notification to {ae}: {result.get('error')}")

    if has_schedule:
        return DemoBookingResponse(
            success=True, meeting_link=meeting_link,
            date=formatted_date, time=formatted_time,
            message="Demo booked! Check your email for confirmation.",
        )
    else:
        return DemoBookingResponse(
            success=True,
            message="Demo request received! Our team will reach out within 1 business day to schedule your demo.",
        )
