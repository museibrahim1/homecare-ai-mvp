import logging
import os
import uuid as _uuid
from datetime import date, datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, case, and_, or_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_permission
from app.models.user import User
from app.models.sales_lead import SalesLead
from app.models.investor import Investor
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

from .common import (
    _drafts,
    EXCLUDED_LEAD_STATUSES, EXCLUDED_CALL_STATUSES, EXCLUDED_INVESTOR_STATUSES,
    PRIORITY_ORDER, INVESTOR_PRIORITY_ORDER, TZ_ORDER,
    BUSINESS_TZ, EMAILS_PER_DAY, INVESTORS_PER_DAY, CALLS_PER_DAY,
    FULL_WORK_DAYS, LAUNCH_DATE,
    EASTERN_STATES, CENTRAL_STATES, MOUNTAIN_STATES, PACIFIC_STATES,
    AGENCY_SUBJECT_HOOKS, AGENCY_TEMPLATES, AGENCY_FOOTER, SITE_URL, IMG, PITCH_DECK_URL,
    _now_eastern, _today_eastern, _today_start, _week_bounds,
    _build_agency_html, _build_investor_text,
    _week_work_days, _cumulative_days_before,
)
from .schemas import (
    AgencyEmailItem, AgencyCallItem, InvestorEmailItem, OutreachStats,
    WeekDayProgress, DailyPlanResponse, MarkCalledBody, GenerateDraftBody,
    DraftResponse, ApproveDraftBody, WeeklySummaryResponse,
    AgencyDraftItem, InvestorDraftItem, WeeklyDayPlan, WeeklyPlanResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def get_weekly_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    week_start, week_end = _week_bounds()

    emails_sent = db.query(func.count(SalesLead.id)).filter(
        SalesLead.last_email_sent_at >= week_start,
        SalesLead.last_email_sent_at <= week_end,
    ).scalar() or 0

    calls_made = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_contacted == True,  # noqa: E712
        SalesLead.called_at >= week_start,
        SalesLead.called_at <= week_end,
    ).scalar() or 0

    investor_emails_sent = db.query(func.count(Investor.id)).filter(
        Investor.last_email_sent_at >= week_start,
        Investor.last_email_sent_at <= week_end,
    ).scalar() or 0

    conversions = db.query(func.count(SalesLead.id)).filter(
        SalesLead.is_converted == True,  # noqa: E712
        SalesLead.converted_at >= week_start,
        SalesLead.converted_at <= week_end,
    ).scalar() or 0

    return WeeklySummaryResponse(
        emails_sent=emails_sent,
        calls_made=calls_made,
        investor_emails_sent=investor_emails_sent,
        conversions=conversions,
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=week_end.strftime("%Y-%m-%d"),
    )


# ─── Daily Digest Email ───

CEO_EMAILS = ["museibrahim@palmtai.com"]


def _get_todays_plan_data(db: Session) -> dict:
    """Extract today's calls, emails, and investor emails.
    Uses timestamp-based queries for accurate data."""
    today = _today_eastern()
    work_days = _week_work_days(0)

    today_idx = None
    for i, (day_name, day_date) in enumerate(work_days):
        if day_date == today:
            today_idx = i
            break

    if today_idx is None:
        return {"calls": [], "agencies": [], "investors": [], "day_name": today.strftime("%A"), "date": today.isoformat()}

    day_start_utc = datetime.combine(today, datetime.min.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
    day_end_utc = datetime.combine(today, datetime.max.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)

    today_calls = (
        db.query(SalesLead)
        .filter(
            SalesLead.is_contacted == True,  # noqa: E712
            SalesLead.called_at >= day_start_utc,
            SalesLead.called_at <= day_end_utc,
        )
        .order_by(SalesLead.called_at)
        .all()
    )
    uncalled = (
        db.query(SalesLead)
        .filter(
            SalesLead.phone.isnot(None), SalesLead.phone != "",
            SalesLead.is_contacted != True,  # noqa: E712
            SalesLead.status.notin_(EXCLUDED_CALL_STATUSES),
        )
        .order_by(PRIORITY_ORDER, TZ_ORDER, SalesLead.created_at)
        .limit(max(CALLS_PER_DAY - len(today_calls), 0))
        .all()
    )
    day_calls = list(today_calls) + list(uncalled)

    sent_today_agencies = (
        db.query(SalesLead)
        .filter(
            SalesLead.last_email_sent_at >= day_start_utc,
            SalesLead.last_email_sent_at <= day_end_utc,
            SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
        )
        .order_by(SalesLead.last_email_sent_at)
        .all()
    )
    fill_a = max(EMAILS_PER_DAY - len(sent_today_agencies), 0)
    unsent_agencies = (
        db.query(SalesLead)
        .filter(
            SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
            SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
            (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
        )
        .order_by(PRIORITY_ORDER, SalesLead.created_at)
        .limit(fill_a)
        .all()
    )
    day_agencies = list(sent_today_agencies) + list(unsent_agencies)

    sent_today_investors = (
        db.query(Investor)
        .filter(
            Investor.last_email_sent_at >= day_start_utc,
            Investor.last_email_sent_at <= day_end_utc,
            Investor.contact_email.isnot(None), Investor.contact_email != "",
        )
        .order_by(Investor.last_email_sent_at)
        .all()
    )
    fill_i = max(INVESTORS_PER_DAY - len(sent_today_investors), 0)
    unsent_investors = (
        db.query(Investor)
        .filter(
            Investor.contact_email.isnot(None), Investor.contact_email != "",
            Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
            (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
        )
        .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
        .limit(fill_i)
        .all()
    )
    day_investors = list(sent_today_investors) + list(unsent_investors)

    return {
        "calls": day_calls,
        "agencies": day_agencies,
        "investors": day_investors,
        "day_name": work_days[today_idx][0],
        "date": today.isoformat(),
    }


def _build_daily_digest_html(data: dict) -> str:
    """Build a clean, professional daily digest email."""
    day_name = data["day_name"]
    date_str = data["date"]
    calls = data["calls"]
    agencies = data["agencies"]
    investors = data["investors"]

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(day_name, day_name)

    call_rows = ""
    for i, lead in enumerate(calls, 1):
        services = []
        if lead.offers_nursing:
            services.append("Nursing")
        if lead.offers_pt:
            services.append("PT")
        if lead.offers_ot:
            services.append("OT")
        if lead.offers_speech:
            services.append("Speech")
        if lead.offers_aide:
            services.append("Aide")
        if lead.offers_social:
            services.append("Social Work")
        svc_str = ", ".join(services) if services else "Home Care"

        ownership = lead.ownership_type or "N/A"
        years = f"{lead.years_in_operation:.0f} yrs" if lead.years_in_operation else "N/A"
        star = lead.star_rating or "N/A"
        city_state = f"{lead.city or '—'}, {lead.state or '—'}"
        priority_color = "#dc2626" if lead.priority == "high" else "#f59e0b" if lead.priority == "medium" else "#6b7280"
        priority_badge = f'<span style="background:{priority_color};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">{lead.priority.upper()}</span>'

        call_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 12px;font-size:14px;color:#64748b;font-weight:600;">{i}</td>
            <td style="padding:14px 12px;">
                <div style="font-size:14px;font-weight:600;color:#1e293b;">{lead.provider_name}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">{city_state}</div>
            </td>
            <td style="padding:14px 12px;">
                <a href="tel:{lead.phone}" style="font-size:14px;color:#0d9488;font-weight:600;text-decoration:none;">{lead.phone}</a>
            </td>
            <td style="padding:14px 12px;font-size:12px;color:#475569;">{svc_str}</td>
            <td style="padding:14px 12px;font-size:12px;color:#475569;">{ownership}<br/>{years} · ★ {star}</td>
            <td style="padding:14px 12px;text-align:center;">{priority_badge}</td>
        </tr>"""

    agency_email_rows = ""
    for i, lead in enumerate(agencies[:10], 1):
        city_state = f"{lead.city or '—'}, {lead.state or '—'}"
        agency_email_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;color:#1e293b;">{lead.provider_name}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{city_state}</td>
            <td style="padding:10px 12px;font-size:13px;color:#0d9488;">{lead.contact_email or '—'}</td>
        </tr>"""

    investor_rows = ""
    for i, inv in enumerate(investors, 1):
        sectors = ", ".join(inv.focus_sectors or [])[:40]
        investor_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1e293b;">{inv.fund_name}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.contact_name or '—'}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.location or '—'}</td>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">{inv.check_size_display or '—'}</td>
        </tr>"""

    remaining_agencies = max(0, len(agencies) - 10)
    agency_note = f"<p style='font-size:12px;color:#94a3b8;margin:8px 0 0 12px;'>+ {remaining_agencies} more queued for email today</p>" if remaining_agencies > 0 else ""

    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
<tr><td align="center" style="padding:24px 16px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);border-radius:16px 16px 0 0;padding:32px 32px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td><span style="font-size:28px;">🌴</span></td>
        <td style="text-align:right;">
            <span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;">{day_full}</span>
        </td>
    </tr>
    <tr><td colspan="2" style="padding-top:16px;">
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;">Daily Task Digest</h1>
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">{date_str} · PalmCare AI Outreach</p>
    </td></tr>
    </table>
</td></tr>

<!-- Summary Cards -->
<tr><td style="background:#fff;padding:24px 32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#f0fdfa;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#0d9488;">{len(calls)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Calls to Make</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#eff6ff;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#2563eb;">{len(agencies)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Emails to Send</div>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#faf5ff;border-radius:12px;">
            <div style="font-size:28px;font-weight:700;color:#7c3aed;">{len(investors)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Investor Emails</div>
        </td>
    </tr>
    </table>
</td></tr>

<!-- Calls Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">📞 Phone Calls</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Agencies without email, call to pitch PalmCare AI</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>#</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Phone</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Services</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Details</th><th style='padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Priority</th></tr>" + call_rows + "</table>" if calls else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No calls scheduled for today</div>"}
</td></tr>

<!-- Agency Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">📧 Agency Emails</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Queued for outreach, approve in Command Center</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Location</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Email</th></tr>" + agency_email_rows + "</table>" + agency_note if agencies else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No agency emails for today</div>"}
</td></tr>

<!-- Investor Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">💼 Investor Outreach</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Fundraising emails queued, approve in Command Center</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Fund</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Contact</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Location</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Check Size</th></tr>" + investor_rows + "</table>" if investors else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No investor emails for today</div>"}
</td></tr>

<!-- CTA -->
<tr><td style="background:#fff;padding:8px 32px 32px;border-radius:0 0 16px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:center;padding:16px 0;">
        <a href="https://palmcareai.com/admin/command-center" style="display:inline-block;background:#0d9488;color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">Open Command Center →</a>
    </td></tr>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">🌴 PalmCare AI · Daily Outreach Digest</p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Palm Technologies, INC. · Where care meets intelligence</p>
</td></tr>

</table>
</td></tr>
</table>

</body>
</html>"""
    return html


@router.post("/send-daily-digest")
def send_daily_digest(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Build and send today's daily task digest email to the CEO."""
    data = _get_todays_plan_data(db)
    html = _build_daily_digest_html(data)

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(data["day_name"], data["day_name"])

    subject = f"🌴 {day_full} Task List: {len(data['calls'])} Calls, {len(data['agencies'])} Emails, {len(data['investors'])} Investors"

    result = email_service.send_email(
        to=CEO_EMAILS,
        subject=subject,
        html=html,
        sender="PalmCare AI <sales@palmcareai.com>",
        reply_to="sales@palmcareai.com",
    )

    return {
        "ok": result.get("success", False),
        "subject": subject,
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "date": data["date"],
        "send_result": result,
    }


@router.get("/daily-digest-preview")
def daily_digest_preview(
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("command_center")),
):
    """Preview today's daily digest without sending."""
    data = _get_todays_plan_data(db)
    return {
        "date": data["date"],
        "day_name": data["day_name"],
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "call_details": [
            {
                "provider_name": c.provider_name,
                "phone": c.phone,
                "city": c.city,
                "state": c.state,
                "priority": c.priority,
                "ownership_type": c.ownership_type,
                "services": [
                    s for s, has in [
                        ("Nursing", c.offers_nursing), ("PT", c.offers_pt),
                        ("OT", c.offers_ot), ("Speech", c.offers_speech),
                        ("Aide", c.offers_aide), ("Social Work", c.offers_social),
                    ] if has
                ],
            }
            for c in data["calls"]
        ],
        "investor_details": [
            {
                "fund_name": inv.fund_name,
                "contact_name": inv.contact_name,
                "contact_email": inv.contact_email,
                "location": inv.location,
                "check_size": inv.check_size_display,
                "relevance": inv.relevance_reason,
            }
            for inv in data["investors"]
        ],
    }


@router.get("/cron/daily-data")
def cron_daily_data(
    request: Request,
    db: Session = Depends(get_db),
    day_index: Optional[int] = None,
):
    """Return outreach data for a specific day. day_index=0 is first work day of week."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    if day_index is not None:
        work_days = _week_work_days(0)
        if day_index < 0 or day_index >= len(work_days):
            raise HTTPException(status_code=400, detail="Invalid day_index")
        day_name, day_date = work_days[day_index]
        today = _today_eastern()

        day_start_utc = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)
        day_end_utc = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=BUSINESS_TZ).astimezone(timezone.utc)

        if day_date < today:
            day_agencies = (
                db.query(SalesLead)
                .filter(
                    SalesLead.last_email_sent_at >= day_start_utc,
                    SalesLead.last_email_sent_at <= day_end_utc,
                    SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                )
                .order_by(SalesLead.last_email_sent_at)
                .all()
            )
            day_investors = (
                db.query(Investor)
                .filter(
                    Investor.last_email_sent_at >= day_start_utc,
                    Investor.last_email_sent_at <= day_end_utc,
                    Investor.contact_email.isnot(None), Investor.contact_email != "",
                )
                .order_by(Investor.last_email_sent_at)
                .all()
            )
            day_calls = (
                db.query(SalesLead)
                .filter(
                    SalesLead.is_contacted == True,  # noqa: E712
                    SalesLead.called_at >= day_start_utc,
                    SalesLead.called_at <= day_end_utc,
                )
                .order_by(SalesLead.called_at)
                .all()
            )
        else:
            day_agencies = (
                db.query(SalesLead)
                .filter(
                    SalesLead.contact_email.isnot(None), SalesLead.contact_email != "",
                    SalesLead.status.notin_(EXCLUDED_LEAD_STATUSES),
                    (SalesLead.email_send_count == 0) | (SalesLead.email_send_count.is_(None)),
                )
                .order_by(PRIORITY_ORDER, SalesLead.created_at)
                .limit(EMAILS_PER_DAY)
                .all()
            )
            day_investors = (
                db.query(Investor)
                .filter(
                    Investor.contact_email.isnot(None), Investor.contact_email != "",
                    Investor.status.notin_(EXCLUDED_INVESTOR_STATUSES),
                    (Investor.email_send_count == 0) | (Investor.email_send_count.is_(None)),
                )
                .order_by(INVESTOR_PRIORITY_ORDER, Investor.created_at)
                .limit(INVESTORS_PER_DAY)
                .all()
            )
            day_calls = []

        data = {"calls": day_calls, "agencies": day_agencies, "investors": day_investors,
                "day_name": day_name, "date": day_date.isoformat()}
    else:
        data = _get_todays_plan_data(db)
    calls = data["calls"]
    agencies = data["agencies"]
    investors = data["investors"]

    return {
        "date": data["date"],
        "day_name": data["day_name"],
        "calls": [
            {
                "provider_name": c.provider_name,
                "phone": c.phone,
                "city": c.city,
                "state": c.state,
                "address": c.address,
                "zip_code": c.zip_code,
                "priority": c.priority,
                "ownership_type": c.ownership_type,
                "years_in_operation": c.years_in_operation,
                "star_rating": c.star_rating,
                "offers_nursing": c.offers_nursing,
                "offers_pt": c.offers_pt,
                "offers_ot": c.offers_ot,
                "offers_speech": c.offers_speech,
                "offers_aide": c.offers_aide,
                "offers_social": c.offers_social,
                "status": c.status,
                "is_contacted": c.is_contacted,
            }
            for c in calls
        ],
        "agencies": [
            {
                "id": str(a.id),
                "provider_name": a.provider_name,
                "city": a.city,
                "state": a.state,
                "contact_email": a.contact_email,
                "contact_name": a.contact_name,
                "priority": a.priority,
                "status": a.status,
                "email_send_count": a.email_send_count or 0,
                "last_email_sent_at": a.last_email_sent_at.isoformat() if a.last_email_sent_at else None,
            }
            for a in agencies
        ],
        "agency_count": len(agencies),
        "investors": [
            {
                "id": str(inv.id),
                "fund_name": inv.fund_name,
                "contact_name": inv.contact_name,
                "contact_email": inv.contact_email,
                "location": inv.location,
                "check_size_display": inv.check_size_display,
                "focus_sectors": inv.focus_sectors or [],
                "relevance_reason": inv.relevance_reason,
                "status": inv.status,
                "email_send_count": inv.email_send_count or 0,
            }
            for inv in investors
        ],
    }


@router.post("/cron/mark-emails-sent")
def cron_mark_emails_sent(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
):
    """Mark or unmark agency/investor leads as email_sent by ID list."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    now = datetime.now(timezone.utc)
    action = body.get("action", "mark")
    lead_ids = body.get("lead_ids", [])
    investor_ids = body.get("investor_ids", [])
    investor_emails = body.get("investor_emails", [])
    lead_emails = body.get("lead_emails", [])
    updated = 0

    for email in lead_emails:
        lead = db.query(SalesLead).filter(SalesLead.contact_email == email).first()
        if lead:
            lead_ids.append(str(lead.id))

    for email in investor_emails:
        inv = db.query(Investor).filter(Investor.contact_email == email).first()
        if inv:
            investor_ids.append(str(inv.id))

    if action == "unmark":
        for lid in lead_ids:
            lead = db.query(SalesLead).filter(SalesLead.id == lid).first()
            if lead and lead.status == "email_sent":
                lead.status = "new"
                lead.last_email_sent_at = None
                lead.email_send_count = max((lead.email_send_count or 1) - 1, 0)
                updated += 1
        for iid in investor_ids:
            inv = db.query(Investor).filter(Investor.id == iid).first()
            if inv and inv.status == "email_sent":
                inv.status = "new"
                inv.last_email_sent_at = None
                inv.email_send_count = max((inv.email_send_count or 1) - 1, 0)
                updated += 1
    else:
        for lid in lead_ids:
            lead = db.query(SalesLead).filter(SalesLead.id == lid).first()
            if lead and lead.status != "email_sent":
                lead.status = "email_sent"
                lead.last_email_sent_at = now
                lead.email_send_count = (lead.email_send_count or 0) + 1
                lead.updated_at = now
                updated += 1
        for iid in investor_ids:
            inv = db.query(Investor).filter(Investor.id == iid).first()
            if inv and inv.status != "email_sent":
                inv.status = "email_sent"
                inv.last_email_sent_at = now
                inv.email_send_count = (inv.email_send_count or 0) + 1
                inv.updated_at = now
                updated += 1
    db.commit()
    return {"ok": True, "updated": updated}


@router.post("/cron/mark-bounced")
def cron_mark_bounced(
    request: Request,
    body: dict,
    db: Session = Depends(get_db),
):
    """Mark leads/investors with bounced emails as 'email_bounced' so they stop getting retried."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    bounced_emails = [e.strip().lower() for e in body.get("emails", []) if e.strip()]
    now = datetime.now(timezone.utc)
    updated_leads = 0
    updated_investors = 0

    for email in bounced_emails:
        lead = db.query(SalesLead).filter(func.lower(SalesLead.contact_email) == email).first()
        if lead and lead.status != "email_bounced":
            lead.status = "email_bounced"
            lead.updated_at = now
            activity = list(lead.activity_log or [])
            activity.append({"action": "email_bounced", "timestamp": now.isoformat()})
            lead.activity_log = activity
            updated_leads += 1

        inv = db.query(Investor).filter(func.lower(Investor.contact_email) == email).first()
        if inv and inv.status != "email_bounced":
            inv.status = "email_bounced"
            inv.updated_at = now
            activity = list(inv.activity_log or [])
            activity.append({"action": "email_bounced", "timestamp": now.isoformat()})
            inv.activity_log = activity
            updated_investors += 1

    db.commit()
    return {
        "ok": True,
        "updated_leads": updated_leads,
        "updated_investors": updated_investors,
        "total_processed": len(bounced_emails),
    }


@router.post("/cron/daily-digest")
def cron_daily_digest(
    request: Request,
    db: Session = Depends(get_db),
):
    """Cron-accessible daily digest. Requires X-Internal-Key header or CRON_SECRET query param."""
    from app.core.internal_auth import require_internal_key
    require_internal_key(request)

    data = _get_todays_plan_data(db)

    if not data["calls"] and not data["agencies"] and not data["investors"]:
        return {"ok": True, "skipped": True, "reason": "No tasks for today (weekend or no data)"}

    html = _build_daily_digest_html(data)

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(data["day_name"], data["day_name"])

    subject = f"🌴 {day_full} Task List: {len(data['calls'])} Calls, {len(data['agencies'])} Emails, {len(data['investors'])} Investors"

    result = email_service.send_email(
        to=CEO_EMAILS,
        subject=subject,
        html=html,
        sender="PalmCare AI <sales@palmcareai.com>",
        reply_to="sales@palmcareai.com",
    )

    return {
        "ok": result.get("success", False),
        "subject": subject,
        "calls": len(data["calls"]),
        "agency_emails": len(data["agencies"]),
        "investor_emails": len(data["investors"]),
        "date": data["date"],
    }


# ─── Admin Data Correction ───


