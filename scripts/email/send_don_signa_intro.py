"""Send PALM overview to Don for Cigna partnership / acquisition intro.

Usage:
  python3 scripts/email/send_don_signa_intro.py          # dry run
  python3 scripts/email/send_don_signa_intro.py --send   # send to Don
  DON_EMAIL=don@example.com python3 scripts/email/send_don_signa_intro.py --send
"""
import base64
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
load_dotenv(PROJECT_ROOT / ".env")

from lib.utm import app_link, site  # noqa: E402

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "museibrahim@palmtai.com"

DON_EMAIL = os.getenv("DON_EMAIL", "").strip()
DON_NAME = os.getenv("DON_NAME", "Don").strip() or "Don"
PARTNER_NAME = os.getenv("PARTNER_NAME", "Cigna").strip() or "Cigna"

BROCHURE_PATH = PROJECT_ROOT / "apps/web/public/brochure/PalmCare-AI-Brochure.pdf"
IMG = "https://palmcareai.com/screenshots/email"
_S = "border-radius:10px;border:1px solid #e2e8f0;display:block;width:100%;"

SITE = site("/", source="email", medium="email", campaign="signa_intro", content="footer")
FEATURES = site("/features", source="email", medium="email", campaign="signa_intro", content="features")
DEMO = site("/book-demo", source="email", medium="email", campaign="signa_intro", content="demo")
APP = app_link(source="email", medium="email", campaign="signa_intro", content="app_store")

IMAGES = {
    "home": f"{IMG}/home_dashboard.png",
    "recording": f"{IMG}/recording_screen.png",
    "crm_dashboard": f"{IMG}/crm_dashboard.png",
    "crm_contract": f"{IMG}/crm_contract.png",
}


def build_subject() -> str:
    return f"PALM overview for your {PARTNER_NAME} introduction"


def build_html() -> str:
    name = DON_NAME
    partner = PARTNER_NAME
    return f"""\
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px 12px;">

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <img src="{IMAGES['crm_dashboard']}" alt="PALM agency dashboard"
         style="width:100%;display:block;border-bottom:1px solid #e2e8f0;" />

    <div style="padding:28px 28px 8px;">
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">Hi {name},</p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        Thank you for offering to connect us with {partner}. I put together a short overview
        of PALM so you have something concrete to share ahead of the introduction.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">Why we built PALM</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        Home care agencies do the hard work of caring for people in their homes. After every
        visit, nurses and caregivers still lose evenings to paperwork: care plans, billables,
        and contracts that have to match what was said in the room.
      </p>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        We built PALM because that robotic work should not steal time from care or from
        family. The visit is the assessment. PALM listens, documents accurately, and hands
        back a complete file so agencies can run intake, billing, and contracts in one place
        instead of stitching five tools together.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">What PALM is</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        The main product is our web agency platform at palmcareai.com. Owners and office
        staff run clients, the intake pipeline, assessments, care tracking, billables,
        contracts, documents, and team workflows from one dashboard. No jumping between
        a recording app, a spreadsheet, and a separate contract tool.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">How agencies find us</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        The iPhone app is the companion that pulls agencies in. A caregiver records the
        assessment on their phone. PALM turns that visit into the transcript, care notes,
        billables, and a state-specific service contract. That moment on the phone is how
        most agencies discover us.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">Why they stay</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        They stay because the recording feeds directly into the same system the office
        already uses. Field staff Palm It on the visit. The web dashboard shows the client
        in the pipeline, the assessment artifacts, and the contract ready to send. One
        login. One workflow. Built for how home care agencies actually run.
      </p>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">What is live today</h2>
      <ul style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;padding-left:20px;">
        <li style="margin-bottom:6px;">Web agency platform: clients, intake pipeline, assessments, contracts, documents, team tools</li>
        <li style="margin-bottom:6px;">Companion iOS app on the App Store with paid subscriptions</li>
        <li style="margin-bottom:6px;">Intake and assessment capture on iPhone, synced to the web dashboard</li>
        <li style="margin-bottom:6px;">Contract rules for all 50 states plus DC</li>
        <li style="margin-bottom:6px;">HIPAA and SOC 2 aligned infrastructure</li>
      </ul>

      <h2 style="font-size:16px;color:#0f172a;margin:22px 0 8px;">What is next</h2>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 12px;">
        Scheduler is the next major release. Intake pipeline over the phone is already how
        new clients enter the system: a call comes in or a referral arrives, staff captures
        the assessment on iPhone, and the deal moves through the pipeline on the web
        without re-entering data.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="padding:0 20px 8px;">
      <tr>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['home']}" alt="PALM iPhone home screen" style="{_S}" />
        </td>
        <td width="49%" style="padding:4px;">
          <img src="{IMAGES['recording']}" alt="Live transcript during visit" style="{_S}" />
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:4px 8px 12px;font-size:12px;color:#64748b;text-align:center;">
          iPhone companion app · Intake and assessment on the phone
        </td>
      </tr>
    </table>

    <div style="padding:8px 28px 8px;">
      <img src="{IMAGES['crm_contract']}" alt="Generated service contract" style="{_S}" />
      <p style="font-size:12px;color:#64748b;text-align:center;margin:8px 0 0;">
        Service contract in the web dashboard, generated from the visit
      </p>
    </div>

    <div style="padding:20px 28px 8px;">
      <h2 style="font-size:16px;color:#0f172a;margin:0 0 8px;">Quick links for {partner}</h2>
      <p style="font-size:15px;line-height:1.8;color:#334155;margin:0 0 14px;">
        <a href="{SITE}" style="color:#0d9488;font-weight:600;">palmcareai.com</a><br/>
        <a href="{FEATURES}" style="color:#0d9488;">Product features</a><br/>
        <a href="{APP}" style="color:#0d9488;">Download on the App Store</a>
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 20px;">
        The brochure is attached. I am happy to send a diligence deck or set up demo access
        for {partner} before we meet. If their team wants a walkthrough first, I can do a
        20-minute call.
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 20px;">
        Looking forward to the intro. Reply here if you need anything else for {partner}.
      </p>

      <div style="text-align:center;margin:0 0 18px;">
        <a href="{DEMO}"
           style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
          Book a demo
        </a>
      </div>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Muse Ibrahim</p>
      <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0;">
        Founder, PALM by Palm Technologies<br/>
        <a href="{SITE}" style="color:#0d9488;text-decoration:none;">palmcareai.com</a>
        · <a href="mailto:museibrahim@palmtai.com" style="color:#0d9488;text-decoration:none;">museibrahim@palmtai.com</a>
      </p>
    </div>
  </div>

  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:14px 0 0;">
    PALM is HIPAA and SOC 2 compliant. Available for iPhone and web.
  </p>
</div>
</body>
</html>
"""


def main() -> int:
    dry_run = "--send" not in sys.argv and "--preview" not in sys.argv
    preview = "--preview" in sys.argv

    to_email = DON_EMAIL
    if preview:
        to_email = os.getenv("PREVIEW_TO", "museibrahim@palmtai.com").strip()

    if not to_email:
        print("Set DON_EMAIL (e.g. DON_EMAIL=don@example.com) before sending.")
        if dry_run:
            print("[dry run] Would send to DON_EMAIL once set.")
            print(f"Subject: {build_subject()}")
            return 0
        return 1

    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing in .env")
        return 1

    with open(BROCHURE_PATH, "rb") as f:
        brochure_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "from": FROM,
        "to": [to_email],
        "reply_to": REPLY_TO,
        "subject": ("[Preview] " if preview else "") + build_subject(),
        "html": build_html(),
        "attachments": [
            {"filename": "PALM-Brochure.pdf", "content": brochure_b64},
        ],
    }

    if dry_run:
        print(f"[dry run] -> {to_email or 'DON_EMAIL'}")
        print(f"Subject: {build_subject()}")
        print(f"Partner: {PARTNER_NAME}")
        return 0

    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json=payload,
        timeout=30,
    )
    ok = r.status_code in (200, 201)
    if ok:
        print(f"SENT -> {to_email}  id={r.json().get('id')}")
        return 0
    print(f"FAIL -> {to_email}  {r.status_code} {r.text[:200]}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
