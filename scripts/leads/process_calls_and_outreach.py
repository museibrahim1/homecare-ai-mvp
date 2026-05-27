#!/usr/bin/env python3
"""
Process today's phone calls, send outreach emails, and start sequences.

Extracted from Muse's phone call log and notes (March 11, 2026).
Uses production API internal endpoints with cron key auth.
"""

import json
import os
import sys
import requests
from datetime import datetime

API_BASE = "https://api-production-a0a2.up.railway.app"
HEADERS = {"X-Internal-Key": os.getenv("CRON_SECRET", ""), "Content-Type": "application/json"}


def mark_calls():
    """Mark all phone calls from today's call log as completed in the CRM."""
    calls = [
        {"phone": "(386) 265-0012", "notes": "Called - outreach"},
        {"phone": "(813) 605-9809", "notes": "Called - Tampa, FL outreach"},
        {"phone": "(813) 922-2660", "notes": "Called - Sun City Center, FL outreach"},
        {"phone": "(561) 557-1003", "notes": "Called - outreach"},
        {"phone": "(954) 258-5176", "notes": "Called - Fort Lauderdale, FL outreach"},
        {"phone": "(305) 877-4348", "notes": "Called - Miami, FL outreach"},
        {"phone": "(352) 432-5398", "notes": "Called - Clermont, FL outreach"},
        {"phone": "(941) 909-6101", "notes": "Called - Bradenton, FL outreach"},
        {"phone": "(813) 400-0324", "notes": "Called - Tampa, FL outreach"},
        {"phone": "(813) 690-1212", "notes": "Called - outreach"},
        {"phone": "(305) 615-1768", "notes": "Called - Marathon, FL outreach"},
        {"phone": "(813) 968-1494", "notes": "Called - Tampa, FL outreach"},
        {"phone": "(727) 623-0394", "notes": "Called - Saint Petersburg, FL outreach (x2)"},
        {"phone": "(302) 264-9363", "notes": "Called - outreach"},
        {"phone": "(631) 749-5431", "notes": "Called - Shelter Island, NY outreach"},
        {"phone": "(203) 919-6641", "notes": "Called - Norwalk, CT outreach"},
        {"phone": "(203) 489-0919", "notes": "Called - Greenwich, CT outreach (x3)"},
    ]

    # Also add contact info we gathered from calls
    calls_with_contacts = [
        {
            "phone": "(386) 265-0012",
            "notes": "Called - outreach",
            "contact_name": "Lordina",
            "contact_email": "angela.berko@mcangelnurses.com",
        },
    ]

    print(f"\n{'='*60}")
    print(f"MARKING {len(calls)} PHONE CALLS AS COMPLETED")
    print(f"{'='*60}\n")

    resp = requests.post(
        f"{API_BASE}/platform/outreach/cron/bulk-mark-called",
        headers=HEADERS,
        json=calls,
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"  Marked: {data.get('marked', 0)}")
        print(f"  Not found: {data.get('not_found', 0)}")
        for r in data.get("results", []):
            status_icon = "+" if r["status"] == "marked" else "?"
            name = r.get("provider_name", "—")
            print(f"    [{status_icon}] {r['phone']} → {name} ({r['status']})")
    else:
        print(f"  ERROR: {resp.status_code} — {resp.text}")

    return resp


def add_leads_and_send_emails():
    """Add new leads from phone call notes and send outreach emails."""
    new_leads = [
        {
            "provider_name": "McAngel Nurses",
            "state": "FL",
            "city": "",
            "contact_name": "Lordina / Angela Berko",
            "contact_email": "angela.berko@mcangelnurses.com",
            "notes": "[2026-03-11] Phone call with Lordina. Send information. Expect a call back.",
            "send_email": True,
            "campaign_name": "phone-outreach-mar-2026",
        },
        {
            "provider_name": "Doctors Preferred Healthcare",
            "state": "FL",
            "city": "Houston",
            "contact_name": "Sebrina Houston",
            "contact_email": "info@doctorspreferredhealthcare.com",
            "notes": "[2026-03-11] Phone call with Sebrina Houston. Email her the information.",
            "send_email": True,
            "campaign_name": "phone-outreach-mar-2026",
        },
        {
            "provider_name": "Paradis HS Home Health",
            "state": "FL",
            "city": "",
            "contact_name": "Ms Donaldson",
            "contact_email": "phha@paradishs.com",
            "notes": "[2026-03-11] Phone call with Ms Donaldson. Send information.",
            "send_email": True,
            "campaign_name": "phone-outreach-mar-2026",
        },
        {
            "provider_name": "Empower / Healthy Home Primary",
            "state": "FL",
            "city": "",
            "contact_name": "Courtney Crane",
            "contact_email": "ccrane@healthyhomeprimary.com",
            "notes": "[2026-03-11] Phone call with Courtney at Empower. Send information.",
            "send_email": True,
            "campaign_name": "phone-outreach-mar-2026",
        },
        {
            "provider_name": "Lucent Healthcare",
            "state": "FL",
            "city": "",
            "contact_name": "Ivad",
            "contact_email": "info@lucenthealthcare.com",
            "notes": "[2026-03-11] Phone call with Ivad. Send info.",
            "send_email": True,
            "campaign_name": "phone-outreach-mar-2026",
        },
    ]

    print(f"\n{'='*60}")
    print(f"ADDING {len(new_leads)} LEADS AND SENDING OUTREACH EMAILS")
    print(f"{'='*60}\n")

    resp = requests.post(
        f"{API_BASE}/platform/sales/leads/internal/add-and-email",
        headers=HEADERS,
        json=new_leads,
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"  Total: {data.get('total', 0)}")
        print(f"  Sent: {data.get('sent', 0)}")
        for r in data.get("results", []):
            icon = "+" if r["status"] == "sent" else "!" if "fail" in r["status"] else "-"
            print(f"    [{icon}] {r['provider_name']} → {r['email']} ({r['status']})")
    else:
        print(f"  ERROR: {resp.status_code} — {resp.text}")

    return resp


def start_recent_sequences():
    """Start email sequences for all agencies emailed in the last 2 days."""
    print(f"\n{'='*60}")
    print("STARTING EMAIL SEQUENCES FOR RECENTLY EMAILED AGENCIES")
    print(f"{'='*60}\n")

    resp = requests.post(
        f"{API_BASE}/platform/sales/leads/internal/start-recent-sequences?days=2&campaign_name=cold-outreach-mar-2026",
        headers=HEADERS,
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"  Started: {data.get('started', 0)}")
        print(f"  Checked: {data.get('total_checked', 0)}")
        print(f"  Message: {data.get('message', '')}")
    else:
        print(f"  ERROR: {resp.status_code} — {resp.text}")

    return resp


def main():
    print("\n" + "=" * 60)
    print(f"PalmCare AI — Outreach Script — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)

    # Step 1: Mark all phone calls as completed
    mark_calls()

    # Step 2: Add new leads from notes and send emails
    add_leads_and_send_emails()

    # Step 3: Start sequences for all recently emailed agencies
    start_recent_sequences()

    print(f"\n{'='*60}")
    print("ALL TASKS COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
