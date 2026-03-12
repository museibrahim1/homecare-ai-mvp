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
INTERNAL_KEY = "palmcare-cron-2026"
SITE_URL = "https://palmcareai.com"
PITCH_DECK_URL = f"{SITE_URL}/PalmCare_Full_v4.pdf"

AGENCY_SUBJECT_HOOKS = [
    "How much time does your team spend on documentation?",
    "Your staff shouldn't be doing this...",
    "This is changing how agencies handle documentation",
    "What if assessments took 60 seconds?",
    "Are your caregivers still filling out paper forms?",
    "30 seconds to see why agencies are switching",
    "The documentation tool agencies are switching to",
    "Quick question about your documentation process",
    "Three steps to zero paperwork",
    "Saw you're in {state}, thought this might help",
]

AGENCY_FOOTER = """
<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;">
<p style="font-size:14px;color:#1a1a1a;margin:0 0 2px 0;font-weight:600;">Muse Ibrahim</p>
<p style="font-size:13px;color:#6b7280;margin:0 0 2px 0;">Founder &amp; CEO, PalmCare AI</p>
<p style="font-size:13px;color:#6b7280;margin:0 0 8px 0;">213-569-7693 &middot; sales@palmtai.com</p>
<a href="https://palmcareai.com" style="font-size:12px;color:#0d9488;text-decoration:none;">palmcareai.com</a>
</div>
"""


def _agency_template(city, state):
    templates = [
        lambda c, s: f"""<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Hi there,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">I noticed your agency is based in {c}, {s}. Quick question: how much time does your team currently spend on care assessments and documentation?</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">We built PalmCare AI specifically for home care agencies like yours. Our platform turns a voice recording of a patient assessment into a complete care plan, SOAP note, and service contract — automatically.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Agencies using it are cutting documentation time by 70% and generating contracts the same day as the assessment.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Would it be worth a quick 15-minute demo to see how it works?</p>""",
        lambda c, s: f"""<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Hi there,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">I wanted to reach out because we've been working with home care agencies in {s} and the same problem keeps coming up: documentation is eating everyone's time.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">We built PalmCare AI to fix that. Record a patient assessment on your phone, and our AI handles everything — transcription, care plan, billable items, and a ready-to-sign contract.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">It takes about 60 seconds instead of 45 minutes.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Happy to show you a quick demo if you're interested — no pressure at all.</p>""",
        lambda c, s: f"""<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Hi there,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Your agency in {c} caught my attention. I'm reaching out because we've built something that's been a game-changer for agencies dealing with slow documentation workflows.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">PalmCare AI is a complete CRM for home care — but what makes it different is the AI. Record an assessment, and the platform generates your care plan, clinical notes, and service contract automatically.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Agencies tell us it's saving them 15-20 hours a week on paperwork alone.</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;">Would you be open to a brief call this week to see if it'd be a fit?</p>""",
    ]
    h = int(hashlib.md5(f"{city}{state}".encode()).hexdigest(), 16)
    return templates[h % len(templates)](city, state)


def build_agency_email(provider_name, city, state):
    h = int(hashlib.md5(provider_name.encode()).hexdigest(), 16)
    subject = AGENCY_SUBJECT_HOOKS[h % len(AGENCY_SUBJECT_HOOKS)].format(state=state or "your state")
    body_content = _agency_template(city or "your area", state or "US")
    body = f"""<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;">
<div style="max-width:580px;margin:0 auto;padding:20px;">
{body_content}
{AGENCY_FOOTER}
</div>
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
        params={"key": INTERNAL_KEY, "day_index": day_index},
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
