#!/usr/bin/env python3
"""Natively schedule the approved Facebook posts into Meta Business Suite.

Why this exists: our day-of runner posts through the API on the day itself, so
Meta Business Suite's Planner shows nothing "scheduled". Facebook (unlike IG and
Threads) DOES let you schedule a post through the Graph API with
`published=false` + `scheduled_publish_time`. Those posts then appear in Meta
Business Suite's Planner and publish on their own, even if this Mac is asleep.

This reads the same approved caption/creative map from run_scheduled_posts.META,
schedules each future Meta date's Facebook photo at 11:30 local time, and records
what it scheduled in .scheduled_fb.json so it never double-schedules.

Usage:
  python3 scripts/social/schedule_meta_fb.py --dry-run    # show what it would schedule
  python3 scripts/social/schedule_meta_fb.py              # schedule everything future
  python3 scripts/social/schedule_meta_fb.py --hour 11 --minute 30
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from run_scheduled_posts import META, SIGNUP  # noqa: E402
from post_to_meta import (  # noqa: E402
    GRAPH,
    PAGE_ID,
    PAGE_TOKEN,
    resolve_local,
    public_url_for,
    require_env,
    _check,
)

SCHED_LOG = HERE / ".scheduled_fb.json"
# Facebook requires scheduled_publish_time to be 10 min .. 6 months in the future.
MIN_LEAD_MIN = 15


def load_log() -> dict:
    if SCHED_LOG.is_file():
        return json.loads(SCHED_LOG.read_text())
    return {}


def save_log(log: dict) -> None:
    SCHED_LOG.write_text(json.dumps(log, indent=2))


def when(date: str, hour: int, minute: int) -> dt.datetime:
    y, m, d = (int(x) for x in date.split("-"))
    return dt.datetime(y, m, d, hour, minute)  # local time


def schedule_fb(image: str, caption: str, publish_ts: int) -> dict:
    """Create an unpublished, scheduled Facebook photo post."""
    data = {
        "caption": caption,
        "published": "false",
        "scheduled_publish_time": str(publish_ts),
        "access_token": PAGE_TOKEN,
    }
    local = resolve_local(image)
    if local is not None:
        with open(local, "rb") as fh:
            r = requests.post(
                f"{GRAPH}/{PAGE_ID}/photos", data=data, files={"source": fh}, timeout=300
            )
    else:
        data["url"] = public_url_for(image)
        r = requests.post(f"{GRAPH}/{PAGE_ID}/photos", data=data, timeout=120)
    return _check(r, "FB schedule photo")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hour", type=int, default=11)
    ap.add_argument("--minute", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    require_env()
    log = load_log()
    now = dt.datetime.now()
    cutoff = now + dt.timedelta(minutes=MIN_LEAD_MIN)

    scheduled, skipped = 0, 0
    for date in sorted(META):
        image, caption = META[date]
        caption = caption.format(s=SIGNUP)
        run_at = when(date, args.hour, args.minute)
        if run_at < cutoff:
            print(f"{date}: too soon / in the past ({run_at:%Y-%m-%d %H:%M}). Skipping.")
            skipped += 1
            continue
        if date in log:
            print(f"{date}: already scheduled ({log[date].get('id')}). Skipping.")
            skipped += 1
            continue
        ts = int(run_at.timestamp())
        if args.dry_run:
            print(f"{date}: WOULD schedule {image} for {run_at:%a %Y-%m-%d %H:%M} (ts {ts})")
            scheduled += 1
            continue
        res = schedule_fb(image, caption, ts)
        pid = res.get("post_id") or res.get("id")
        log[date] = {"id": pid, "image": image, "publish_ts": ts, "publish_local": run_at.isoformat()}
        save_log(log)
        print(f"{date}: scheduled FB post {pid} for {run_at:%a %Y-%m-%d %H:%M}")
        scheduled += 1

    print(f"\nDone. scheduled={scheduled} skipped={skipped}")
    print("View them in Meta Business Suite > Planner (or Page > Publishing Tools > Scheduled Posts).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
