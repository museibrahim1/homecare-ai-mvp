#!/usr/bin/env python3
"""
Welcome + "download the app" launch emails for agencies that just signed up.

Sharp, CTA-first message: the primary action is the App Store download button.
Embeds the "Now Available" launch card and attaches the PALM brochure.

The app is LIVE on the App Store (PALM - Home Care Contracts, id6766371988),
free during the beta.

Usage:
    python scripts/email/send_welcome_launch.py            # sends if RESEND_API_KEY is set
    python scripts/email/send_welcome_launch.py --dry-run  # render only, write preview HTML

If RESEND_API_KEY is not available (e.g. running in a fresh cloud VM), the
script automatically falls back to a dry run and writes the rendered email to
scripts/email/.preview_welcome_launch.html so the copy/design can be reviewed.
"""

import argparse
import base64
import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# ---------------------------------------------------------------- load .env ---
for env_path in (REPO_ROOT / ".env", Path(__file__).resolve().parent.parent / ".env"):
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        break

# ------------------------------------------------------------------ config ---
APP_STORE_URL = "https://apps.apple.com/app/id6766371988"
SITE = "https://palmcareai.com"
FROM = "Muse Ibrahim <sales@send.palmtai.com>"
REPLY_TO = "sales@palmtai.com"
SUBJECT = "Welcome to PALM. The app is live on the App Store."

HERO_PNG = REPO_ROOT / "apps/web/public/marketing/social/palm-now-available.png"
BROCHURE_PNG = REPO_ROOT / "marketing/brochure/PalmCare-Trifold-Brochure.png"

TEAL = "#0d9488"
TEAL_DARK = "#0f766e"
SLATE_900 = "#0f172a"
SLATE_600 = "#475569"
SLATE_200 = "#e2e8f0"

# ---------------------------------------------------------------- recipients ---
# name is used only for the greeting; leave "" for a neutral "Hi there".
RECIPIENTS = [
    {"email": "robinphillips103@gmail.com", "name": "Robin", "company": ""},
    {"email": "shwedone4@gmail.com", "name": "", "company": ""},
    {"email": "familylovebehavioral@gmail.com", "name": "Nurdennis", "company": "Family Love Behavioral"},
    {"email": "kenatriplett@accentcare.com", "name": "Ken", "company": "AccentCare"},
    {"email": "heatherdalton@missionhha.com", "name": "Heather", "company": "Mission HHA"},
    {"email": "patricialapiolais@choosecovenant.org", "name": "Patricia", "company": "Covenant"},
    {"email": "primecare@munahomecarehc.com", "name": "Mona", "company": "Muna Home Care"},
]


def render_html(name: str) -> str:
    """Sharp, CTA-first welcome email. Download button is the priority action."""
    greeting = f"Hi {name}," if name else "Hi there,"
    return f"""\
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff;">

  <div style="padding: 28px 40px 8px; text-align: center;">
    <span style="font-size: 20px; font-weight: 800; color: {SLATE_900}; letter-spacing: -0.3px;">PALM</span>
  </div>

  <div style="padding: 8px 40px 0; color: {SLATE_900}; font-size: 16px; line-height: 1.6;">
    <p style="margin: 0 0 12px;">{greeting}</p>
    <p style="margin: 0 0 8px;">Welcome to PALM. The app is now live on the App Store, and it is free during the beta.</p>
    <p style="margin: 0 0 24px; color: {SLATE_600}; font-size: 15px;">Record a care assessment on your phone. PALM writes the transcript, the billables, the clinical note, and a state-specific service agreement. Download it and try one visit.</p>
  </div>

  <!-- PRIMARY CTA -->
  <div style="padding: 0 40px 8px; text-align: center;">
    <a href="{APP_STORE_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, {TEAL}, {TEAL_DARK}); color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 700; padding: 16px 40px; border-radius: 10px;">Download PALM on the App Store</a>
    <p style="margin: 12px 0 0; font-size: 13px; color: {SLATE_600};">Free during beta. iPhone, iOS 16 or later.</p>
  </div>

  <!-- Launch card (also links to the store) -->
  <div style="padding: 24px 40px 8px; text-align: center;">
    <a href="{APP_STORE_URL}" target="_blank" style="text-decoration: none;">
      <img src="cid:palm-now-available" alt="PALM - Home Care Contracts. Now available on the App Store." style="width: 100%; max-width: 300px; border-radius: 16px;" />
    </a>
  </div>

  <div style="padding: 16px 40px 8px; color: {SLATE_900}; font-size: 15px; line-height: 1.7;">
    <p style="margin: 0 0 8px; font-weight: 700;">What you get from one recording:</p>
    <p style="margin: 0 0 6px;">Speaker-separated transcript of the visit.</p>
    <p style="margin: 0 0 6px;">Billable services with units and rates.</p>
    <p style="margin: 0 0 6px;">A structured clinical note.</p>
    <p style="margin: 0 0 6px;">A service agreement built for your state, ready to review and send.</p>
  </div>

  <div style="padding: 12px 40px 8px; color: {SLATE_600}; font-size: 14px; line-height: 1.6;">
    <p style="margin: 0;">The one-page overview is attached. Questions? Just reply to this email.</p>
  </div>

  <div style="padding: 24px 40px 8px; text-align: center;">
    <a href="{APP_STORE_URL}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, {TEAL}, {TEAL_DARK}); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 32px; border-radius: 10px;">Get the App</a>
  </div>

  <div style="padding: 24px 40px 28px; border-top: 1px solid {SLATE_200}; margin: 20px 40px 0;">
    <p style="margin: 0; font-weight: 700; font-size: 15px; color: {SLATE_900};">Muse Ibrahim</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: {TEAL};">Founder, Palm Technologies, Inc.</p>
    <p style="margin: 6px 0 0;"><a href="{SITE}" style="color: {TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">palmcareai.com</a></p>
  </div>

</div>"""


def _b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def build_attachments() -> list:
    """Inline launch card (cid) + brochure as a downloadable file."""
    attachments = []
    if HERO_PNG.exists():
        attachments.append({
            "filename": "palm-now-available.png",
            "content": _b64(HERO_PNG),
            "content_id": "palm-now-available",
        })
    else:
        print(f"  [warn] launch card not found at {HERO_PNG}")
    if BROCHURE_PNG.exists():
        attachments.append({
            "filename": "PALM-Home-Care-Brochure.png",
            "content": _b64(BROCHURE_PNG),
        })
    else:
        print(f"  [warn] brochure not found at {BROCHURE_PNG}")
    return attachments


def write_preview() -> None:
    preview = Path(__file__).resolve().parent / ".preview_welcome_launch.html"
    sample = RECIPIENTS[3]  # Ken (named recipient, good sample)
    preview.write_text(render_html(sample["name"]))
    print(f"  Preview written to {preview}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="render only, do not send")
    args = parser.parse_args()

    api_key = os.getenv("RESEND_API_KEY")
    print("=" * 60)
    print(f"PALM welcome + launch emails to {len(RECIPIENTS)} recipients")
    print("=" * 60)

    if args.dry_run or not api_key:
        if not api_key:
            print("RESEND_API_KEY not found. Falling back to dry run.")
        else:
            print("Dry run requested.")
        for r in RECIPIENTS:
            print(f"  would send -> {r['email']} ({r['name'] or 'no name'})")
        write_preview()
        print("\nNo emails were sent. Set RESEND_API_KEY and run without --dry-run to send.")
        return

    try:
        import resend
    except ImportError:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "resend", "-q"])
        import resend

    resend.api_key = api_key
    attachments = build_attachments()

    sent = 0
    for i, r in enumerate(RECIPIENTS):
        if i > 0:
            time.sleep(1.5)
        try:
            resp = resend.Emails.send({
                "from": FROM,
                "to": [r["email"]],
                "subject": SUBJECT,
                "html": render_html(r["name"]),
                "reply_to": REPLY_TO,
                "attachments": attachments,
            })
            email_id = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
            print(f"  [+] {r['email']} (sent, id={email_id})")
            sent += 1
        except Exception as e:  # noqa: BLE001
            print(f"  [!] {r['email']} FAILED: {e}")

    print("=" * 60)
    print(f"COMPLETE: {sent}/{len(RECIPIENTS)} sent")
    print("=" * 60)


if __name__ == "__main__":
    main()
