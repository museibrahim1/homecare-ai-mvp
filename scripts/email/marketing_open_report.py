#!/usr/bin/env python3
"""Morning marketing open-report.

Polls Resend for the new (Jul 2026) app-download marketing emails sent to home
care agencies, tallies how many were delivered / opened / clicked / bounced,
and emails a summary to Muse. Runs daily from GitHub Actions (see
.github/workflows/marketing-open-report.yml).

Only the 7 new marketing subjects are counted, so investor and transactional
mail never show up in the report. Reads RESEND_API_KEY from the environment
(the full-access key, which has read access to the emails list).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.request

RESEND_BASE = "https://api.resend.com"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PalmReport/1.0"

# The 7 new July marketing subjects. Anything not in this set (investor blasts,
# password resets, signup notices) is ignored.
MARKETING_SUBJECTS = {
    "stop typing what was already said out loud",
    "point your iPhone camera at this email",
    "a 7 second demo of your evenings coming back",
    "what would you do with Tuesday nights again",
    "the family signed before dinner",
    "try it on one visit, then decide",
    "PALM is on your App Store, download today",
}

REPORT_TO = "museibrahim@palmtai.com"
REPORT_FROM = "Muse Ibrahim <sales@palmcareai.com>"


def _req(path: str, key: str, method: str = "GET", body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{RESEND_BASE}{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("User-Agent", UA)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def _parse_ts(s: str) -> dt.datetime:
    # Resend returns e.g. "2026-07-14 03:31:56.971374+00"
    s = s.strip().replace(" ", "T", 1)
    if s.endswith("+00"):
        s = s[:-3] + "+00:00"
    try:
        return dt.datetime.fromisoformat(s)
    except ValueError:
        return dt.datetime.fromisoformat(s.split(".")[0] + "+00:00")


def collect(key: str, since: dt.datetime) -> list[dict]:
    """Page newest->oldest until we pass `since`; return marketing sends only."""
    out: list[dict] = []
    after: str | None = None
    pages = 0
    while pages < 200:
        pages += 1
        path = "/emails?limit=100" + (f"&after={after}" if after else "")
        page = _req(path, key)
        rows = page.get("data", []) if isinstance(page, dict) else []
        if not rows:
            break
        stop = False
        for row in rows:
            created = _parse_ts(row.get("created_at", ""))
            if created < since:
                stop = True
                continue
            if row.get("subject") in MARKETING_SUBJECTS:
                out.append(row)
        if stop or not page.get("has_more"):
            break
        after = rows[-1]["id"]
    return out


def build_report(rows: list[dict], since: dt.datetime) -> tuple[str, str]:
    tally: dict[str, int] = {}
    for r in rows:
        ev = (r.get("last_event") or "unknown").lower()
        tally[ev] = tally.get(ev, 0) + 1

    total = len(rows)
    opened = tally.get("opened", 0) + tally.get("clicked", 0)
    clicked = tally.get("clicked", 0)
    delivered = tally.get("delivered", 0) + opened
    bounced = tally.get("bounced", 0)
    suppressed = tally.get("suppressed", 0)
    open_rate = (opened / delivered * 100) if delivered else 0.0

    day = dt.datetime.now(dt.timezone.utc).strftime("%b %-d")
    subject = f"PALM marketing opens: {opened}/{delivered} opened as of 10 AM ({day})"

    def row(label: str, val: str) -> str:
        return (
            f'<tr><td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;color:#475569;">{label}</td>'
            f'<td style="padding:8px 14px;border-bottom:1px solid #e2e8f0;text-align:right;'
            f'font-weight:700;color:#0f172a;">{val}</td></tr>'
        )

    breakdown = "".join(
        row(k.title(), str(v)) for k, v in sorted(tally.items(), key=lambda kv: -kv[1])
    )

    html = f"""
<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
  <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px 24px;border-radius:12px 12px 0 0;">
    <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">Marketing email report</p>
    <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:12px;">
      New app-download emails to home care agencies since {since.strftime('%b %-d %-I:%M %p UTC')}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:22px 24px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      {row("Marketing emails sent", str(total))}
      {row("Delivered", str(delivered))}
      {row("Opened (incl. clicked)", f"{opened}  ({open_rate:.0f}%)")}
      {row("Clicked through", str(clicked))}
      {row("Bounced", str(bounced))}
      {row("Suppressed (prior bounce/complaint)", str(suppressed))}
    </table>
    <p style="margin:18px 0 6px;font-size:12px;color:#64748b;">Full status breakdown</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">{breakdown}</table>
    <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">
      Investor and transactional mail are excluded. Counts reflect Resend engagement events.</p>
  </div>
</div>
"""
    return subject, html


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since-hours", type=float, default=34.0,
                    help="Look-back window in hours (default covers last night's send).")
    ap.add_argument("--to", default=REPORT_TO)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        print("RESEND_API_KEY not set", file=sys.stderr)
        return 1

    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=args.since_hours)
    rows = collect(key, since)
    subject, html = build_report(rows, since)
    print(subject)

    if args.dry_run:
        print(f"[dry-run] would email {args.to}; {len(rows)} marketing sends in window")
        return 0

    resp = _req("/emails", key, method="POST", body={
        "from": REPORT_FROM,
        "to": [args.to],
        "subject": subject,
        "html": html,
    })
    print("report email id:", resp.get("id"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
