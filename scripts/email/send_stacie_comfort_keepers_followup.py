"""Thank-you follow-up to Stacie Witts (Comfort Keepers) after demo.

Usage:
  python3 scripts/email/send_stacie_comfort_keepers_followup.py           # dry run
  python3 scripts/email/send_stacie_comfort_keepers_followup.py --preview # to Muse
  python3 scripts/email/send_stacie_comfort_keepers_followup.py --send    # to Stacie
  python3 scripts/email/send_stacie_comfort_keepers_followup.py --send --force  # bypass dedupe

Dedupe: scripts/email/.outreach_sends.json (campaign + recipient email).
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
load_dotenv(PROJECT_ROOT / ".env")

from lib.utm import app_link  # noqa: E402

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "museibrahim@palmtai.com"
SEND_LOG = Path(__file__).resolve().parent / ".outreach_sends.json"
CAMPAIGN = "comfort_keepers_followup"

STACIE_EMAIL = os.getenv("STACIE_EMAIL", "staciewitts@comfortkeepers.com").strip()
STACIE_NAME = os.getenv("STACIE_NAME", "Stacie").strip() or "Stacie"

APP = app_link(
    source="email",
    medium="email",
    campaign="comfort_keepers_followup",
    content="app_store_cta",
)
IMG = "https://palmcareai.com/screenshots/email/recording_screen.png"


def load_send_log() -> list[dict]:
    if not SEND_LOG.exists():
        return []
    try:
        return json.loads(SEND_LOG.read_text(encoding="utf-8"))
    except Exception:
        return []


def already_sent(campaign: str, to_email: str) -> list[dict]:
    target = to_email.strip().lower()
    return [
        row
        for row in load_send_log()
        if row.get("campaign") == campaign and (row.get("to_email") or "").lower() == target
    ]


def append_send_log(entry: dict) -> None:
    rows = load_send_log()
    entry["logged_at"] = datetime.now(timezone.utc).isoformat()
    rows.append(entry)
    SEND_LOG.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def build_subject() -> str:
    return "Thank you for your time today, and next steps with PALM"


def build_html() -> str:
    name = STACIE_NAME
    return f"""\
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 12px;">

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <img src="{IMG}" alt="PALM app during a home care assessment"
         style="width:100%;display:block;border-bottom:1px solid #e2e8f0;" />

    <div style="padding:28px 28px 8px;">
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">Hi {name},</p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        Thank you for giving us your time today. I enjoyed learning more about Comfort Keepers
        and how your team runs assessments in the field.
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        When you are ready to try PALM on a real visit, download the iPhone app and start your
        <strong>30-day free trial</strong> from Settings → Your Plan. Apple handles billing through
        your Apple ID. Cancel anytime before the trial ends if you are not ready to continue.
      </p>

      <p style="margin:0 0 22px;">
        <a href="{APP}"
           style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;">
          Download PALM on iPhone
        </a>
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        I would love to stay close as you test it. If you can, please keep me in the loop on a
        weekly basis with two things:
      </p>

      <ul style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 18px;padding-left:20px;">
        <li style="margin-bottom:8px;">How many assessments your team completed in PALM that week</li>
        <li style="margin-bottom:8px;">How much faster you were able to turn visits into care plans and paperwork</li>
      </ul>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
        Your feedback helps us build for agencies like yours. Feel free to reply to this email or
        call anytime if you want help with setup, a walkthrough, or questions about your state rules.
      </p>

      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Thank you again,</p>
      <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Muse Ibrahim</p>
      <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0;">
        Founder, PALM by Palm Technologies<br/>
        <a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a>
        · palmcareai.com
      </p>
    </div>
  </div>

  <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0;">
    Palm Technologies, Inc. · HIPAA compliant
  </p>
</div>
</body>
</html>
"""


def send_resend(payload: dict) -> tuple[bool, str]:
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json=payload,
        timeout=30,
    )
    if r.status_code in (200, 201):
        return True, str(r.json().get("id", ""))
    return False, f"{r.status_code} {r.text[:300]}"


def main() -> int:
    dry_run = "--send" not in sys.argv and "--preview" not in sys.argv
    preview = "--preview" in sys.argv
    force = "--force" in sys.argv

    to_email = STACIE_EMAIL
    if preview:
        to_email = os.getenv("PREVIEW_TO", "museibrahim@palmtai.com").strip()

    if not to_email:
        print("Set STACIE_EMAIL before sending.")
        return 1

    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing in .env")
        return 1

    subject = build_subject()
    html = build_html()

    if dry_run:
        prior = already_sent(CAMPAIGN, to_email)
        preview_path = PROJECT_ROOT / "marketing/email-preview-stacie-comfort-keepers.html"
        preview_path.write_text(html, encoding="utf-8")
        print(f"[dry run] -> {to_email}")
        print(f"Subject: {subject}")
        if prior:
            print(f"DEDUPED: already sent {len(prior)} time(s); use --force to resend")
            for row in prior:
                print(f"  - {row.get('resend_email_id')} at {row.get('logged_at')}")
        print(f"Preview saved: {preview_path}")
        return 0

    if not preview and not force:
        prior = already_sent(CAMPAIGN, to_email)
        if prior:
            print(f"SKIP (dedupe): {CAMPAIGN} already sent to {to_email} ({len(prior)} time(s)).")
            print("Use --force only if you intentionally need another send.")
            return 0

    payload = {
        "from": FROM,
        "to": [to_email],
        "reply_to": REPLY_TO,
        "subject": ("[Preview] " if preview else "") + subject,
        "html": html,
    }
    ok, detail = send_resend(payload)
    if ok:
        if not preview:
            append_send_log(
                {
                    "campaign": CAMPAIGN,
                    "to_email": to_email,
                    "subject": subject,
                    "resend_email_id": detail,
                }
            )
        print(f"SENT -> {to_email}  from={FROM}  id={detail}")
        return 0
    print(f"FAIL: {detail}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
