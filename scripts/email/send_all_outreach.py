#!/usr/bin/env python3
"""
Send all outreach emails for Tuesday + Wednesday via Resend API,
then mark them as sent in the CRM.
"""

import os, sys, time, json, hashlib, requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import resend
resend.api_key = os.getenv("RESEND_API_KEY", "").strip()

API_BASE = "https://api-production-a0a2.up.railway.app"
INTERNAL_KEY = os.getenv("CRON_SECRET", "")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib.utm import site, deck_link  # noqa: E402

SITE_URL = site("/", source="email", medium="email", campaign="agency_outreach", content="footer")
PITCH_DECK_URL = deck_link(source="email", medium="email", campaign="agency_outreach", content="deck")

AGENCY_SUBJECT_HOOKS = [
    "Don't type the assessment twice",
    "Same-day contracts for {state} agencies",
    "Get Tuesday nights back",
    "Try PALM on one visit",
    "Point your iPhone camera at this email",
    "Care plan, billables, and contract from one recording",
    "PALM is on the App Store",
    "Record once. Docs write themselves.",
]

APP_STORE = "https://palmcareai.com/app"
QR_APP = "https://palmcareai.com/marketing/social/palm-appstore-qr.png"

AGENCY_FOOTER = f"""
<p style="margin:18px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
  Muse Ibrahim · PalmCare AI · Omaha, NE ·
  <a href="{SITE_URL}" style="color:#94A3B8;">palmcareai.com</a>
</p>
"""


def _agency_template(city, state):
    note_state = state or "your state"
    templates = [
        lambda c, s: f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #e2e8f0;border-radius:20px;">
  <tr><td style="padding:28px 24px 8px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">PalmCare AI</p>
    <div style="width:36px;height:3px;border-radius:99px;background:#0d9488;margin:0 0 20px;"></div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:700;color:#0f172a;">Don't type it twice</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">Hi,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">Every assessment gets documented out loud, then again at a keyboard. PALM keeps the first one.</p>
  </td></tr>
  <tr><td align="center" style="padding:8px 24px 20px;">
    <a href="{APP_STORE}" style="display:inline-block;background:#0d9488;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">Download PALM for iPhone</a>
  </td></tr>
  <tr><td align="center" style="padding:0 24px 24px;">
    <img src="{QR_APP}" width="120" height="120" alt="Scan to download PALM" style="display:block;width:120px;height:120px;border-radius:12px;border:1px solid #e2e8f0;" />
    <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;">Scan with your iPhone camera</p>
  </td></tr>
</table>""",
        lambda c, s: f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #e2e8f0;border-radius:20px;">
  <tr><td style="padding:28px 24px 8px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">PalmCare AI</p>
    <div style="width:36px;height:3px;border-radius:99px;background:#0d9488;margin:0 0 20px;"></div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:700;color:#0f172a;">One visit. Docs ready.</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">Hi,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">For agencies in {c}, {s}: record the assessment. Review the care plan and contract before you leave.</p>
  </td></tr>
  <tr><td align="center" style="padding:8px 24px 20px;">
    <a href="{APP_STORE}" style="display:inline-block;background:#0d9488;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">Download PALM for iPhone</a>
  </td></tr>
  <tr><td align="center" style="padding:0 24px 24px;">
    <img src="{QR_APP}" width="120" height="120" alt="Scan to download PALM" style="display:block;width:120px;height:120px;border-radius:12px;border:1px solid #e2e8f0;" />
    <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;">Scan with your iPhone camera · {note_state} rules built in</p>
  </td></tr>
</table>""",
        lambda c, s: f"""\
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #e2e8f0;border-radius:20px;">
  <tr><td style="padding:28px 24px 8px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f172a;">PalmCare AI</p>
    <div style="width:36px;height:3px;border-radius:99px;background:#0d9488;margin:0 0 20px;"></div>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:30px;font-weight:700;color:#0f172a;">Get Tuesday nights back</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">Hi,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#475569;">Finish at 4. Skip the keyboard at 8. The visit was already documented out loud.</p>
  </td></tr>
  <tr><td align="center" style="padding:8px 24px 20px;">
    <a href="{APP_STORE}" style="display:inline-block;background:#0d9488;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;">Download PALM for iPhone</a>
  </td></tr>
  <tr><td align="center" style="padding:0 24px 24px;">
    <img src="{QR_APP}" width="120" height="120" alt="Scan to download PALM" style="display:block;width:120px;height:120px;border-radius:12px;border:1px solid #e2e8f0;" />
    <p style="margin:10px 0 0;font-size:12px;color:#94A3B8;">Just Palm It · Free for 14 days</p>
  </td></tr>
</table>""",
    ]
    h = int(hashlib.md5(f"{city}{state}".encode()).hexdigest(), 16)
    return templates[h % len(templates)](city, state)


def build_agency_email(provider_name, city, state):
    h = int(hashlib.md5(provider_name.encode()).hexdigest(), 16)
    subject = AGENCY_SUBJECT_HOOKS[h % len(AGENCY_SUBJECT_HOOKS)].format(state=state or "your state")
    body_content = _agency_template(city or "your area", state or "US")
    body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#F8FAFC;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;">
  <tr><td align="center" style="padding:28px 16px;">
{body_content}
{AGENCY_FOOTER}
  </td></tr>
</table>
</body>
</html>"""
    return subject, body


def build_investor_email(fund_name, contact_name, focus_areas):
    first_name = contact_name.split()[0] if contact_name and contact_name.strip() else ""
    greeting = f"Hi {first_name}" if first_name else f"Hi {fund_name} Team"
    subject = "Pre-Seed: Defining the Future of Home Care Operations"
    body = f"""{greeting},

I hope you're well. I'm reaching out to share what we're building at Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates the patient assessment, care planning, and contracting workflow for home care agencies.

One of the strongest signals that this market is ready for disruption is how little has changed. Home care is a $343B industry processing millions of Medicaid and private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, and legacy software built two decades ago.

We are raising a $450K seed round via SAFE or convertible note at a $1.8M pre-money valuation.

PalmCare AI Highlights:
- Full platform built and live today
- $399/mo blended ARPU
- 82% gross margin
- Founder with software engineering, B2B sales, and home care experience
- Clean cap table, 100% bootstrapped

Deck: {PITCH_DECK_URL}
Visit: palmcareai.com

Warm regards,
Muse Ibrahim
Founder & CEO, Palm Technologies Inc.
213-569-7693 | invest@palmtai.com"""
    html = f"<pre style='font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;'>{body}</pre>"
    return subject, html, body


def get_day_data(day_index):
    r = requests.get(
        f"{API_BASE}/platform/outreach/cron/daily-data",
        headers={"X-Internal-Key": INTERNAL_KEY},
        params={"day_index": day_index},
    )
    r.raise_for_status()
    return r.json()


def mark_sent(lead_ids=None, investor_ids=None):
    payload = {"action": "mark"}
    if lead_ids:
        payload["lead_ids"] = lead_ids
    if investor_ids:
        payload["investor_ids"] = investor_ids
    r = requests.post(
        f"{API_BASE}/platform/outreach/cron/mark-emails-sent",
        headers={"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"},
        json=payload,
    )
    r.raise_for_status()
    return r.json()


def send_agency_emails(day_index, day_name):
    data = get_day_data(day_index)
    agencies = data.get("agencies", [])
    print(f"\n{'='*60}")
    print(f"{day_name}: {len(agencies)} agencies")

    already_sent = [a for a in agencies if a.get("status") == "email_sent"]
    to_send = [a for a in agencies if a.get("status") != "email_sent"]
    print(f"  Already marked sent: {len(already_sent)}")
    print(f"  Need to send: {len(to_send)}")

    sent_ids = []
    failed = []

    for i, agency in enumerate(agencies):
        email = agency.get("contact_email")
        name = agency.get("provider_name", "")
        city = agency.get("city", "")
        state = agency.get("state", "")
        aid = agency.get("id")

        if not email or "donotuse" in email.lower() or "example.com" in email.lower():
            print(f"  SKIP: {name} ({email}) - test/invalid email")
            continue

        subject, html = build_agency_email(name, city, state)

        if i > 0:
            time.sleep(1.0)

        try:
            resp = resend.Emails.send({
                "from": "Muse Ibrahim <sales@send.palmtai.com>",
                "to": [email],
                "subject": subject,
                "html": html,
                "reply_to": "sales@palmtai.com",
            })
            eid = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
            print(f"  SENT: {name} -> {email} (resend_id={eid})")
            sent_ids.append(aid)
        except Exception as e:
            print(f"  FAIL: {name} -> {email}: {e}")
            failed.append({"name": name, "email": email, "error": str(e)})
            time.sleep(2.0)

    if sent_ids:
        result = mark_sent(lead_ids=sent_ids)
        print(f"  Marked {result.get('updated', 0)} leads as email_sent")

    return len(sent_ids), len(failed)


def send_investor_emails(day_index, day_name):
    data = get_day_data(day_index)
    investors = data.get("investors", [])
    print(f"\n{day_name} investors: {len(investors)}")

    sent_ids = []
    failed = []

    for i, inv in enumerate(investors):
        email = inv.get("contact_email")
        fund = inv.get("fund_name", "")
        name = inv.get("contact_name", "")
        iid = inv.get("id")
        focus = ", ".join(inv.get("focus_sectors", [])) or "early-stage technology"

        if not email:
            continue

        subject, html, text = build_investor_email(fund, name, focus)

        if i > 0:
            time.sleep(1.0)

        try:
            resp = resend.Emails.send({
                "from": "Muse Ibrahim <invest@send.palmtai.com>",
                "to": [email],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": "invest@palmtai.com",
            })
            eid = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
            print(f"  SENT: {fund} -> {email} (resend_id={eid})")
            if iid:
                sent_ids.append(iid)
        except Exception as e:
            print(f"  FAIL: {fund} -> {email}: {e}")
            failed.append({"fund": fund, "email": email, "error": str(e)})
            time.sleep(2.0)

    if sent_ids:
        result = mark_sent(investor_ids=sent_ids)
        print(f"  Marked {result.get('updated', 0)} investors as email_sent")

    return len(sent_ids), len(failed)


if __name__ == "__main__":
    print("PalmCare AI - Full Outreach Send")
    print(f"Resend API key: ...{resend.api_key[-8:]}")

    total_sent = 0
    total_failed = 0

    # Tuesday (day_index=0)
    s, f = send_agency_emails(0, "TUESDAY")
    total_sent += s; total_failed += f
    s, f = send_investor_emails(0, "TUESDAY")
    total_sent += s; total_failed += f

    # Wednesday (day_index=1)
    s, f = send_agency_emails(1, "WEDNESDAY")
    total_sent += s; total_failed += f
    s, f = send_investor_emails(1, "WEDNESDAY")
    total_sent += s; total_failed += f

    print(f"\n{'='*60}")
    print(f"DONE: {total_sent} sent, {total_failed} failed")
