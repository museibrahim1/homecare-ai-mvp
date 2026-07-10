#!/usr/bin/env python3
"""
Resend the App Store launch email to everyone we emailed recently.

This calls the backend internal endpoint
`POST /platform/sales/leads/internal/resend-launch`, which finds the leads
(and optionally investors) whose last outreach email went out in the target
window and sends them the `app_live_launch` announcement.

The actual send happens server-side on Railway (using the backend's own
RESEND_API_KEY), so this script only needs the internal key to authenticate.

Auth: set CRON_SECRET (or INTERNAL_API_KEY) in the environment.
API base: API_BASE_URL (defaults to the production Railway URL).

Safe by default: runs as a DRY RUN unless you pass --send.

Examples:
    # Preview who would be emailed for yesterday's cohort
    python3 scripts/email/resend_launch_to_yesterday.py --date 2026-07-09

    # Actually send to everyone emailed in the last 48h
    python3 scripts/email/resend_launch_to_yesterday.py --since-hours 48 --send
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

DEFAULT_API_BASE = "https://api-production-a0a2.up.railway.app"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--date", help="Target one UTC calendar day (YYYY-MM-DD).")
    ap.add_argument("--since-hours", type=int, default=48,
                    help="Rolling window in hours (ignored when --date is set). Default 48.")
    ap.add_argument("--audience", default="agencies",
                    choices=["agencies", "investors", "both"], help="Who to resend to.")
    ap.add_argument("--campaign-name", default="app-store-launch-2026-07")
    ap.add_argument("--template-id", default="app_live_launch")
    ap.add_argument("--limit", type=int, default=None, help="Safety cap on number of sends.")
    ap.add_argument("--send", action="store_true",
                    help="Actually send. Without this flag the call is a dry run.")
    args = ap.parse_args()

    api_base = os.getenv("API_BASE_URL", DEFAULT_API_BASE).rstrip("/")
    key = (os.getenv("CRON_SECRET") or os.getenv("INTERNAL_API_KEY") or "").strip()
    if not key:
        print("ERROR: set CRON_SECRET (or INTERNAL_API_KEY) in the environment.", file=sys.stderr)
        return 2

    payload = {
        "audience": args.audience,
        "campaign_name": args.campaign_name,
        "template_id": args.template_id,
        "dry_run": not args.send,
    }
    if args.date:
        payload["date"] = args.date
    else:
        payload["since_hours"] = args.since_hours
    if args.limit is not None:
        payload["limit"] = args.limit

    url = f"{api_base}/platform/sales/leads/internal/resend-launch"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json", "X-Internal-Key": key},
    )

    mode = "SEND" if args.send else "DRY RUN"
    print(f"[{mode}] POST {url}")
    print(f"        payload: {json.dumps({k: v for k, v in payload.items()})}")

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            out = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Request failed: {e}", file=sys.stderr)
        return 1

    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
