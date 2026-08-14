#!/usr/bin/env python3
"""Email Muse Mon–Fri engagement options for LinkedIn + Threads.

These are APPROVAL-ONLY. This script never posts.
Marketing posts stay in run_scheduled_posts.py.

Usage:
  python3 scripts/social/send_engagement_preview.py
  python3 scripts/social/send_engagement_preview.py --date 2026-08-18
  python3 scripts/social/send_engagement_preview.py --dry-run
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

from engagement_bank import ENGAGEMENT

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
load_dotenv(ROOT / ".env")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
FROM = "PALM Marketing <sales@send.palmtai.com>"
TO_DEFAULT = "museibrahim@palmtai.com,musajama89@gmail.com"
OFFERED_LOG = HERE / ".engagement_offered.json"
OPTIONS_PER_PLATFORM = 3


def load_offered() -> dict:
    if OFFERED_LOG.is_file():
        return json.loads(OFFERED_LOG.read_text())
    return {"offered_ids": [], "by_date": {}}


def save_offered(data: dict) -> None:
    OFFERED_LOG.write_text(json.dumps(data, indent=2))


def pick_options(date: str, n: int = OPTIONS_PER_PLATFORM) -> list[dict]:
    """Rotate through the bank, prefer ids not offered recently."""
    log = load_offered()
    offered = set(log.get("offered_ids", []))
    fresh = [row for row in ENGAGEMENT if row["id"] not in offered]
    pool = fresh if len(fresh) >= n else ENGAGEMENT
    # Stable day-based offset so re-runs same day stay consistent
    day_i = dt.date.fromisoformat(date).toordinal()
    start = (day_i * n) % len(pool)
    picks: list[dict] = []
    for k in range(len(pool)):
        row = pool[(start + k) % len(pool)]
        if row["id"] in {p["id"] for p in picks}:
            continue
        picks.append(row)
        if len(picks) >= n:
            break
    return picks


def esc(s: str) -> str:
    return html.escape(s).replace("\n", "<br>")


def build_html(date: str, picks: list[dict]) -> str:
    d = dt.date.fromisoformat(date)
    label = d.strftime("%A, %b %-d, %Y")
    li_blocks = ""
    th_blocks = ""
    letters = "ABC"
    for i, row in enumerate(picks):
        letter = letters[i]
        li_blocks += f"""
        <div style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 14px;overflow:hidden;">
          <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;">
            <strong>LinkedIn option {letter}</strong>
            <span style="color:#0d9488;margin-left:8px;">{html.escape(row['topic'])}</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:8px;">{html.escape(row['pillar'])} · {row['id']}</span>
          </div>
          <div style="padding:14px;font-size:14px;line-height:1.55;color:#334155;">{esc(row['linkedin'])}</div>
        </div>"""
        th_blocks += f"""
        <div style="border:1px solid #e2e8f0;border-radius:12px;margin:0 0 14px;overflow:hidden;">
          <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0;">
            <strong>Threads option {letter}</strong>
            <span style="color:#0d9488;margin-left:8px;">{html.escape(row['topic'])}</span>
            <span style="color:#94a3b8;font-size:12px;margin-left:8px;">{row['id']}</span>
          </div>
          <div style="padding:14px;font-size:14px;line-height:1.55;color:#334155;">{esc(row['threads'])}</div>
        </div>"""

    return f"""
    <div style="font-family:'Segoe UI',-apple-system,Arial,sans-serif;max-width:680px;margin:0 auto;color:#0f172a;">
      <h2 style="color:#0d9488;margin-bottom:6px;">Engagement picks for {label}</h2>
      <p style="font-size:14px;color:#475569;line-height:1.6;">
        Written in your voice. First person. Short. Home care specific.
        <strong>I will not post these unless you reply with what you want.</strong>
        Edit freely before I post. Kill anything that still sounds off.
      </p>
      <p style="font-size:14px;color:#475569;line-height:1.6;">
        Reply like this:<br>
        <code>LI: A</code> or <code>LI: A,C</code><br>
        <code>TH: B</code> or <code>TH: none</code><br>
        Optional: paste a rewrite and I will use your words.
      </p>
      <p style="font-size:13px;color:#64748b;line-height:1.5;">
        Product marketing creatives still auto-post on the Aug 14 to Sep 13 calendar.
        This email is only for LinkedIn and Threads conversation posts.
      </p>

      <h3 style="margin-top:28px;">LinkedIn options</h3>
      {li_blocks}

      <h3 style="margin-top:28px;">Threads options</h3>
      {th_blocks}

      <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
        Bank: scripts/social/engagement_bank.py · Sender: scripts/social/send_engagement_preview.py
      </p>
    </div>
    """


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD (default: today if weekday, else next Monday)")
    ap.add_argument("--to", default=TO_DEFAULT)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.date:
        date = args.date
    else:
        today = dt.date.today()
        if today.weekday() <= 4:
            date = today.isoformat()
        else:
            # Weekend: queue next Monday
            days = (7 - today.weekday()) % 7 or 7
            date = (today + dt.timedelta(days=days)).isoformat()

    weekday = dt.date.fromisoformat(date).weekday()
    if weekday > 4:
        print(f"{date} is not a weekday. Skipping.")
        return 0

    picks = pick_options(date)
    body = build_html(date, picks)

    out = Path("/Users/musaibrahim/Desktop/PalmCare Documents/Marketing/Sep-2026-traffic")
    out.mkdir(parents=True, exist_ok=True)
    html_path = out / f"engagement-preview-{date}.html"
    html_path.write_text(body)
    print("wrote", html_path)

    if args.dry_run:
        print("dry-run: not sending")
        for p in picks:
            print(p["id"], p["topic"])
        return 0

    if not RESEND_API_KEY:
        raise SystemExit("RESEND_API_KEY missing")

    subject = f"Engagement picks {date}: reply LI/TH letters to approve (I will not auto-post these)"
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": FROM,
            "to": [t.strip() for t in args.to.split(",") if t.strip()],
            "subject": subject,
            "html": body,
        },
        timeout=60,
    )
    print(r.status_code, r.text[:400])
    if r.status_code >= 300:
        return 1

    log = load_offered()
    ids = [p["id"] for p in picks]
    log.setdefault("offered_ids", [])
    for eid in ids:
        if eid not in log["offered_ids"]:
            log["offered_ids"].append(eid)
    log.setdefault("by_date", {})[date] = ids
    save_offered(log)
    print("logged offered", date, ids)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
