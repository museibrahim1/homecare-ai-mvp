#!/usr/bin/env python3
"""One-off marketing image posts (Aug 14, 2026 package): LinkedIn + Threads.

Two posts, separate from the scheduled calendar runner:
  1. Foundations angle  (Empire State vs Millennium Tower split image)
  2. Sales speed angle  (app overview screenshot, processing pipeline complete)

Runs in GitHub Actions (marketing-posts.yml) where the LinkedIn and Threads
secrets live. Dedupes per post id in .marketing_posted.json so re-runs are safe.

Manual usage:
  python3 scripts/social/post_marketing_package.py --dry-run
  python3 scripts/social/post_marketing_package.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from post_to_linkedin import post_image as li_post_image, require_env as require_li_env  # noqa: E402
from post_to_meta import threads_post  # noqa: E402

LOG_FILE = HERE / ".marketing_posted.json"

# Threads can only ingest media from a public https URL. The assets are
# committed to the repo (public), so raw.githubusercontent.com serves them
# with the correct image/png content type. Pin to the exact commit in CI.
_REF = os.getenv("GITHUB_SHA") or "main"
RAW_BASE = f"https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/{_REF}/apps/web/public/marketing/social"

POSTS = [
    {
        "id": "2026-08-14-foundations",
        "image": "apps/web/public/marketing/social/post-foundations-buildings.png",
        "caption": (
            "One building has stood for almost a century. The other has been "
            "sinking since before it opened. The difference was never money. "
            "It was the foundation. Palm builds your agency's foundation right "
            "the first time. Record the assessment, get the care plan, the "
            "billables, and the contract, same day, built to last. Book a demo "
            "at palmcareai.com"
        ),
    },
    {
        "id": "2026-08-14-sales-speed",
        "image": "apps/web/public/marketing/social/post-sales-speed-overview-4x5.png",
        "caption": (
            "Home care agencies do not lose clients because of bad care. They "
            "lose clients because somebody else signed the contract first. "
            "Every hour between the assessment and the contract is an hour a "
            "competitor can close that family instead. Palm gets you from "
            "assessment to signed contract the same day, so you start the "
            "sales conversation while it is still hot, not tomorrow, not next "
            "week. Book a demo at palmcareai.com"
        ),
    },
]


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    log = load_log()
    failures = 0
    for post in POSTS:
        pid = post["id"]
        image = post["image"]
        caption = post["caption"]
        threads_url = f"{RAW_BASE}/{Path(image).name}"
        done: dict = log.get(pid, {})

        if args.dry_run:
            print(f"{pid}: WOULD post to LinkedIn + Threads")
            print(f"  image      : {image}")
            print(f"  threads url: {threads_url}")
            print(f"  caption    : {caption}\n")
            continue

        if "linkedin" not in done:
            try:
                require_li_env()
                res = li_post_image(caption, image)
                done["linkedin"] = res.get("post_urn")
                print(f"{pid}: LinkedIn OK {done['linkedin']}")
            except Exception as e:
                failures += 1
                print(f"{pid}: LinkedIn FAILED: {e}", file=sys.stderr)
        else:
            print(f"{pid}: LinkedIn already posted ({done['linkedin']}), skipping")

        if "threads" not in done:
            try:
                res = threads_post(caption, image=threads_url)
                done["threads"] = res.get("id")
                print(f"{pid}: Threads OK {done['threads']}")
            except Exception as e:
                failures += 1
                print(f"{pid}: Threads FAILED: {e}", file=sys.stderr)
        else:
            print(f"{pid}: Threads already posted ({done['threads']}), skipping")

        if done:
            log[pid] = done
            save_log(log)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
