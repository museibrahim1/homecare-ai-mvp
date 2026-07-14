#!/usr/bin/env python3
"""
Wave 2: Load new investors from wave2_investors.json,
add to CRM via batch-import, and save emails as DRAFTS (no sending).
"""

import os
import sys
import json
import uuid
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_BASE = "https://api-production-a0a2.up.railway.app"
PITCH_DECK_URL = "https://palmcareai.com/PalmCare_Deck_v5.pdf"
DATA_DIR = PROJECT_ROOT / "scripts" / "data"
DRAFTS_DIR = Path.home() / ".palmcare" / "email-drafts"

SKIP_EMAILS = {
    "jamie@thecreatorfund.com",
}


sys.path.insert(0, str(Path(__file__).resolve().parent))
from email_template import build_email as build_template_email


def build_email(fund_name, contact_name):
    return build_template_email(fund_name, contact_name)


def main():
    internal_key = os.getenv("CRON_SECRET", "")

    json_path = DATA_DIR / "wave2_investors.json"
    if not json_path.exists():
        print(f"ERROR: {json_path} not found")
        sys.exit(1)

    with open(json_path) as f:
        investors = json.load(f)

    investors = [inv for inv in investors if inv.get("contact_email")]
    investors = [inv for inv in investors if inv["contact_email"].lower().strip() not in SKIP_EMAILS]
    print(f"Loaded {len(investors)} investors (after skipping blocked emails)")

    # ── Step 1: Add to CRM ──
    print(f"\n{'='*60}")
    print(f"STEP 1: Adding {len(investors)} investors to CRM")
    print(f"{'='*60}")

    if internal_key:
        batch_size = 50
        total_added = 0
        total_skipped = 0
        for i in range(0, len(investors), batch_size):
            batch = investors[i:i+batch_size]
            crm_batch = []
            for inv in batch:
                crm_batch.append({
                    "fund_name": inv["fund_name"],
                    "investor_type": inv.get("investor_type", "vc_fund"),
                    "website": inv.get("website", ""),
                    "description": inv.get("description", ""),
                    "focus_sectors": inv.get("focus_sectors", ["Technology", "Healthcare", "AI", "SaaS"]),
                    "focus_stages": inv.get("focus_stages", ["Seed"]),
                    "check_size_display": inv.get("check_size_display", ""),
                    "location": inv.get("location", ""),
                    "contact_name": inv.get("contact_name", ""),
                    "contact_email": inv.get("contact_email", ""),
                    "contact_title": inv.get("contact_title", ""),
                    "relevance_reason": inv.get("relevance_reason", inv.get("description", "")),
                    "priority": inv.get("priority", "medium"),
                    "source": "web_research_wave2_mar2026",
                })
            try:
                resp = requests.post(
                    f"{API_BASE}/platform/investors/batch-import",
                    headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                    json=crm_batch,
                    timeout=30,
                )
                if resp.status_code in (200, 201):
                    result = resp.json()
                    a = result.get("added", 0)
                    s = result.get("skipped", 0)
                    total_added += a
                    total_skipped += s
                    print(f"  Batch {i//batch_size + 1}: {a} added, {s} skipped")
                else:
                    print(f"  Batch {i//batch_size + 1}: HTTP {resp.status_code} - {resp.text[:200]}")
            except Exception as e:
                print(f"  Batch {i//batch_size + 1}: Error - {e}")

        print(f"\n  CRM totals: {total_added} added, {total_skipped} skipped")
    else:
        print("  CRON_SECRET not set — skipping CRM import")

    # ── Step 2: Save as drafts (NO sending) ──
    print(f"\n{'='*60}")
    print(f"STEP 2: Saving {len(investors)} email DRAFTS")
    print(f"{'='*60}")

    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    saved = 0

    for i, inv in enumerate(investors):
        email_addr = inv.get("contact_email", "")
        fund = inv["fund_name"]

        if not email_addr:
            continue

        subject, html, text = build_email(fund, inv.get("contact_name", ""))

        lead_id = str(uuid.uuid4())
        draft_id = f"investor_{lead_id}"

        draft = {
            "id": draft_id,
            "lead_type": "investor",
            "lead_id": lead_id,
            "lead_name": fund,
            "to_email": email_addr,
            "to_name": inv.get("contact_name", ""),
            "subject": subject,
            "body_text": text,
            "body_html": html,
            "status": "pending_review",
            "created_at": datetime.now().isoformat(),
            "approved_at": None,
            "sent_at": None,
        }

        filepath = DRAFTS_DIR / f"{draft_id}.json"
        filepath.write_text(json.dumps(draft, indent=2))
        saved += 1

        if (i + 1) % 50 == 0:
            print(f"  --- {saved} drafts saved ---")

    print(f"\n  {saved} email drafts saved to {DRAFTS_DIR}")
    print(f"  Review drafts manually in that directory and send via your preferred email tool.")

    print(f"\n{'='*60}")
    print(f"DONE: {saved} investors added to CRM + emails saved as drafts")
    print(f"NO emails were sent.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
