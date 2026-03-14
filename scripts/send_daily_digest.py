#!/usr/bin/env python3
"""
Send today's daily task digest email directly via Resend.

Queries the production API for today's outreach plan data,
builds a professional HTML digest, and sends to the CEO.

Can be run as a cron job: `0 8 * * 1-5 python3 scripts/send_daily_digest.py`
"""
import os
import sys
import json
import requests
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
CEO_EMAIL = "musajama89@gmail.com"
CEO_WORK_EMAIL = "museibrahim@palmtai.com"
API_BASE = "https://api-production-a0a2.up.railway.app"

EMAILS_PER_DAY = 50
INVESTORS_PER_DAY = 10
CALLS_PER_DAY = 10
FULL_WORK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
LAUNCH_DATE = date(2026, 3, 10)


def _week_work_days(week_offset: int) -> list:
    today = datetime.now(timezone.utc).date()
    days_since_monday = today.weekday()
    this_monday = today - timedelta(days=days_since_monday)
    target_monday = this_monday + timedelta(weeks=week_offset)

    if week_offset == 0 and target_monday <= LAUNCH_DATE:
        return [
            (FULL_WORK_DAYS[i], target_monday + timedelta(days=i))
            for i in range(5)
            if (target_monday + timedelta(days=i)) >= LAUNCH_DATE
        ]
    return [(FULL_WORK_DAYS[i], target_monday + timedelta(days=i)) for i in range(5)]


def _cumulative_days_before(week_offset: int) -> int:
    total = 0
    for w in range(week_offset):
        total += len(_week_work_days(w))
    return total


def get_today_index():
    today = datetime.now(timezone.utc).date()
    work_days = _week_work_days(0)
    global_offset = _cumulative_days_before(0)
    for i, (day_name, day_date) in enumerate(work_days):
        if day_date == today:
            return global_offset + i, day_name, today
    return None, today.strftime("%A"), today


CRON_SECRET = os.getenv("CRON_SECRET", "")


def fetch_daily_data():
    """Fetch today's outreach data from the production cron endpoint."""
    r = requests.get(
        f"{API_BASE}/platform/outreach/cron/daily-data",
        params={"key": CRON_SECRET},
        timeout=30,
    )
    if r.status_code == 200:
        return r.json()
    print(f"Failed to fetch daily data: {r.status_code} — {r.text[:200]}")
    return None


def build_digest_html(today_data: dict, day_name: str, date_str: str):
    """Build the digest email HTML from plan data."""
    calls = today_data.get("calls", [])
    agencies = today_data.get("agency_drafts", [])
    investors = today_data.get("investor_drafts", [])

    day_full = {
        "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday",
        "Thu": "Thursday", "Fri": "Friday",
    }.get(day_name, day_name)

    call_rows = ""
    for i, lead in enumerate(calls, 1):
        city_state = f"{lead.get('city', '—')}, {lead.get('state', '—')}"
        priority = lead.get("priority", "medium")
        priority_color = "#dc2626" if priority == "high" else "#f59e0b" if priority == "medium" else "#6b7280"
        priority_badge = f'<span style="background:{priority_color};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">{priority.upper()}</span>'
        phone = lead.get("phone", "—")

        call_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:14px 12px;font-size:14px;color:#64748b;font-weight:600;">{i}</td>
            <td style="padding:14px 12px;">
                <div style="font-size:14px;font-weight:600;color:#1e293b;">{lead.get('provider_name', '—')}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">{city_state}</div>
            </td>
            <td style="padding:14px 12px;">
                <a href="tel:{phone}" style="font-size:14px;color:#0d9488;font-weight:600;text-decoration:none;">{phone}</a>
            </td>
            <td style="padding:14px 12px;text-align:center;">{priority_badge}</td>
        </tr>"""

    agency_rows = ""
    for i, lead in enumerate(agencies[:10], 1):
        city_state = f"{lead.get('city', '—')}, {lead.get('state', '—')}"
        agency_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1e293b;">{lead.get('provider_name', '—')}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{city_state}</td>
            <td style="padding:10px 12px;font-size:13px;color:#0d9488;">{lead.get('contact_email', '—')}</td>
        </tr>"""

    investor_rows = ""
    for i, inv in enumerate(investors, 1):
        investor_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#1e293b;">{inv.get('fund_name', '—')}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.get('contact_name', '—')}</td>
            <td style="padding:10px 12px;font-size:13px;color:#64748b;">{inv.get('location', '—')}</td>
            <td style="padding:10px 12px;font-size:12px;color:#64748b;">{inv.get('check_size_display', '—')}</td>
        </tr>"""

    remaining_agencies = max(0, len(agencies) - 10)
    agency_note = f"<p style='font-size:12px;color:#94a3b8;margin:8px 0 0 12px;'>+ {remaining_agencies} more queued for email today</p>" if remaining_agencies else ""

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
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">{date_str} &middot; PalmCare AI Outreach</p>
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
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Agencies without email — call to pitch PalmCare AI</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>#</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Phone</th><th style='padding:10px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Priority</th></tr>" + call_rows + "</table>" if calls else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No calls scheduled for today</div>"}
</td></tr>

<!-- Agency Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">📧 Agency Emails ({len(agencies)} queued)</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Approve in Command Center to send</p>

    {"<table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;'><tr style='background:#f8fafc;'><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Agency</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Location</th><th style='padding:10px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;'>Email</th></tr>" + agency_rows + "</table>" + agency_note if agencies else "<div style='text-align:center;padding:24px;background:#f8fafc;border-radius:12px;color:#94a3b8;font-size:14px;'>No agency emails for today</div>"}
</td></tr>

<!-- Investor Emails Section -->
<tr><td style="background:#fff;padding:8px 32px 24px;">
    <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1e293b;">💼 Investor Outreach ({len(investors)} queued)</h2>
    <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">Fundraising emails — approve in Command Center</p>

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
    <p style="margin:0;font-size:12px;color:#94a3b8;">🌴 PalmCare AI &middot; Daily Outreach Digest</p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;">Palm Technologies, INC. &middot; Where care meets intelligence</p>
</td></tr>

</table>
</td></tr>
</table>

</body>
</html>"""
    return html, day_full


def send_via_resend(subject: str, html: str):
    """Send email directly via Resend API."""
    if not RESEND_API_KEY:
        print("ERROR: RESEND_API_KEY not set")
        return False

    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": "PalmCare AI <onboarding@resend.dev>",
            "to": [CEO_WORK_EMAIL],
            "subject": subject,
            "html": html,
            "reply_to": "sales@palmtai.com",
        },
        timeout=15,
    )

    if r.status_code in (200, 201):
        email_id = r.json().get("id", "unknown")
        print(f"Email sent successfully (ID: {email_id})")
        return True
    else:
        print(f"Failed to send: {r.status_code} — {r.text[:300]}")
        return False


def main():
    print("=" * 60)
    print("🌴 PalmCare AI — Daily Task Digest")
    print("=" * 60)

    today = datetime.now(timezone.utc).date()
    print(f"\nDate: {today.isoformat()}")
    print(f"Day: {today.strftime('%A')}")

    print("\nFetching today's outreach data from production...")
    raw_data = fetch_daily_data()

    if raw_data:
        day_name = raw_data.get("day_name", today.strftime("%a")[:3])
        date_str = raw_data.get("date", today.isoformat())

        today_data = {
            "calls": raw_data.get("calls", []),
            "agency_drafts": raw_data.get("agencies", []),
            "investor_drafts": raw_data.get("investors", []),
        }
        agency_count = raw_data.get("agency_count", len(today_data["agency_drafts"]))
        print(f"Found data for {day_name}, {date_str}")
    else:
        global_idx, day_name, today_date = get_today_index()
        if global_idx is None:
            print("Today is not a work day. No digest to send.")
            return
        date_str = today_date.isoformat()
        today_data = {"calls": [], "agency_drafts": [], "investor_drafts": []}
        agency_count = 0

    calls = today_data.get("calls", [])
    agencies = today_data.get("agency_drafts", [])
    investors = today_data.get("investor_drafts", [])

    print(f"\n📞 Calls: {len(calls)}")
    print(f"📧 Agency Emails: {agency_count} total ({len(agencies)} shown)")
    print(f"💼 Investor Emails: {len(investors)}")

    if calls:
        print("\n--- CALLS TO MAKE ---")
        for i, c in enumerate(calls, 1):
            print(f"  {i}. {c.get('provider_name', '?')} — {c.get('phone', '?')} ({c.get('city', '?')}, {c.get('state', '?')})")

    if investors:
        print("\n--- INVESTORS TO EMAIL ---")
        for i, inv in enumerate(investors, 1):
            print(f"  {i}. {inv.get('fund_name', '?')} — {inv.get('contact_name', '?')} ({inv.get('location', '?')})")

    print("\nBuilding HTML email...")
    html, day_full = build_digest_html(today_data, day_name, date_str)
    subject = f"🌴 {day_full} Task List — {len(calls)} Calls, {agency_count} Emails, {len(investors)} Investors"

    print(f"Subject: {subject}")
    print(f"To: {CEO_WORK_EMAIL}")

    print("\nSending via Resend...")
    success = send_via_resend(subject, html)

    if success:
        print("\n✅ Daily digest sent successfully!")
    else:
        print("\n❌ Failed to send daily digest")
        sys.exit(1)


if __name__ == "__main__":
    main()
