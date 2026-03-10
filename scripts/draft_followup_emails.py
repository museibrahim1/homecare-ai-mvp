#!/usr/bin/env python3
"""
Draft follow-up emails from today's call notes.

Builds personalized follow-up emails for agencies that requested info/demos
and sends them to the CEO for review before forwarding.
"""
import os
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
CEO_EMAIL = "museibrahim@palmtai.com"
SITE_URL = "https://palmcareai.com"
IMG = f"{SITE_URL}/screenshots"
_S = "border-radius:8px;border:1px solid #e5e7eb;"

FOLLOWUPS = [
    {
        "to_name": "Heather",
        "to_email": "Heatherdalton@missionhha.com",
        "agency": "Mission Home Health LLC",
        "city": "FL",
        "type": "info",
        "subject": "Following up — PalmCare AI for Mission Home Health",
        "note": "Met on a call today. She asked for more info.",
    },
    {
        "to_name": "Patricia",
        "to_email": "PatriciaL.Apiolais@choosecovenant.org",
        "agency": "Covenant Home Health Care",
        "city": "Jacksonville, FL",
        "type": "info",
        "subject": "PalmCare AI — Information as requested",
        "note": "Covenant was sold. Patricia is the contact. Asked for info on PalmCare.",
    },
    {
        "to_name": "Mona",
        "to_email": "Primecare@munahomecarehc.com",
        "agency": "Prime Care Home Health Inc",
        "city": "Denver, CO",
        "type": "info",
        "subject": "Following up — PalmCare AI for Prime Care",
        "note": "Called today. She asked for email with more information.",
    },
    {
        "to_name": "Kena",
        "to_email": "Kenatriplett@accentcare.com",
        "agency": "Accentcare Home Health of West Tennessee",
        "city": "Memphis, TN",
        "type": "demo",
        "subject": "PalmCare AI Demo — Let's get you set up",
        "note": "Called today. Interested in a demo. Follow up March 31st.",
    },
    {
        "to_name": "Nurdennis",
        "to_email": "Familylovebehavioral@gmail.com",
        "agency": "Family Love Behavioral Health Care LLC",
        "city": "Miami, FL",
        "type": "demo",
        "subject": "PalmCare AI Demo for Family Love Behavioral Health Care",
        "note": "Called today. 60-100 clients, 10-20 assessments. Interested in demo. Also spoke with Sandra. Call back Thursday.",
    },
]


def build_followup_html(f):
    name = f["to_name"]
    agency = f["agency"]
    email_type = f["type"]

    if email_type == "demo":
        body = f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi {name},</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Great speaking with you today! As discussed, I'd love to show you a quick demo of PalmCare AI and how it can help {agency} streamline assessments, documentation, and contracts.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Here's what we'll cover in 15 minutes:</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">1.</strong> How caregivers record assessments with one tap (the <strong>Palm It</strong> button)</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">2.</strong> How AI automatically generates care plans, contracts, and billable items</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">3.</strong> The agency dashboard — clients, pipeline, revenue at a glance</td></tr>
</table>

<p style="margin:0 0 24px;">
<a href="{SITE_URL}/#book-demo" style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Book Your Demo →</a>
</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><img src="{IMG}/email/recording_screen.png" width="280" style="width:100%;{_S}" alt="Voice Assessment" /></td>
<td width="49%" style="padding-left:4px;"><img src="{IMG}/email/contract_view.png" width="280" style="width:100%;{_S}" alt="AI Contract" /></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Record an assessment → AI generates the contract</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Looking forward to showing you what we've built. Just click the link above or reply to this email and I'll get you scheduled.</p>"""

    else:
        body = f"""\
<p style="font-size:15px;color:#1a1a1a;line-height:1.7;margin:0 0 16px;">Hi {name},</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Great speaking with you today! As promised, here's more information about PalmCare AI and how it can help {agency}.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Here's how it works — three steps, zero paperwork:</p>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">1. Open the app</strong> — Your caregiver launches PalmCare and hits <strong>Palm It</strong> to start an assessment.</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">2. AI transcribes everything</strong> — Real-time transcription with speaker identification. Every care need and billable item extracted automatically.</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#333;line-height:1.5;"><strong style="color:#0d9488;">3. Contract is ready</strong> — Complete assessment, care plan, and service agreement generated — ready to review, send, and sign.</td></tr>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
<tr>
<td width="49%" style="padding-right:4px;"><img src="{IMG}/email/recording_screen.png" width="280" style="width:100%;{_S}" alt="Voice Assessment" /></td>
<td width="49%" style="padding-left:4px;"><img src="{IMG}/email/contract_view.png" width="280" style="width:100%;{_S}" alt="AI Contract" /></td>
</tr>
<tr><td colspan="2" style="padding-top:4px;font-size:11px;color:#999;text-align:center;">Record an assessment → AI generates the contract</td></tr>
</table>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">We handle Medicaid, Medicare, and private pay across all 50 states. Agencies are saving 15+ hours a week on documentation.</p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Would you like to see a quick 15-minute demo? I can walk you through exactly how it works for your agency.</p>

<p style="margin:0 0 24px;">
<a href="{SITE_URL}/#book-demo" style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Book a Demo →</a>
</p>"""

    footer = f"""\
<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 8px;">Visit us at <a href="{SITE_URL}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a></p>

<p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 4px;">Best,</p>
<p style="font-size:15px;color:#1a1a1a;line-height:1.5;margin:0 0 4px;"><strong>Muse Ibrahim</strong></p>
<p style="font-size:13px;color:#888;line-height:1.5;margin:0;">Founder & CEO, Palm Technologies Inc.<br/>
<a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a></p>"""

    return f"""\
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#ffffff;">
<div style="max-width:580px;margin:0 auto;padding:20px;">
{body}
{footer}
</div>
</body>
</html>"""


def send_draft_for_review(f, html):
    """Send draft to CEO for review."""
    review_subject = f"[DRAFT FOR REVIEW] {f['subject']}"
    review_html = f"""\
<div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:24px;font-family:sans-serif;">
    <p style="margin:0 0 8px;font-weight:700;color:#92400e;font-size:16px;">📝 DRAFT — Review Before Sending</p>
    <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>To:</strong> {f['to_name']} &lt;{f['to_email']}&gt;</p>
    <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>Agency:</strong> {f['agency']}</p>
    <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>Type:</strong> {'Demo request' if f['type'] == 'demo' else 'Info follow-up'}</p>
    <p style="margin:0 0 4px;font-size:14px;color:#78350f;"><strong>Subject:</strong> {f['subject']}</p>
    <p style="margin:0;font-size:13px;color:#92400e;"><em>Notes: {f['note']}</em></p>
</div>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
{html}"""

    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": "PalmCare AI <onboarding@resend.dev>",
            "to": [CEO_EMAIL],
            "subject": review_subject,
            "html": review_html,
            "reply_to": "sales@palmtai.com",
        },
        timeout=15,
    )

    if r.status_code in (200, 201):
        return True, r.json().get("id", "?")
    return False, r.text[:200]


def main():
    print("=" * 60)
    print("🌴 PalmCare AI — Follow-up Email Drafts")
    print("=" * 60)

    for f in FOLLOWUPS:
        print(f"\n→ {f['to_name']} @ {f['agency']}")
        print(f"  Email: {f['to_email']}")
        print(f"  Type: {f['type']}")
        print(f"  Subject: {f['subject']}")

        html = build_followup_html(f)
        ok, result = send_draft_for_review(f, html)

        if ok:
            print(f"  ✓ Draft sent to {CEO_EMAIL} for review (ID: {result})")
        else:
            print(f"  ✗ Failed: {result}")

    print(f"\n{'=' * 60}")
    print(f"✅ {len(FOLLOWUPS)} draft emails sent to {CEO_EMAIL} for review.")
    print("Review each one, then forward to the agency contact.")
    print("=" * 60)


if __name__ == "__main__":
    main()
