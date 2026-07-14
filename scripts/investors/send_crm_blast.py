#!/usr/bin/env python3
"""
Send the current investor email (post-launch, $250K ask, deck v5 attached)
to every investor in the CRM.

- Pulls the full list from /platform/investors/internal-export (X-Internal-Key)
- Skips investors who passed, were marked not relevant, or already committed
- Dedupes by email, skips the block list
- Sends via Resend with the deck PDF attached
- Marks each send back in the CRM via /platform/investors/batch-mark-sent

Usage:
  python3 scripts/investors/send_crm_blast.py --dry-run   # preview only
  python3 scripts/investors/send_crm_blast.py             # send for real
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from email_template import build_email, deck_attachment

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "").strip()

API_BASE = "https://api-production-a0a2.up.railway.app"

SKIP_STATUSES = {"passed", "not_relevant", "committed"}
SKIP_EMAILS = {
    "jamie@thecreatorfund.com",
}


def focus_line_for(inv):
    sectors = [s for s in (inv.get("focus_sectors") or []) if s]
    stages = [s for s in (inv.get("focus_stages") or []) if s]
    if sectors:
        picks = " and ".join(sectors[:2])
        return f"You back early stage {picks} companies, so this should be relevant."
    if stages:
        return f"You invest at the {stages[0].lower()} stage, so this should be relevant."
    return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview without sending")
    parser.add_argument("--limit", type=int, default=0, help="Cap number of sends (0 = all)")
    args = parser.parse_args()

    internal_key = os.getenv("CRON_SECRET", "")
    if not internal_key:
        print("ERROR: CRON_SECRET not set")
        sys.exit(1)
    if not resend.api_key and not args.dry_run:
        print("ERROR: RESEND_API_KEY not set")
        sys.exit(1)

    print("Fetching full investor list from CRM...")
    resp = requests.get(
        f"{API_BASE}/platform/investors/internal-export",
        headers={"X-Internal-Key": internal_key},
        timeout=60,
    )
    resp.raise_for_status()
    investors = resp.json()
    print(f"CRM returned {len(investors)} investors with emails")

    seen = set()
    targets, skipped_status, skipped_dupe = [], 0, 0
    for inv in investors:
        email = (inv.get("contact_email") or "").strip().lower()
        if not email or email in SKIP_EMAILS:
            continue
        if inv.get("status") in SKIP_STATUSES:
            skipped_status += 1
            continue
        if email in seen:
            skipped_dupe += 1
            continue
        seen.add(email)
        targets.append(inv)

    print(f"Targets: {len(targets)} (skipped {skipped_status} by status, {skipped_dupe} duplicates)")

    if args.limit:
        targets = targets[: args.limit]
        print(f"Limited to first {len(targets)}")

    if args.dry_run:
        already = sum(1 for t in targets if (t.get("email_send_count") or 0) > 0)
        fresh = len(targets) - already
        print(f"\nDRY RUN: would send to {len(targets)} investors")
        print(f"  {already} previously emailed (old template), {fresh} never emailed")
        subject, _, text = build_email(
            targets[0]["fund_name"], targets[0]["contact_name"], focus_line_for(targets[0])
        ) if targets else ("", "", "")
        print(f"\nSample -> {targets[0]['fund_name']} <{targets[0]['contact_email']}>")
        print(f"Subject: {subject}\n\n{text}")
        return

    attachment = deck_attachment()
    print(f"Deck attached: {attachment['filename']}")

    sent, failed, sent_log = 0, 0, []
    for i, inv in enumerate(targets):
        email_addr = inv["contact_email"].strip()
        fund = inv["fund_name"]
        subject, html, text = build_email(fund, inv.get("contact_name", ""), focus_line_for(inv))

        if i > 0:
            time.sleep(1.0)

        try:
            resend.Emails.send({
                "from": "Muse Ibrahim <invest@send.palmtai.com>",
                "to": [email_addr],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": "invest@palmtai.com",
                "attachments": [attachment],
            })
            sent += 1
            sent_log.append({"contact_email": email_addr, "subject": subject, "send_count": 1})
            print(f"  [{i+1}/{len(targets)}] SENT: {fund} -> {email_addr}")
        except Exception as e:
            failed += 1
            print(f"  [{i+1}/{len(targets)}] FAIL: {fund} -> {email_addr}: {str(e)[:80]}")
            time.sleep(2.0)

        if (i + 1) % 50 == 0:
            print(f"  --- Progress: {sent} sent, {failed} failed ---")

    print(f"\nDONE: {sent} sent, {failed} failed out of {len(targets)}")

    if sent_log:
        print("Marking sends in CRM...")
        for j in range(0, len(sent_log), 100):
            batch = sent_log[j : j + 100]
            try:
                r = requests.post(
                    f"{API_BASE}/platform/investors/batch-mark-sent",
                    headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                    json=batch,
                    timeout=60,
                )
                print(f"  batch {j//100 + 1}: HTTP {r.status_code} {r.text[:120]}")
            except Exception as e:
                print(f"  batch {j//100 + 1}: Error {e}")


if __name__ == "__main__":
    main()
