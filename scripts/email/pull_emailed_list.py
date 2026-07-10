#!/usr/bin/env python3
"""
Pull the exact list of agencies (and/or investors) we emailed in a window.

Calls the read-only backend endpoint
`GET /platform/sales/leads/internal/emailed-on` and prints a summary plus, if
asked, writes a CSV. The data lives in the production CRM (SalesLead /
Investor tables), which is the same source the admin Command Center reads.

Auth: set CRON_SECRET (or INTERNAL_API_KEY) in the environment.
API base: API_BASE_URL (defaults to the production Railway URL).

Examples:
    # Everyone emailed on Jul 9 (UTC), agencies only, save CSV
    python3 scripts/email/pull_emailed_list.py --date 2026-07-09 --audience agencies --csv emailed-2026-07-09.csv

    # Rolling last 48h, both audiences, print only
    python3 scripts/email/pull_emailed_list.py --since-hours 48 --audience both
"""

import argparse
import csv
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

DEFAULT_API_BASE = "https://api-production-a0a2.up.railway.app"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--date", help="Target one UTC calendar day (YYYY-MM-DD).")
    ap.add_argument("--since-hours", type=int, default=48,
                    help="Rolling window in hours (ignored when --date is set). Default 48.")
    ap.add_argument("--audience", default="both",
                    choices=["agencies", "investors", "both"])
    ap.add_argument("--csv", help="Write agencies to this CSV path.")
    args = ap.parse_args()

    api_base = os.getenv("API_BASE_URL", DEFAULT_API_BASE).rstrip("/")
    key = (os.getenv("CRON_SECRET") or os.getenv("INTERNAL_API_KEY") or "").strip()
    if not key:
        print("ERROR: set CRON_SECRET (or INTERNAL_API_KEY) in the environment.", file=sys.stderr)
        return 2

    params = {"audience": args.audience}
    if args.date:
        params["date"] = args.date
    else:
        params["since_hours"] = args.since_hours
    url = f"{api_base}/platform/sales/leads/internal/emailed-on?" + urllib.parse.urlencode(params)

    req = urllib.request.Request(url, headers={"X-Internal-Key": key})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode(errors='replace')}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 1

    agencies = out.get("agencies", [])
    investors = out.get("investors", [])
    win = out.get("window", {})
    print(f"Window: {win.get('start')} .. {win.get('end')} "
          f"(date={win.get('date')}, since_hours={win.get('since_hours')})")
    print(f"Agencies emailed: {out.get('agency_count', len(agencies))}")
    print(f"Investors emailed: {out.get('investor_count', len(investors))}")
    print()

    for a in agencies:
        print(f"  {a.get('provider_name','?'):<44} {a.get('state') or '':<3} "
              f"{a.get('contact_email','')}  [{a.get('last_template_sent') or a.get('status') or ''}]")
    if investors:
        print()
        for i in investors:
            print(f"  (investor) {i.get('fund_name','?'):<36} {i.get('contact_email','')}")

    if args.csv and agencies:
        fields = ["provider_name", "contact_name", "contact_email", "city", "state",
                  "status", "email_send_count", "last_email_sent_at",
                  "last_email_subject", "last_template_sent", "campaign_tag"]
        with open(args.csv, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for a in agencies:
                w.writerow({k: a.get(k, "") for k in fields})
        print(f"\nWrote {len(agencies)} agencies to {args.csv}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
