#!/usr/bin/env python3
"""
Send the current investor email (post-launch, $250K ask, deck v5 attached)
to a single recipient.

Uses the shared canonical copy in email_template.py so the message stays in
sync with the pitch deck. Sends via Resend with the deck PDF attached.

Usage:
  python3 scripts/investors/send_one_investor.py \
      --to osuman.issaka@tsimplef.org --name "Osuman Issaka" --dry-run
  python3 scripts/investors/send_one_investor.py \
      --to osuman.issaka@tsimplef.org --name "Osuman Issaka"

Requires RESEND_API_KEY in the repo-root .env (never commit it).
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from email_template import build_email, deck_attachment, DECK_PATH

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "").strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--name", default="", help="Recipient full name for the greeting")
    parser.add_argument("--fund", default="", help="Fund name (optional)")
    parser.add_argument("--focus", default="", help="Optional one-line thesis tie-in")
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    args = parser.parse_args()

    subject, html, text = build_email(args.fund, args.name, args.focus)

    if not DECK_PATH.exists():
        print(f"ERROR: deck not found at {DECK_PATH}")
        sys.exit(1)

    print(f"To:      {args.to}")
    print(f"Subject: {subject}")
    print(f"Deck:    {DECK_PATH.name} ({DECK_PATH.stat().st_size // 1024} KB)")
    print("-" * 60)
    print(text)
    print("-" * 60)

    if args.dry_run:
        print("DRY RUN: nothing sent.")
        return

    if not resend.api_key:
        print("ERROR: RESEND_API_KEY not set in .env — cannot send.")
        sys.exit(1)

    resp = resend.Emails.send({
        "from": "Muse Ibrahim <invest@send.palmtai.com>",
        "to": [args.to],
        "subject": subject,
        "html": html,
        "text": text,
        "reply_to": "invest@palmtai.com",
        "attachments": [deck_attachment()],
    })
    eid = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
    print(f"SENT to {args.to} (resend_id={eid})")


if __name__ == "__main__":
    main()
