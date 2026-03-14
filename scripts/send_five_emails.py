#!/usr/bin/env python3
"""
Send outreach emails to 5 contacts from today's phone calls.
Uses local .env for Resend API key since Railway's may be expired.
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# Load .env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

try:
    import resend
except ImportError:
    print("Installing resend...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "resend", "-q"])
    import resend

import requests

resend.api_key = os.getenv("RESEND_API_KEY")
if not resend.api_key:
    print("ERROR: RESEND_API_KEY not found in .env")
    sys.exit(1)

API_BASE = "https://api-production-a0a2.up.railway.app"
HEADERS = {"X-Internal-Key": os.getenv("CRON_SECRET", ""), "Content-Type": "application/json"}
SITE = "https://palmcareai.com"
GH_MARKETING = "https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/main/apps/web/public/marketing"

TEAL = "#0d9488"
TEAL_DARK = "#0f766e"
SLATE_900 = "#0f172a"
SLATE_600 = "#475569"
SLATE_200 = "#e2e8f0"
SLATE_100 = "#f1f5f9"


def build_warm_open(provider_name, city, state, state_full):
    """Build the warm_open email (same as API template)."""
    subject = f"{provider_name} — quick question"

    body = f"""\
<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
<div style="background: linear-gradient(135deg, {TEAL}, #0891b2); padding: 32px 40px; text-align: center;">
<p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">PalmCare AI</p>
<p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); letter-spacing: 0.05em;">WHERE CARE MEETS INTELLIGENCE</p>
</div>
<div style="padding: 40px; color: {SLATE_900}; font-size: 15px; line-height: 1.7;">
<p style="margin: 0 0 16px 0; color: {SLATE_900};">Hi,</p>
<div style="margin-bottom: 28px;">
<p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: {TEAL}; text-transform: uppercase; letter-spacing: 0.08em;">Why I reached out</p>
<p style="margin: 0; font-size: 15px; color: {SLATE_900}; line-height: 1.7;">I came across {provider_name} while researching home care agencies in {city}. Building something in this industry takes real grit &mdash; I respect it.</p>
</div>
<p style="margin: 0 0 16px 0; color: {SLATE_900};">Quick question: how is your team handling client assessments and documentation right now? Still paper-based, or have you found something digital that actually works?</p>
<div style="margin-bottom: 28px;">
<p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: {TEAL}; text-transform: uppercase; letter-spacing: 0.08em;">What we do</p>
<p style="margin: 0; font-size: 15px; color: {SLATE_900}; line-height: 1.7;">PalmCare AI turns care assessments into signed contracts &mdash; automatically. Staff record the interview on their phone. AI transcribes it, generates the care plan, and produces a ready-to-sign agreement in seconds.</p>
</div>
<p style="margin: 0 0 16px 0; color: {SLATE_600}; font-size: 14px;">No pitch today &mdash; just curious how agency owners in {state_full} actually run things day to day.</p>
</div>
<div style="padding: 0 40px 32px; border-top: 1px solid {SLATE_200}; padding-top: 24px;">
<p style="margin: 0; font-weight: 700; font-size: 15px; color: {SLATE_900};">Muse Ibrahim</p>
<p style="margin: 2px 0 0; font-size: 13px; color: {TEAL};">President &amp; CEO</p>
<p style="margin: 2px 0 0; font-size: 13px; color: {TEAL};">Palm Technologies, Inc.</p>
<p style="margin: 6px 0 0;"><a href="{SITE}" style="color: {TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">palmcareai.com</a></p>
</div>
<div style="padding: 0 40px 32px; text-align: center;">
<a href="{SITE}" style="text-decoration: none;">
<img src="{GH_MARKETING}/hero_banner.png" alt="PalmCare AI" style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {SLATE_200};" />
</a></div>
<div style="padding: 0 40px 24px; text-align: center;">
<img src="{GH_MARKETING}/iphone_home.png" alt="Home" style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />
<img src="{GH_MARKETING}/iphone_record.png" alt="Palm It" style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />
<img src="{GH_MARKETING}/iphone_clients.png" alt="Clients" style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />
</div>
<div style="margin: 0 40px 32px; background: linear-gradient(135deg, {TEAL}, {TEAL_DARK}); border-radius: 12px; padding: 28px 32px; text-align: center;">
<p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #ffffff;">PALM IT.</p>
<p style="margin: 0 0 16px; font-size: 13px; color: rgba(255,255,255,0.85);">Record it. Transcribe it. Contract it. All in your palm.</p>
<a href="{SITE}/#book-demo" style="display: inline-block; background-color: #ffffff; color: {TEAL_DARK}; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">See It In Action</a>
</div>
<div style="padding: 24px 40px; background-color: {SLATE_100}; border-top: 1px solid {SLATE_200}; text-align: center;">
<a href="{SITE}" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">
<img src="{SITE}/qr-code.png" alt="Scan to visit palmcareai.com" style="width: 72px; height: 72px; border-radius: 8px; border: 1px solid #e2e8f0;" />
</a><br>
<p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">Scan to visit palmcareai.com</p>
<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: {SLATE_900};">PalmCare AI</p>
<p style="margin: 0 0 12px; font-size: 12px; color: {SLATE_600};">Built for care professionals</p>
<p style="margin: 0 0 12px; font-size: 11px; color: #94a3b8;">Palm Technologies, Inc. &middot; Omaha, NE<br>You received this because {provider_name} is listed in public agency directories.</p>
<p style="margin: 0;">
<a href="{SITE}/privacy" style="color: #94a3b8; text-decoration: underline; font-size: 11px;">Privacy</a>
&nbsp;&middot;&nbsp;
<a href="{SITE}/unsubscribe" style="color: #94a3b8; text-decoration: underline; font-size: 11px;">Unsubscribe</a>
</p></div>
</div>"""
    return subject, body


CONTACTS = [
    {
        "provider_name": "McAngel Nurses",
        "contact_name": "Lordina / Angela Berko",
        "email": "angela.berko@mcangelnurses.com",
        "city": "Florida",
        "state": "FL",
        "state_full": "Florida",
        "notes": "[2026-03-11] Phone call with Lordina. Send information. Expect a call back.",
    },
    {
        "provider_name": "Doctors Preferred Healthcare",
        "contact_name": "Sebrina Houston",
        "email": "info@doctorspreferredhealthcare.com",
        "city": "Houston",
        "state": "FL",
        "state_full": "Florida",
        "notes": "[2026-03-11] Phone call with Sebrina Houston. Email her the information.",
    },
    {
        "provider_name": "Paradis HS Home Health",
        "contact_name": "Ms Donaldson",
        "email": "phha@paradishs.com",
        "city": "Florida",
        "state": "FL",
        "state_full": "Florida",
        "notes": "[2026-03-11] Phone call with Ms Donaldson. Send information.",
    },
    {
        "provider_name": "Empower / Healthy Home Primary",
        "contact_name": "Courtney Crane",
        "email": "ccrane@healthyhomeprimary.com",
        "city": "Florida",
        "state": "FL",
        "state_full": "Florida",
        "notes": "[2026-03-11] Phone call with Courtney at Empower. Send information.",
    },
    {
        "provider_name": "Lucent Healthcare",
        "contact_name": "Ivad",
        "email": "info@lucenthealthcare.com",
        "city": "Florida",
        "state": "FL",
        "state_full": "Florida",
        "notes": "[2026-03-11] Phone call with Ivad. Send info.",
    },
]


def send_emails():
    """Send warm_open emails to all 5 contacts."""
    print(f"\n{'='*60}")
    print(f"SENDING OUTREACH EMAILS TO {len(CONTACTS)} CONTACTS")
    print(f"{'='*60}\n")

    import time
    results = []
    for i, c in enumerate(CONTACTS):
        if i > 0:
            time.sleep(1.5)

        subject, html = build_warm_open(c["provider_name"], c["city"], c["state"], c["state_full"])

        try:
            resp = resend.Emails.send({
                "from": "Muse Ibrahim <sales@send.palmtai.com>",
                "to": [c["email"]],
                "subject": subject,
                "html": html,
                "reply_to": "sales@palmtai.com",
            })

            email_id = None
            if isinstance(resp, dict):
                email_id = resp.get("id")
            elif hasattr(resp, "id"):
                email_id = resp.id

            print(f"  [+] {c['provider_name']} → {c['email']} (sent, id={email_id})")
            results.append({"contact": c, "success": True, "email_id": email_id})

        except Exception as e:
            print(f"  [!] {c['provider_name']} → {c['email']} (FAILED: {e})")
            results.append({"contact": c, "success": False, "error": str(e)})

    return results


def update_crm_after_send(results):
    """Update the CRM leads with email send info and notes via internal API."""
    print(f"\n{'='*60}")
    print("UPDATING CRM WITH EMAIL SEND STATUS + NOTES")
    print(f"{'='*60}\n")

    for r in results:
        c = r["contact"]
        payload = [{
            "provider_name": c["provider_name"],
            "state": c["state"],
            "city": c.get("city", ""),
            "contact_name": c["contact_name"],
            "contact_email": c["email"],
            "notes": c["notes"],
            "send_email": False,
            "campaign_name": "phone-outreach-mar-2026",
        }]

        resp = requests.post(
            f"{API_BASE}/platform/sales/leads/internal/add-and-email",
            headers=HEADERS,
            json=payload,
        )

        if resp.status_code == 200:
            data = resp.json()
            lead_id = data["results"][0].get("lead_id", "")
            print(f"  [+] {c['provider_name']} → CRM updated (lead_id={lead_id})")
        else:
            print(f"  [!] {c['provider_name']} → CRM update failed: {resp.text}")


def start_sequences():
    """Start sequences for all recently emailed agencies."""
    print(f"\n{'='*60}")
    print("STARTING SEQUENCES FOR RECENTLY EMAILED AGENCIES")
    print(f"{'='*60}\n")

    resp = requests.post(
        f"{API_BASE}/platform/sales/leads/internal/start-recent-sequences?days=2&campaign_name=cold-outreach-mar-2026",
        headers=HEADERS,
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"  Started: {data.get('started', 0)}")
        print(f"  Message: {data.get('message', '')}")
    else:
        print(f"  ERROR: {resp.status_code} — {resp.text}")


def main():
    print("\n" + "=" * 60)
    print(f"PalmCare AI — Email Outreach — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    email_results = send_emails()

    update_crm_after_send(email_results)

    start_sequences()

    sent = sum(1 for r in email_results if r["success"])
    print(f"\n{'='*60}")
    print(f"COMPLETE: {sent}/{len(CONTACTS)} emails sent successfully")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
