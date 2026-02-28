"""
Forward recent Resend inbound emails back to Gmail.

Only forwards emails received since Feb 17, 2026 (when MX was changed).
Deduplicates by email ID. Retries on rate limits.
"""

import os
import sys
import time
import requests
from datetime import datetime

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FORWARD_TO = "museibrahim@palmtai.com"
FROM_ADDRESS = "PalmCare AI <onboarding@resend.dev>"
CUTOFF_DATE = datetime(2026, 2, 17)
MAX_EMAILS = 2000
MAX_PAGES = 100

if not RESEND_API_KEY:
    print("ERROR: Set RESEND_API_KEY env var")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {RESEND_API_KEY}",
    "Content-Type": "application/json",
}
BASE = "https://api.resend.com"


def list_recent_emails():
    """List received emails, stopping at CUTOFF_DATE. Deduplicates by ID."""
    seen_ids = set()
    all_emails = []
    url = f"{BASE}/emails/receiving"
    page = 0
    last_id = None

    while page < MAX_PAGES and len(all_emails) < MAX_EMAILS:
        page += 1
        params = {"limit": 100}
        if last_id:
            params["after"] = last_id

        resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
        if resp.status_code == 429:
            print(f"  Rate limited on page {page}, waiting 2s...")
            time.sleep(2)
            page -= 1
            continue
        if resp.status_code != 200:
            print(f"  ERROR page {page}: {resp.status_code} {resp.text[:200]}")
            break

        data = resp.json()
        emails = data.get("data", [])
        if not emails:
            break

        new_count = 0
        for em in emails:
            eid = em.get("id")
            if eid in seen_ids:
                continue
            seen_ids.add(eid)

            created = em.get("created_at", "")
            try:
                dt = datetime.fromisoformat(created.replace("+00", "+00:00").split("+")[0])
            except Exception:
                dt = datetime.now()

            if dt < CUTOFF_DATE:
                print(f"  Reached emails before {CUTOFF_DATE.date()}, stopping.")
                return all_emails

            all_emails.append(em)
            new_count += 1

        last_id = emails[-1].get("id")
        print(f"  Page {page}: {len(emails)} fetched, {new_count} new (total unique: {len(all_emails)})")

        if not data.get("has_more"):
            break
        time.sleep(0.5)

    return all_emails


def get_email_content(email_id):
    for attempt in range(3):
        resp = requests.get(f"{BASE}/emails/receiving/{email_id}", headers=HEADERS, timeout=15)
        if resp.status_code == 429:
            time.sleep(2)
            continue
        if resp.status_code != 200:
            return None
        return resp.json()
    return None


def forward_email(email):
    subject = email.get("subject", "(no subject)")
    original_from = email.get("from", "unknown")
    original_to = ", ".join(email.get("to", []))
    created = email.get("created_at", "")

    html = email.get("html", "")
    text = email.get("text", "")

    fwd_header = (
        '<div style="padding:10px;margin-bottom:15px;border-bottom:2px solid #e5e7eb;'
        'color:#6b7280;font-size:13px;">'
        "<strong>--- Forwarded from Resend Inbound ---</strong><br>"
        f"<strong>From:</strong> {original_from}<br>"
        f"<strong>To:</strong> {original_to}<br>"
        f"<strong>Date:</strong> {created}<br>"
        f"<strong>Subject:</strong> {subject}"
        "</div>"
    )

    fwd_html = fwd_header + (html or f"<pre>{text}</pre>" or "<p>(empty)</p>")

    payload = {
        "from": FROM_ADDRESS,
        "to": [FORWARD_TO],
        "subject": f"[FWD] {subject}",
        "html": fwd_html,
    }

    for attempt in range(3):
        resp = requests.post(f"{BASE}/emails", headers=HEADERS, json=payload, timeout=15)
        if resp.status_code in (200, 201):
            return resp.json().get("id")
        if resp.status_code == 429:
            wait = 2 * (attempt + 1)
            print(f"  Rate limited, waiting {wait}s...")
            time.sleep(wait)
            continue
        print(f"  SEND ERROR: {resp.status_code} {resp.text[:200]}")
        return None
    print("  SEND ERROR: Max retries exceeded (rate limit)")
    return None


def main():
    print(f"Fetching emails since {CUTOFF_DATE.date()}...")
    emails = list_recent_emails()

    if not emails:
        print("\nNo recent emails found.")
        return

    print(f"\nFound {len(emails)} unique emails since {CUTOFF_DATE.date()}.")
    print(f"Forwarding to: {FORWARD_TO}\n")

    success = 0
    failed = 0

    for i, em in enumerate(emails, 1):
        subj = em.get("subject", "(no subject)")
        sender = em.get("from", "unknown")
        date = em.get("created_at", "")[:16]

        print(f"[{i}/{len(emails)}] {date} | {sender} | {subj[:60]}")

        full = get_email_content(em["id"])
        if not full:
            print("  -> SKIP (couldn't retrieve)")
            failed += 1
            continue

        fwd_id = forward_email(full)
        if fwd_id:
            print(f"  -> OK ({fwd_id[:12]}...)")
            success += 1
        else:
            failed += 1

        time.sleep(1.5)

    print(f"\nDone! Forwarded: {success}, Failed: {failed}")


if __name__ == "__main__":
    main()
