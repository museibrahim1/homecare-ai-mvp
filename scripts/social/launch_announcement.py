#!/usr/bin/env python3
"""One-shot App Store launch announcement (Jul 10, 2026).

Posts the launch set to every platform we have API access to:

  Facebook  -> launch video (full product reel, uploaded directly)
  Instagram -> launch Reel (same video, ingested from a public URL)
  Threads   -> launch video post + the App Store link in the text
  LinkedIn  -> launch image post, App Store link in the first comment

Runs from GitHub Actions (the repo secrets hold the tokens). Every post is
recorded in scripts/social/.launch_posted.json keyed by post id, so re-runs
only retry the posts that have not succeeded yet and never double-post.

Manual usage:
  python3 scripts/social/launch_announcement.py --dry-run
  python3 scripts/social/launch_announcement.py
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from post_to_meta import (  # noqa: E402
    fb_post_video,
    ig_publish_reel,
    threads_post,
    require_env as require_meta_env,
)
from post_to_linkedin import (  # noqa: E402
    post_image as li_post_image,
    require_env as require_li_env,
)

LOG_FILE = HERE / ".launch_posted.json"

APP_STORE_URL = "https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988"

# Public media URL (Instagram and Threads can only ingest from a public https
# URL). jsDelivr serves repo files with correct MIME types; the reel is on main.
JSD = "https://cdn.jsdelivr.net/gh/museibrahim1/homecare-ai-mvp"
LAUNCH_VIDEO_URL = f"{JSD}@main/videos/output/palmcare-reel-v2-with-audio.mp4"

# Local files (Facebook and LinkedIn take direct uploads).
REPO = HERE.parents[1]
LAUNCH_VIDEO_LOCAL = REPO / "videos/output/palmcare-reel-v2-with-audio.mp4"
LAUNCH_IMAGE_LOCAL = REPO / "apps/web/public/marketing/social/launch-appstore-feed.png"

META_CAPTION = f"""PALM is live on the App Store. \U0001F334

Our iPhone app for home care agencies is out today. Record the care assessment on your phone. PALM writes the transcript, the care plan, the billables, and a service agreement that follows your state's rules. Assessments, care plans, and contracts done in minutes, not days.

Download it today and run your next assessment through it:
{APP_STORE_URL}

Free to download. Start on your next visit.
#homecare #homecareagency #caregiver #healthtech #AppStore"""

THREADS_CAPTION = f"""PALM is live on the App Store. \U0001F334

Record the care assessment. The transcript, care plan, billables, and state-specific contract write themselves. Minutes, not days.

Free to download today: {APP_STORE_URL}"""

LINKEDIN_BODY = """PALM is live on the App Store today.

We started with one observation. Every care assessment is already documented out loud, by the people in the room. Then somebody retypes all of it at a keyboard that evening.

So we built the app that listens. Record the assessment on your iPhone. PALM writes the transcript, identifies who said what, extracts the billables, drafts the clinical note, and writes a service agreement that follows your state's home care rules. You review and send. Assessments, care plans, and contracts finished in minutes, not days.

It is free to download. Search "PALM Home Care Contracts" on the App Store, or use the link in the comments. If you run a home care agency, put it on one real visit today and see what comes back."""

LINKEDIN_COMMENT = f"Download PALM on the App Store: {APP_STORE_URL}"


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.dry_run:
        print("DRY RUN. Would post:")
        print(f"  FB video   : {LAUNCH_VIDEO_LOCAL} (exists={LAUNCH_VIDEO_LOCAL.is_file()})")
        print(f"  IG reel    : {LAUNCH_VIDEO_URL}")
        print(f"  Threads    : video {LAUNCH_VIDEO_URL}")
        print(f"  LinkedIn   : {LAUNCH_IMAGE_LOCAL} (exists={LAUNCH_IMAGE_LOCAL.is_file()})")
        print("--- Meta caption ---\n" + META_CAPTION)
        print("--- Threads caption ---\n" + THREADS_CAPTION)
        print("--- LinkedIn body ---\n" + LINKEDIN_BODY)
        print("--- LinkedIn first comment ---\n" + LINKEDIN_COMMENT)
        return 0

    log = load_log()
    failures = []

    def step(key: str, fn):
        if key in log:
            print(f"{key}: already posted ({log[key]}), skipping.")
            return
        try:
            res = fn()
            log[key] = res
            save_log(log)
            print(f"{key} OK: {res}")
        except Exception as e:  # keep going; retry failed steps on re-run
            failures.append(key)
            print(f"{key} FAILED: {e}", file=sys.stderr)

    require_meta_env()
    step("fb_video", lambda: fb_post_video(str(LAUNCH_VIDEO_LOCAL), META_CAPTION))
    step("ig_reel", lambda: ig_publish_reel(LAUNCH_VIDEO_URL, META_CAPTION))
    step("threads_video", lambda: threads_post(THREADS_CAPTION, video=LAUNCH_VIDEO_URL))

    require_li_env()
    step("linkedin_image", lambda: li_post_image(LINKEDIN_BODY, str(LAUNCH_IMAGE_LOCAL), LINKEDIN_COMMENT))

    if failures:
        print(f"\nIncomplete: {', '.join(failures)} failed. Re-run to retry just those.", file=sys.stderr)
        return 1
    print("\nLaunch announcement posted everywhere. \U0001F334")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
