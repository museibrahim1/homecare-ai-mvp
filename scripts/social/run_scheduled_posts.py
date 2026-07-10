#!/usr/bin/env python3
"""Daily runner for the approved Jul 13 - Aug 9 social plan.

Run once a day (launchd/cron). It looks up today's date in SCHEDULE; if there is
a Meta post due and it hasn't been posted yet, it publishes to Facebook + Instagram
via post_to_meta and records it in scripts/social/.posted_log.json so it never
double-posts. LinkedIn days are skipped (token expired — manual/copy-paste until re-auth).

Manual usage:
  python3 scripts/social/run_scheduled_posts.py            # post whatever is due today
  python3 scripts/social/run_scheduled_posts.py --date 2026-07-13   # force a date
  python3 scripts/social/run_scheduled_posts.py --dry-run  # show what would post
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from post_to_meta import fb_post_photo, ig_publish_image, require_env  # noqa: E402

LOG_FILE = HERE / ".posted_log.json"
SIGNUP = "palmcareai.com/register"

# date -> (platform, image, caption). Meta posts only; LinkedIn handled manually.
SCHEDULE = {
    "2026-07-13": ("meta", "w1-imsg-contract.png",
        "The group chat when the contract goes out before lunch \U0001F334\n\n\"Already sent it\" is a real thing now. PALM listens to the assessment, writes the notes and billables, and drafts the state-compliant agreement while you drive to the next visit. You read it, you hit send.\n\nStart free, no card: {s}\n#homecare #homecareagency #privateduty #healthtech"),
    "2026-07-15": ("meta", "w1-phone-record.png",
        "This screen replaces your clipboard.\n\nPress record at the assessment. PALM writes the transcript, the care plan, the billables, and the contract. That's the actual app \u2014 no forms, no double entry.\n\nTry it on one visit and see: {s}\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    "2026-07-17": ("meta", "w1-receipt-tuesday.png",
        "We itemized your Tuesday. \U0001F9FE\n\nThree hours of after-visit paperwork per assessment \u2014 retyping what was already said in the living room. PALM's total for the same work: zero minutes. Time refunded.\n\nWhich line item hurts the most? Tell us below.\n\nStart free, no card: {s}\n#homecare #homecareagency #caregiverlife"),
    "2026-07-20": ("meta", "w2-notifications.png",
        "You drove home. PALM kept working. \U0001F4F2\n\n4:12 \u2014 transcript ready. 4:13 \u2014 care plan drafted, billables priced. 4:14 \u2014 service agreement ready for review. All from the recording you made during the visit.\n\nStart free, no card: {s}\n#homecare #healthtech #privateduty"),
    "2026-07-22": ("meta", "w2-phone-contract.png",
        "The contract writes itself. This is the actual screen.\n\n$34/hr, 28 hours, 6 services \u2014 pulled straight from what the family said during the assessment, in a state-compliant agreement. You review, you send, they sign.\n\nTry it free: {s}\n#homecare #homecareagency #healthcareAI"),
    "2026-07-24": ("meta", "w3-stickynote.png",
        "Note to self \U0001F4DD\n\nStop writing contracts at 9pm on the couch. Let the app that heard the visit write them.\n\nTag someone who's still doing their charting after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #nurselife"),
    "2026-07-27": ("meta", "w3-fill-blank.png",
        "Finish the sentence \U0001F447\n\n\"If I never had to type another visit note, I would finally ______.\"\n\nSleep? Grow the agency? Make it to the 6pm game? Drop yours in the comments \u2014 best answer gets pinned.\n\nThen make it real: {s}\n#homecare #homecareagency #caregiver"),
    "2026-07-29": ("meta", "w4-pov-home.png",
        "POV: the visit ended two minutes ago. \u2705\n\nNotes done. Billables done. Contract drafted. You haven't even started the car.\n\nStart free, no card: {s}\n#homecare #POV #caregiverlife #healthtech"),
    "2026-07-31": ("meta", "w4-states.png",
        "50 states. 50 different rule books. One draft that follows yours. \U0001F1FA\U0001F1F8\n\nPALM's service agreements are built on the contract rules of the state you operate in \u2014 not a generic template with your logo pasted on top.\n\nStart free, no card: {s}\n#homecare #homecareagency #compliance"),
    "2026-08-03": ("meta", "w4-sunday-split.png",
        "Sunday, 9:14 PM. Two versions of you.\n\nOne has a laptop open, cold coffee, and three visit notes left. The other one's paperwork was drafted before they left the driveway.\n\nWhich Sunday are you having? Be honest \U0001F447\n\nStart free, no card: {s}\n#homecare #sundayscaries #caregiverlife"),
    "2026-08-05": ("meta", "w4-phone-billables.png",
        "\"Oh, and she needs help with meals.\"\n\nSaid once, in passing, at minute 34 of the assessment. The old way, it never makes the invoice. PALM hears it, prices it, and puts it in the agreement \u2014 this is the real billables screen.\n\nStop losing billables you already earned: {s}\n#homecare #homecarebilling #agencyowner"),
    "2026-08-07": ("meta", "w2-poll-evenings.png",
        "We asked home care admins what actually eats their evenings. 68% said the same thing. \U0001F5F3\uFE0F\n\nNot scheduling. Not family calls. Post-visit paperwork \u2014 the retyping of a conversation that already happened.\n\nIs it the same at your agency? Tell us what's #1 for you.\n\nThen take it off the list: {s}\n#homecare #homecareagency #poll"),
}


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD (default: today)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    date = args.date or dt.date.today().isoformat()
    entry = SCHEDULE.get(date)
    if entry is None:
        print(f"{date}: no Meta post scheduled. Nothing to do.")
        return 0

    _, image, caption = entry
    caption = caption.format(s=SIGNUP)

    log = load_log()
    if date in log:
        print(f"{date}: already posted ({log[date]}). Skipping.")
        return 0

    if args.dry_run:
        print(f"{date}: WOULD post {image} to FB + IG:\n---\n{caption}\n---")
        return 0

    require_env()
    results = {}
    fb = fb_post_photo(image, caption)
    results["fb"] = fb.get("post_id") or fb.get("id")
    print(f"FB OK: {results['fb']}")
    ig = ig_publish_image(image, caption)
    results["ig"] = ig.get("id")
    print(f"IG OK: {results['ig']}")

    log[date] = results
    save_log(log)
    print(f"{date}: done, logged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
