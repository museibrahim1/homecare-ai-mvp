#!/usr/bin/env python3
"""Daily signup + web traffic digest for Muse.

Queries production /platform/outreach/cron/signup-stats (US Eastern day)
and emails a short summary. Runs from GitHub Actions (see
.github/workflows/daily-signup-digest.yml).

Usage:
  python3 scripts/email/send_daily_signup_digest.py           # dry run
  python3 scripts/email/send_daily_signup_digest.py --send
  python3 scripts/email/send_daily_signup_digest.py --send --day 2026-08-24
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from datetime import date
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
try:
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

API_BASE = os.getenv("PALM_API_BASE", "https://api-production-a0a2.up.railway.app")
CRON_SECRET = os.getenv("CRON_SECRET", "") or os.getenv("INTERNAL_API_KEY", "")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
REPORT_TO = [
    e.strip()
    for e in os.getenv(
        "SIGNUP_DIGEST_TO",
        "museibrahim@palmtai.com,musajama89@gmail.com",
    ).split(",")
    if e.strip()
]
REPORT_FROM = "Muse Ibrahim <sales@send.palmtai.com>"


def fetch_stats(day: str | None) -> dict:
    url = f"{API_BASE}/platform/outreach/cron/signup-stats"
    if day:
        url += f"?day={day}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("X-Internal-Key", CRON_SECRET)
    req.add_header("User-Agent", "PalmSignupDigest/1.0")
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode())


def build_html(data: dict) -> str:
    report_date = data.get("report_date", "")
    signups = data.get("signups", [])
    count = data.get("signups_today", len(signups))
    web = data.get("web_traffic", {})
    by_day = data.get("signups_by_day", [])

    signup_rows = ""
    if signups:
        for s in signups:
            signup_rows += f"""
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 12px;font-size:14px;color:#1e293b;font-weight:600;">{s.get('agency_name', '—')}</td>
              <td style="padding:10px 12px;font-size:13px;color:#64748b;">{s.get('owner_email', '—')}</td>
              <td style="padding:10px 12px;font-size:13px;color:#64748b;">{s.get('state', '—')}</td>
            </tr>"""
    else:
        signup_rows = """
            <tr><td colspan="3" style="padding:16px 12px;font-size:14px;color:#64748b;text-align:center;">
              No new agency signups on this date.
            </td></tr>"""

    trend_rows = ""
    for row in by_day:
        trend_rows += f"""
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 12px;font-size:13px;color:#64748b;">{row.get('date', '')}</td>
          <td style="padding:8px 12px;font-size:13px;color:#1e293b;font-weight:600;text-align:right;">{row.get('count', 0)}</td>
        </tr>"""

    return f"""
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 12px;">
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
    <h1 style="font-size:20px;color:#0f172a;margin:0 0 6px;">PALM daily signup report</h1>
    <p style="font-size:14px;color:#64748b;margin:0 0 24px;">{report_date} (US Eastern)</p>

    <p style="font-size:16px;color:#0f172a;margin:0 0 8px;">
      <strong>{count}</strong> new agency signup{'s' if count != 1 else ''}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;border-collapse:collapse;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Agency</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">Owner email</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;">State</th>
        </tr>
      </thead>
      <tbody>{signup_rows}</tbody>
    </table>

    <h2 style="font-size:15px;color:#0f172a;margin:0 0 12px;">Web traffic (site_events)</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Page views</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">{web.get('page_views', 0)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Unique sessions</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">{web.get('unique_sessions', 0)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">/register page views</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">{web.get('register_page_views', 0)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Registration completions (funnel step 4+)</td>
          <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">{web.get('registration_completions', 0)}</td></tr>
    </table>

    <h2 style="font-size:15px;color:#0f172a;margin:0 0 12px;">Signups last 7 days</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tbody>{trend_rows}</tbody>
    </table>
  </div>
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0;">Palm Technologies · palmcareai.com</p>
</div>
</body>
</html>"""


def send_email(subject: str, html: str) -> str:
    payload = json.dumps(
        {
            "from": REPORT_FROM,
            "to": REPORT_TO,
            "reply_to": "museibrahim@palmtai.com",
            "subject": subject,
            "html": html,
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
            return str(body.get("id", ""))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        raise RuntimeError(f"Resend HTTP {exc.code}: {detail}") from exc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--send", action="store_true", help="Send email (default: dry run)")
    parser.add_argument("--day", help="Report date YYYY-MM-DD (US Eastern)")
    args = parser.parse_args()

    if not CRON_SECRET:
        print("CRON_SECRET or INTERNAL_API_KEY missing in environment")
        return 1

    try:
        data = fetch_stats(args.day)
    except Exception as exc:
        print(f"Failed to fetch signup stats: {exc}")
        return 1

    count = data.get("signups_today", 0)
    report_date = data.get("report_date", args.day or str(date.today()))
    subject = f"PALM signups {report_date}: {count} new"
    html = build_html(data)

    print(f"Date: {report_date}")
    print(f"Signups: {count}")
    print(f"Web: {data.get('web_traffic', {})}")

    if not args.send:
        preview = PROJECT_ROOT / "marketing/email-preview-signup-digest.html"
        preview.write_text(html, encoding="utf-8")
        print(f"Dry run. Preview: {preview}")
        return 0

    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing")
        return 1

    email_id = send_email(subject, html)
    print(f"SENT to {', '.join(REPORT_TO)} id={email_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
