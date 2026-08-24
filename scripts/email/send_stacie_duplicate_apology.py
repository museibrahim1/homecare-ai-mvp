"""One-time apology to Stacie for duplicate thank-you email.

Usage:
  python3 scripts/email/send_stacie_duplicate_apology.py           # dry run
  python3 scripts/email/send_stacie_duplicate_apology.py --preview
  python3 scripts/email/send_stacie_duplicate_apology.py --send
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

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "museibrahim@palmtai.com"
SEND_LOG = Path(__file__).resolve().parent / ".outreach_sends.json"
CAMPAIGN = "comfort_keepers_duplicate_apology"

STACIE_EMAIL = os.getenv("STACIE_EMAIL", "staciewitts@comfortkeepers.com").strip()
STACIE_NAME = os.getenv("STACIE_NAME", "Stacie").strip() or "Stacie"


def load_send_log() -> list[dict]:
    if not SEND_LOG.exists():
        return []
    try:
        return json.loads(SEND_LOG.read_text(encoding="utf-8"))
    except Exception:
        return []


def already_sent(campaign: str, to_email: str) -> bool:
    target = to_email.strip().lower()
    return any(
        row.get("campaign") == campaign and (row.get("to_email") or "").lower() == target
        for row in load_send_log()
    )


def append_send_log(entry: dict) -> None:
    rows = load_send_log()
    entry["logged_at"] = datetime.now(timezone.utc).isoformat()
    rows.append(entry)
    SEND_LOG.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


def build_subject() -> str:
    return "Sorry about the duplicate email"


def build_html() -> str:
    name = STACIE_NAME
    return f"""\
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 12px;">

  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">

    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">Hi {name},</p>

    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
      You may have received my thank-you note twice. That was a send error on our end, not
      intentional. Sorry for the extra email in your inbox.
    </p>

    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
      Both messages had the same content: the app download link, the 30-day free trial, and my
      ask for weekly updates on assessments and turnaround time. You only need to read one of them.
    </p>

    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 14px;">
      If anything is unclear or you want help getting started in the app, reply here and I will
      jump on it.
    </p>

    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Thank you,</p>
    <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 4px;">Muse Ibrahim</p>
    <p style="font-size:13px;line-height:1.5;color:#64748b;margin:0;">
      Founder, PALM by Palm Technologies<br/>
      <a href="mailto:sales@palmtai.com" style="color:#0d9488;text-decoration:none;">sales@palmtai.com</a>
    </p>
  </div>

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

    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing in .env")
        return 1

    subject = build_subject()
    html = build_html()

    if dry_run:
        print(f"[dry run] -> {to_email}")
        print(f"Subject: {subject}")
        if already_sent(CAMPAIGN, to_email):
            print("DEDUPED: apology already logged for this recipient")
        return 0

    if not preview and not force and already_sent(CAMPAIGN, to_email):
        print(f"SKIP (dedupe): apology already sent to {to_email}")
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
