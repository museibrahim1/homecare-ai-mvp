#!/usr/bin/env python3
"""Daily runner for the approved Jul 13 - Aug 9 social plan.

Run once a day (launchd/cron). It looks up today's date in SCHEDULE; if a post is
due and hasn't been published yet, it posts to the right platforms and records it
in scripts/social/.posted_log.json so it never double-posts.

Platforms per the approved plan:
  - Meta days (Mon/Wed/Fri): Facebook + Instagram + Threads, link in the caption.
  - LinkedIn days (Tue/Thu):  LinkedIn image or PDF document carousel, with the
    signup link posted as the FIRST COMMENT (LinkedIn suppresses in-body links).

Manual usage:
  python3 scripts/social/run_scheduled_posts.py                    # post what's due today
  python3 scripts/social/run_scheduled_posts.py --date 2026-07-14  # force a date
  python3 scripts/social/run_scheduled_posts.py --dry-run          # show what would post
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from post_to_meta import (  # noqa: E402
    fb_post_photo,
    ig_publish_image,
    threads_post,
    require_env as require_meta_env,
)
from post_to_linkedin import (  # noqa: E402
    post_image as li_post_image,
    post_document as li_post_document,
    require_env as require_li_env,
)

LOG_FILE = HERE / ".posted_log.json"
SIGNUP = "palmcareai.com/register"

# --------------------------------------------------------------------------- Meta
# date -> caption (posted to FB + IG + Threads with {s} = signup link).
META = {
    "2026-07-10": ("gap-friday-done.png",
        "Leaving on time on a Friday? Groundbreaking. \U0001F334\n\nYour visit notes, billables, and service agreements were done before you left the last house today. The weekend starts when you clock out \u2014 not after three more hours of charting at the kitchen table.\n\nTag the coworker who's still doing their notes after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #homecareagency #nurselife"),
    "2026-07-13": ("w1-imsg-contract.png",
        "The group chat when the contract goes out before lunch \U0001F334\n\n\"Already sent it\" is a real thing now. PALM listens to the assessment, writes the notes and billables, and drafts the state-compliant agreement while you drive to the next visit. You read it, you hit send.\n\nStart free, no card: {s}\n#homecare #homecareagency #privateduty #healthtech"),
    "2026-07-15": ("w1-phone-record.png",
        "This screen replaces your clipboard.\n\nPress record at the assessment. PALM writes the transcript, the care plan, the billables, and the contract. That's the actual app \u2014 no forms, no double entry.\n\nTry it on one visit and see: {s}\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    "2026-07-17": ("w1-receipt-tuesday.png",
        "We itemized your Tuesday. \U0001F9FE\n\nThree hours of after-visit paperwork per assessment \u2014 retyping what was already said in the living room. PALM's total for the same work: zero minutes. Time refunded.\n\nWhich line item hurts the most? Tell us below.\n\nStart free, no card: {s}\n#homecare #homecareagency #caregiverlife"),
    "2026-07-20": ("w2-notifications.png",
        "You drove home. PALM kept working. \U0001F4F2\n\n4:12 \u2014 transcript ready. 4:13 \u2014 care plan drafted, billables priced. 4:14 \u2014 service agreement ready for review. All from the recording you made during the visit.\n\nStart free, no card: {s}\n#homecare #healthtech #privateduty"),
    "2026-07-22": ("w2-phone-contract.png",
        "The contract writes itself. This is the actual screen.\n\n$34/hr, 28 hours, 6 services \u2014 pulled straight from what the family said during the assessment, in a state-compliant agreement. You review, you send, they sign.\n\nTry it free: {s}\n#homecare #homecareagency #healthcareAI"),
    "2026-07-24": ("w3-stickynote.png",
        "Note to self \U0001F4DD\n\nStop writing contracts at 9pm on the couch. Let the app that heard the visit write them.\n\nTag someone who's still doing their charting after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #nurselife"),
    "2026-07-27": ("w3-fill-blank.png",
        "Finish the sentence \U0001F447\n\n\"If I never had to type another visit note, I would finally ______.\"\n\nSleep? Grow the agency? Make it to the 6pm game? Drop yours in the comments \u2014 best answer gets pinned.\n\nThen make it real: {s}\n#homecare #homecareagency #caregiver"),
    "2026-07-29": ("w4-pov-home.png",
        "POV: the visit ended two minutes ago. \u2705\n\nNotes done. Billables done. Contract drafted. You haven't even started the car.\n\nStart free, no card: {s}\n#homecare #POV #caregiverlife #healthtech"),
    "2026-07-31": ("w4-states.png",
        "50 states. 50 different rule books. One draft that follows yours. \U0001F1FA\U0001F1F8\n\nPALM's service agreements are built on the contract rules of the state you operate in \u2014 not a generic template with your logo pasted on top.\n\nStart free, no card: {s}\n#homecare #homecareagency #compliance"),
    "2026-08-03": ("w4-sunday-split.png",
        "Sunday, 9:14 PM. Two versions of you.\n\nOne has a laptop open, cold coffee, and three visit notes left. The other one's paperwork was drafted before they left the driveway.\n\nWhich Sunday are you having? Be honest \U0001F447\n\nStart free, no card: {s}\n#homecare #sundayscaries #caregiverlife"),
    "2026-08-05": ("w4-phone-billables.png",
        "\"Oh, and she needs help with meals.\"\n\nSaid once, in passing, at minute 34 of the assessment. The old way, it never makes the invoice. PALM hears it, prices it, and puts it in the agreement \u2014 this is the real billables screen.\n\nStop losing billables you already earned: {s}\n#homecare #homecarebilling #agencyowner"),
    "2026-08-07": ("w2-poll-evenings.png",
        "We asked home care admins what actually eats their evenings. 68% said the same thing. \U0001F5F3\uFE0F\n\nNot scheduling. Not family calls. Post-visit paperwork \u2014 the retyping of a conversation that already happened.\n\nIs it the same at your agency? Tell us what's #1 for you.\n\nThen take it off the list: {s}\n#homecare #homecareagency #poll"),
}

# --------------------------------------------------------------------- LinkedIn
# date -> (kind, media, title, body, comment). kind = "image" | "document".
# Body carries NO link; the signup link goes in `comment` (first comment).
LINKEDIN = {
    "2026-07-14": ("document", "palm-linkedin-carousel.pdf", "2 hours of typing, deleted",
        "Your best nurse does 2 hours of typing after every assessment.\n\nNot care. Not visits. Typing \u2014 retyping things a family already said out loud.\n\nWe put the whole problem (and how agencies are deleting it) into 7 slides. Slide 5 is the actual contract screen from our app, not a mockup.\n\nIf your team still documents visits twice \u2014 once out loud, once at a keyboard \u2014 this is worth two minutes.",
        "Try it on your next assessment, free: palmcareai.com/register"),
    "2026-07-16": ("image", "w1-timeline-sameday.png", "",
        "10:00 \u2014 assessment starts.\n10:47 \u2014 you press stop.\n10:49 \u2014 notes, billables, and a state-compliant agreement are drafted.\n12:15 \u2014 the family signs.\n\nIn home care, the agency that puts a clear agreement in front of the family first usually wins them. Most take days. That gap is the whole opportunity.\n\nWhat's your average time from assessment to signed agreement? Genuinely curious what the range looks like.",
        "palmcareai.com/register \u2014 free to start"),
    "2026-07-21": ("image", "w2-vs-table.png", "",
        "Same visit. Two very different nights.\n\nThe information in a care assessment doesn't change based on who types it up. What changes is where the hours go: your nurse's evening, or two minutes of AI processing.\n\nVisit notes, billables, the agreement, state rules \u2014 the old way vs. what our agencies do now, in one table.",
        "See it on your own visits: palmcareai.com/register"),
    "2026-07-23": ("image", "w3-quote-remove.png", "",
        "Most tools digitize the paperwork. PALM removes it.\n\nThat distinction is the whole product. Scheduling software, EVV, care management platforms \u2014 they give you better places to type. The typing stays.\n\nPALM starts from a different question: the visit was already documented out loud, by the people in the room. Why is anyone typing it again?",
        "palmcareai.com/register"),
    "2026-07-28": ("image", "w3-phone-transcript.png", "",
        "PALM knows who said what.\n\nA care assessment is a three-way conversation: the caregiver's questions, the client's answers, the family's concerns. Our transcripts keep every voice separate and searchable \u2014 so the care plan and the agreement are built from what was actually said, not what someone remembered at 9pm.\n\nThis is the real transcript screen from the app.",
        "palmcareai.com/register \u2014 free to start"),
    "2026-07-30": ("image", "w3-math.png", "",
        "3 assessments a week \u00d7 2 hours of paperwork each = 312 hours a year.\n\nThat's 39 working days per assessor. Not caring for anyone. Not growing the agency. Typing up what someone already said out loud.\n\nIf you run a team of five, you're funding roughly 195 days of retyping a year. That's the quiet line item nobody budgets for \u2014 and the first thing PALM deletes.",
        "Get those days back: palmcareai.com/register"),
    "2026-08-04": ("image", "w4-founder-note.png", "",
        "Why we built PALM:\n\nWe watched caregivers give their whole day to families \u2014 and their whole evening to paperwork about it.\n\nThe strange part was that the visit was already documented. Someone said every word of it out loud. The only thing missing was software that listened.\n\nSo that's what we built. Record the assessment; PALM writes the transcript, the care plan, the billables, and a state-compliant service agreement. The caregiver reviews and sends.\n\nIf you run an agency and this sounds familiar, I'd genuinely like to hear how your team handles post-visit documentation today.",
        "palmcareai.com/register"),
    "2026-08-06": ("image", "w2-statement-dataentry.png", "",
        "You didn't get into home care to do data entry.\n\nNobody did. But post-visit documentation quietly became the biggest unpaid job in the industry \u2014 and the top reason good assessors burn out.\n\nThe fix isn't typing faster. It's not typing.",
        "Record the visit, PALM writes the rest: palmcareai.com/register"),
}


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))


def run_meta(date: str, dry: bool) -> dict | None:
    entry = META.get(date)
    if entry is None:
        return None
    image, caption = entry
    caption = caption.format(s=SIGNUP)
    if dry:
        print(f"{date}: WOULD post {image} to FB + IG + Threads:\n---\n{caption}\n---")
        return {"dry": True}
    require_meta_env()
    results = {}
    fb = fb_post_photo(image, caption)
    results["fb"] = fb.get("post_id") or fb.get("id")
    print(f"FB OK: {results['fb']}")
    ig = ig_publish_image(image, caption)
    results["ig"] = ig.get("id")
    print(f"IG OK: {results['ig']}")
    try:
        th = threads_post(caption, image=image)
        results["th"] = th.get("id")
        print(f"Threads OK: {results['th']}")
    except Exception as e:  # Threads is best-effort; don't fail the whole run
        results["th_error"] = str(e)[:200]
        print(f"Threads WARN: {e}", file=sys.stderr)
    return results


def run_linkedin(date: str, dry: bool) -> dict | None:
    entry = LINKEDIN.get(date)
    if entry is None:
        return None
    kind, media, title, body, comment = entry
    if dry:
        print(f"{date}: WOULD post {media} ({kind}) to LinkedIn:\n---\n{body}\n[first comment] {comment}\n---")
        return {"dry": True}
    require_li_env()
    if kind == "document":
        res = li_post_document(body, media, title or "PALM", comment)
    else:
        res = li_post_image(body, media, comment)
    print(f"LinkedIn OK: {res}")
    return res


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD (default: today)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    date = args.date or dt.date.today().isoformat()
    if date not in META and date not in LINKEDIN:
        print(f"{date}: nothing scheduled. Nothing to do.")
        return 0

    log = load_log()
    if date in log and not args.dry_run:
        print(f"{date}: already posted ({log[date]}). Skipping.")
        return 0

    results: dict = {}
    meta_res = run_meta(date, args.dry_run)
    if meta_res is not None:
        results["meta"] = meta_res
    li_res = run_linkedin(date, args.dry_run)
    if li_res is not None:
        results["linkedin"] = li_res

    if not args.dry_run:
        log[date] = results
        save_log(log)
        print(f"{date}: done, logged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
