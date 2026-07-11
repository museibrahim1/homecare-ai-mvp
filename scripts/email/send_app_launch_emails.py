"""App launch announcement emails.

Two variants:
  - welcome: for companies that already signed up (download the app)
  - launch:  for prospects (download the app and start a free trial)

Every email attaches the brochure PDF and leads with one CTA:
the App Store download button.
"""
import base64
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv()

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "sales@palmtai.com"

APP_STORE_URL = "https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988"
HERO_IMG = "https://palmcareai.com/launch/palm-launch-email-hero.png"
VIDEO_URL = "https://palmcareai.com/launch/palm-app-launch.mp4"
BROCHURE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "apps", "web", "public", "brochure",
    "PalmCare-AI-Brochure.pdf",
)

RECIPIENTS = [
    # (email, first_name or None, company or None, variant)
    ("shola@fortcomhealth.com", "Shola", "Fortcom Health Services", "welcome"),
    ("robinphillips103@gmail.com", "Robin", None, "welcome"),
    ("shwedone4@gmail.com", None, None, "launch"),
    ("familylovebehavioral@gmail.com", "Nurdennis", "Family Love Behavioral", "launch"),
    ("kenatriplett@accentcare.com", "Ken", "AccentCare", "launch"),
    ("Heatherdalton@missionhha.com", "Heather", "Mission Home Health", "launch"),
    ("PatriciaLApiolais@choosecovenant.org", "Patricia", "Covenant Health", "launch"),
    ("Primecare@monahomecarehc.com", "Mona", "Prime Care", "launch"),
]


def build_html(first_name, company, variant):
    greeting = f"Hi {first_name}," if first_name else "Hi there,"

    if variant == "welcome":
        headline = "Your PALM account is ready. The app is live."
        body = (
            "Thank you for signing up. PALM is now on the App Store, and your "
            "account works the moment you log in. Record a client visit, and PALM "
            "turns it into the transcript, care notes, billables, and a signed "
            "service contract before you leave the driveway."
        )
        cta_label = "Download PALM on the App Store"
    else:
        headline = "PALM is live on the App Store."
        body = (
            "PALM listens to your client assessment and hands you the contract. "
            "One recorded conversation becomes the transcript, care notes, "
            "billables, and a ready to sign service agreement in minutes, not days. "
            "Download the app and start your 14 day free trial today."
        )
        cta_label = "Download PALM and Start Free"

    company_line = ""
    if company and variant == "launch":
        company_line = (
            f'<p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px;">'
            f"Agencies like {company} spend hours on paperwork after every "
            f"assessment. PALM gives those hours back.</p>"
        )

    return f"""
<div style="background:#f1f5f9;padding:24px 12px;">
  <div style="max-width:560px;margin:0 auto;font-family:-apple-system,'Segoe UI',Arial,sans-serif;">

    <a href="{APP_STORE_URL}" style="display:block;">
      <img src="{HERO_IMG}" alt="PALM is now available on the App Store"
           style="width:100%;border-radius:14px 14px 0 0;display:block;" />
    </a>

    <div style="background:#ffffff;padding:32px;border-radius:0 0 14px 14px;border:1px solid #e2e8f0;border-top:none;">
      <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px;">{greeting}</p>
      <h1 style="font-size:21px;color:#0f172a;margin:0 0 12px;">{headline}</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px;">{body}</p>
      {company_line}

      <div style="text-align:center;margin:28px 0;">
        <a href="{APP_STORE_URL}"
           style="display:inline-block;background:#0d9488;color:#ffffff;padding:16px 40px;border-radius:12px;font-size:17px;font-weight:700;text-decoration:none;">
          {cta_label}
        </a>
      </div>

      <table style="width:100%;font-size:14px;color:#334155;line-height:1.7;border-collapse:collapse;">
        <tr><td style="padding:2px 0;">1. Record the visit on your iPhone</td></tr>
        <tr><td style="padding:2px 0;">2. PALM writes the notes, billables, and contract</td></tr>
        <tr><td style="padding:2px 0;">3. Send it for signature the same day</td></tr>
      </table>

      <p style="font-size:14px;line-height:1.6;color:#334155;margin:20px 0 0;">
        The brochure is attached, and you can
        <a href="{VIDEO_URL}" style="color:#0d9488;font-weight:600;">watch the 7 second launch video here</a>.
        Reply to this email and I will personally walk your team through setup.
      </p>

      <p style="font-size:14px;color:#334155;margin:20px 0 0;">
        Muse Ibrahim<br/>
        Founder, PALM by Palm Technologies<br/>
        <a href="https://palmcareai.com" style="color:#0d9488;">palmcareai.com</a>
      </p>
    </div>

    <p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0;">
      PALM is HIPAA and SOC 2 compliant. Available now for iPhone.
    </p>
  </div>
</div>
"""


def main():
    dry_run = "--send" not in sys.argv

    with open(BROCHURE_PATH, "rb") as f:
        brochure_b64 = base64.b64encode(f.read()).decode()

    for email, first, company, variant in RECIPIENTS:
        if variant == "welcome":
            subject = "Welcome to PALM. Your app is ready to download"
        else:
            subject = "PALM is live on the App Store. Your contracts, from a conversation"

        payload = {
            "from": FROM,
            "to": [email],
            "reply_to": REPLY_TO,
            "subject": subject,
            "html": build_html(first, company, variant),
            "attachments": [
                {"filename": "PALM-Brochure.pdf", "content": brochure_b64}
            ],
        }

        if dry_run:
            print(f"[dry run] {variant:8s} -> {email}  ({subject})")
            continue

        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json=payload,
            timeout=30,
        )
        ok = r.status_code in (200, 201)
        print(f"{'SENT' if ok else 'FAIL'} {variant:8s} -> {email}  {r.status_code} {r.text[:120] if not ok else r.json().get('id')}")
        time.sleep(1.2)


if __name__ == "__main__":
    main()
