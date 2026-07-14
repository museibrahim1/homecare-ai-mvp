#!/usr/bin/env python3
"""Daily runner for the approved Jul 13 - Aug 9 social plan.

Run once a day (launchd/cron). It looks up today's date in SCHEDULE; if a post is
due and hasn't been published yet, it posts to the right platforms and records it
in scripts/social/.posted_log.json so it never double-posts.

Platforms per the approved plan:
  - Meta days (Mon/Wed/Fri): Instagram + Threads day-of (link in the caption).
    Facebook is scheduled NATIVELY via schedule_meta_fb.py so it appears in Meta
    Business Suite's planner and posts even if this machine is asleep. The API
    can't pre-schedule IG or Threads, so those publish day-of from here.
  - LinkedIn days (Tue/Thu):  LinkedIn image or PDF document carousel, value in
    the body, signup link kept in the FIRST COMMENT.

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
    fb_post_video,
    ig_publish_image,
    ig_publish_reel,
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
APP = "palmcareai.com/app"  # redirects to the App Store listing

# --------------------------------------------------------------------------- Meta
# date -> (media, caption). Caption placeholders: {s} = signup link, {a} = app link.
# Media ending in .mp4 posts as an IG Reel + FB video + Threads video, all day-of
# (videos can't be pre-scheduled like FB photos).
META = {
    "2026-07-10": ("gap-friday-done.png",
        "Leaving on time on a Friday? Groundbreaking. \U0001F334\n\nYour visit notes, billables, and service agreements were done before you left the last house today. The weekend starts when you clock out, not after three more hours of charting at the kitchen table.\n\nTag the coworker who's still doing their notes after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #homecareagency #nurselife"),
    "2026-07-13": ("w1-imsg-contract.png",
        "The group chat when the contract goes out before lunch \U0001F334\n\n\"Already sent it\" is a real thing now. PALM listens to the assessment, writes the notes and billables, and drafts the state-compliant agreement while you drive to the next visit. You read it, you hit send.\n\nStart free, no card: {s}\n#homecare #homecareagency #privateduty #healthtech"),
    "2026-07-15": ("w1-phone-record.png",
        "This screen replaces your clipboard.\n\nPress record at the assessment. PALM writes the transcript, the care plan, the billables, and the contract. That's the actual app. No forms, no double entry.\n\nTry it on one visit and see: {s}\n#homecare #caregiver #healthcareAI #homecarebusiness"),
    "2026-07-17": ("w1-receipt-tuesday.png",
        "We itemized your Tuesday. \U0001F9FE\n\nThree hours of after-visit paperwork per assessment, all of it retyping what was already said in the living room. PALM's total for the same work: zero minutes. Time refunded.\n\nWhich line item hurts the most? Tell us below.\n\nStart free, no card: {s}\n#homecare #homecareagency #caregiverlife"),
    "2026-07-20": ("w2-notifications.png",
        "You drove home. PALM kept working. \U0001F4F2\n\nAt 4:12, transcript ready. At 4:13, care plan drafted and billables priced. At 4:14, service agreement ready for review. All from the recording you made during the visit.\n\nStart free, no card: {s}\n#homecare #healthtech #privateduty"),
    "2026-07-22": ("w2-phone-contract.png",
        "The contract writes itself. This is the actual screen.\n\n$34 an hour, 28 hours, 6 services, pulled straight from what the family said during the assessment, in a state-compliant agreement. You review, you send, they sign.\n\nTry it free: {s}\n#homecare #homecareagency #healthcareAI"),
    "2026-07-24": ("w3-stickynote.png",
        "Note to self \U0001F4DD\n\nStop writing contracts at 9pm on the couch. Let the app that heard the visit write them.\n\nTag someone who's still doing their charting after dinner.\n\nStart free, no card: {s}\n#homecare #caregiverlife #nurselife"),
    "2026-07-27": ("w3-fill-blank.png",
        "Finish the sentence \U0001F447\n\n\"If I never had to type another visit note, I would finally ______.\"\n\nSleep? Grow the agency? Make it to the 6pm game? Drop yours in the comments. Best answer gets pinned.\n\nThen make it real: {s}\n#homecare #homecareagency #caregiver"),
    "2026-07-29": ("w4-pov-home.png",
        "POV: the visit ended two minutes ago. \u2705\n\nNotes done. Billables done. Contract drafted. You haven't even started the car.\n\nStart free, no card: {s}\n#homecare #POV #caregiverlife #healthtech"),
    "2026-07-31": ("w4-states.png",
        "50 states. 50 different rule books. One draft that follows yours. \U0001F1FA\U0001F1F8\n\nPALM's service agreements are built on the contract rules of the state you operate in, not a generic template with your logo pasted on top.\n\nStart free, no card: {s}\n#homecare #homecareagency #compliance"),
    "2026-08-03": ("w4-sunday-split.png",
        "Sunday, 9:14 PM. Two versions of you.\n\nOne has a laptop open, cold coffee, and three visit notes left. The other one's paperwork was drafted before they left the driveway.\n\nWhich Sunday are you having? Be honest \U0001F447\n\nStart free, no card: {s}\n#homecare #sundayscaries #caregiverlife"),
    "2026-08-05": ("w4-phone-billables.png",
        "\"Oh, and she needs help with meals.\"\n\nSaid once, in passing, at minute 34 of the assessment. The old way, it never makes the invoice. PALM hears it, prices it, and puts it in the agreement. This is the real billables screen.\n\nStop losing billables you already earned: {s}\n#homecare #homecarebilling #agencyowner"),
    "2026-08-07": ("w2-poll-evenings.png",
        "We asked home care admins what actually eats their evenings. 68% said the same thing. \U0001F5F3\uFE0F\n\nNot scheduling. Not family calls. Post-visit paperwork. The retyping of a conversation that already happened.\n\nIs it the same at your agency? Tell us what's number one for you.\n\nThen take it off the list: {s}\n#homecare #homecareagency #poll"),

    # ------------------- "Get the app" download campaign (Jul 18 - Sep 11) ----
    # Video posts lead: our 3 highest-engagement IG posts to date are all videos.
    # Saturdays carry the download push so the approved M/W/F plan stays intact.
    "2026-07-18": ("palm-app-launch-9x16.mp4",
        "The visit ends. The contract is already written.\n\nPALM is on the App Store. It sits in on the assessment, writes the care plan, finds the billable items, and builds the contract. You review and sign.\n\nWhat would you do with your evenings back? Tell us below.\n\nGet the app: {a}\n#homecare #homecareagency #caregiver #newapp #iosapp"),
    "2026-07-25": ("appstore-download-1x1.png",
        "Your iPhone camera is the fastest way to end paperwork nights. \U0001F4F1\n\nPoint it at the code. Download PALM. Record your next assessment and watch the care plan, the billables, and the contract write themselves.\n\nFirst 14 days free, no card.\n\nOr tap here: {a}\n#homecare #homecareagency #caregiverlife #healthtech"),
    "2026-08-01": ("palm-app-launch-9x16.mp4",
        "7 seconds. That's the whole pitch.\n\nRecord the client assessment on your iPhone. PALM writes the transcript, the care plan, the billables, and a contract built on your state's rules. You review, you send, they sign.\n\nTag an agency owner who is still typing visit notes at 9pm.\n\nGet the app: {a}\n#homecare #homecareagency #agencyowner #caregiver"),
    "2026-08-08": ("appstore-download-1x1.png",
        "Every home care assessment already writes itself. Out loud. In the living room.\n\nPALM is the app that finally listens. Care plan, billables, and a state specific contract, drafted from what was actually said.\n\nScan the code with your iPhone or tap the link. Free to try on your next visit.\n\n{a}\n#homecare #homecareagency #healthcareAI"),
    "2026-08-10": ("iphone_mockup_recording.png",
        "This button replaces your clipboard, your forms, and your Sunday night charting. \U0001F334\n\nPress record at the assessment. PALM writes the care plan, prices the billables, and drafts the contract while you drive to the next visit.\n\nWhat's the last thing you want to be doing at 9pm? Wrong answers only.\n\nGet the app: {a}\n#homecare #caregiver #homecareagency"),
    "2026-08-12": ("palm-app-launch-9x16.mp4",
        "POV: you just finished the assessment and the paperwork finished with you. \u2705\n\nPALM sits in on the visit and hands you the care plan, the billables, and the contract before you start the car.\n\nOn the App Store now. Free for 14 days.\n\n{a}\n#homecare #POV #caregiverlife #homecareagency"),
    "2026-08-14": ("ig_square_contract_signing.png",
        "The agency that puts a clear agreement in front of the family first usually wins them.\n\nMost agencies take days. PALM agencies do it before they leave the driveway. Same visit, same conversation, contract drafted and ready to sign.\n\nHow long does assessment-to-signature take at your agency? Be honest \U0001F447\n\nGet the app: {a}\n#homecare #homecareagency #agencyowner"),
    "2026-08-17": ("appstore-download-9x16.png",
        "Saturday errand for agency owners: 30 seconds, one download. \U0001F4F2\n\nPALM turns your recorded assessments into care plans, billables, and state specific contracts. The trial is free and the setup is one login.\n\nScan the code or tap: {a}\n#homecare #homecareagency #smallbusiness"),
    "2026-08-19": ("w4-phone-billables.png",
        "\"Oh, and she needs help with meals.\"\n\nSaid once, at minute 34. The old way, it never makes the invoice. PALM hears it, prices it, and puts it in the agreement.\n\nHow many billables slipped through your last month? You'll never know. Your app would.\n\nDownload PALM: {a}\n#homecare #homecarebilling #agencyowner"),
    "2026-08-21": ("palm-app-launch-9x16.mp4",
        "Home care paperwork used to eat your evenings. Not anymore.\n\nPALM is on the App Store. One recording becomes the care plan, the billables, the visit notes, and the contract. A human reviews everything before it goes out.\n\nSend this to the coworker who's still charting after dinner.\n\n{a}\n#homecare #caregiverlife #nurselife #homecareagency"),
    "2026-08-24": ("ig_square_stats_infographic.png",
        "3 assessments a week. 2 hours of paperwork each. 312 hours a year.\n\nThat's 39 working days per assessor spent retyping what someone already said out loud. PALM deletes that line item.\n\nRun your own numbers in the comments: visits per week times hours of paperwork.\n\nGet the app: {a}\n#homecare #homecareagency #agencyowner"),
    "2026-08-26": ("appstore-download-1x1.png",
        "The QR code that gives you your evenings back. \U0001F334\n\nPALM listens to the assessment and writes the care plan, the billables, and a contract built on your state's rules. All 50 states covered.\n\nPoint your iPhone camera at the code. Free for 14 days.\n\n{a}\n#homecare #homecareagency #healthtech"),
    "2026-08-28": ("iphone_mockup_contract.png",
        "This contract was drafted by the visit itself.\n\n$34 an hour, 28 hours, 6 services. Pulled straight from what the family said during the assessment, in a state compliant agreement. You review, you send, they sign.\n\nWould your team trust it? Try it on one visit and judge for yourself.\n\nDownload PALM: {a}\n#homecare #homecareagency #healthcareAI"),
    "2026-08-31": ("palm-app-launch-9x16.mp4",
        "September resolution for agency owners: stop typing what was already said out loud.\n\nPALM records the assessment and writes the care plan, the billables, and the contract. On the App Store now, free for 14 days.\n\nWhat would your team do with 12 extra hours a week? \U0001F447\n\n{a}\n#homecare #homecareagency #agencyowner #caregiver"),
    "2026-09-02": ("w1-timeline-sameday.png",
        "10:00, the assessment starts. 10:47, you press stop. 10:49, the care plan, billables, and contract are drafted. 12:15, the family signs.\n\nThat timeline is the whole product. Same day, every time.\n\nWhat does that timeline look like at your agency today?\n\nGet the app: {a}\n#homecare #homecareagency #privateduty"),
    "2026-09-04": ("appstore-download-9x16.png",
        "One scan. Four documents you never type again. \U0001F4F1\n\nTranscript. Care plan. Billables. Contract. All drafted from the assessment you were already doing.\n\nPoint your iPhone camera at the code and try it free.\n\n{a}\n#homecare #homecareagency #caregiverlife"),
    "2026-09-07": ("gap-myth-reality.png",
        "\"AI is going to replace the caregivers.\" It's the fear we hear most, and it's backwards.\n\nPALM doesn't touch the caring. It deletes the typing about the caring. Your nurse runs the visit. The app writes the paperwork. A human approves everything.\n\nWhat's your take? Genuinely curious \U0001F447\n\nGet the app: {a}\n#homecare #caregiver #healthcareAI"),
    "2026-09-09": ("palm-app-launch-9x16.mp4",
        "The 7 second demo that ends 2 hour paperwork nights.\n\nPALM sits in on the assessment, writes the care plan, finds the billables, and builds the contract. On the App Store, free for 14 days.\n\nTag the most overworked admin you know.\n\n{a}\n#homecare #homecareagency #nurselife"),
    "2026-09-11": ("appstore-download-1x1.png",
        "Friday checkpoint: did your paperwork leave when you did? \U0001F334\n\nPALM agencies close the week with the contracts already drafted, the billables already priced, and the evenings already theirs.\n\nScan the code. Next Friday can feel like this.\n\n{a}\n#homecare #homecareagency #caregiverlife"),
}

# --------------------------------------------------------------------- LinkedIn
# date -> (kind, media, title, body, comment). kind = "image" | "document".
# Body carries NO link; the signup link goes in `comment` (first comment).
LINKEDIN = {
    "2026-07-14": ("document", "palm-linkedin-carousel.pdf", "2 hours of typing, deleted",
        "Your best nurse does 2 hours of typing after every assessment.\n\nNot care. Not visits. Typing. Retyping things a family already said out loud.\n\nWe put the whole problem, and how agencies are deleting it, into 7 slides. Slide 5 is the actual contract screen from our app, not a mockup.\n\nIf your team still documents visits twice, once out loud and once at a keyboard, this is worth two minutes.",
        "Try it on your next assessment, free: palmcareai.com/register"),
    "2026-07-16": ("image", "w1-timeline-sameday.png", "",
        "10:00, the assessment starts.\n10:47, you press stop.\n10:49, notes, billables, and a state-compliant agreement are drafted.\n12:15, the family signs.\n\nIn home care, the agency that puts a clear agreement in front of the family first usually wins them. Most agencies take days. That gap is the whole opportunity.\n\nWhat's your average time from assessment to signed agreement? Genuinely curious what the range looks like.",
        "palmcareai.com/register, free to start"),
    "2026-07-21": ("image", "w2-vs-table.png", "",
        "Same visit. Two very different nights.\n\nThe information in a care assessment doesn't change based on who types it up. What changes is where the hours go: your nurse's evening, or two minutes of AI processing.\n\nVisit notes, billables, the agreement, state rules. The old way versus what our agencies do now, in one table.",
        "See it on your own visits: palmcareai.com/register"),
    "2026-07-23": ("image", "w3-quote-remove.png", "",
        "Most tools digitize the paperwork. PALM removes it.\n\nThat distinction is the whole product. Scheduling software, EVV, care management platforms all give you better places to type. The typing stays.\n\nPALM starts from a different question: the visit was already documented out loud, by the people in the room. Why is anyone typing it again?",
        "palmcareai.com/register"),
    "2026-07-28": ("image", "w3-phone-transcript.png", "",
        "PALM knows who said what.\n\nA care assessment is a three-way conversation: the caregiver's questions, the client's answers, the family's concerns. Our transcripts keep every voice separate and searchable, so the care plan and the agreement are built from what was actually said, not what someone remembered at 9pm.\n\nThis is the real transcript screen from the app.",
        "palmcareai.com/register, free to start"),
    "2026-07-30": ("image", "w3-math.png", "",
        "3 assessments a week, 2 hours of paperwork each, adds up to 312 hours a year.\n\nThat's 39 working days per assessor. Not caring for anyone. Not growing the agency. Typing up what someone already said out loud.\n\nIf you run a team of five, you're funding roughly 195 days of retyping a year. That's the quiet line item nobody budgets for, and the first thing PALM deletes.",
        "Get those days back: palmcareai.com/register"),
    "2026-08-04": ("image", "w4-founder-note.png", "",
        "Why we built PALM:\n\nWe watched caregivers give their whole day to families, then their whole evening to paperwork about it.\n\nThe strange part was that the visit was already documented. Someone said every word of it out loud. The only thing missing was software that listened.\n\nSo that's what we built. Record the assessment, and PALM writes the transcript, the care plan, the billables, and a state-compliant service agreement. The caregiver reviews and sends.\n\nIf you run an agency and this sounds familiar, I'd genuinely like to hear how your team handles post-visit documentation today.",
        "palmcareai.com/register"),
    "2026-08-06": ("image", "w2-statement-dataentry.png", "",
        "You didn't get into home care to do data entry.\n\nNobody did. But post-visit documentation quietly became the biggest unpaid job in the industry, and the top reason good assessors burn out.\n\nThe fix isn't typing faster. It's not typing.",
        "Record the visit, PALM writes the rest: palmcareai.com/register"),

    # ------------------- "Get the app" download campaign (Aug 11 - Sep 10) ----
    "2026-08-11": ("image", "appstore-download-1x1.png", "",
        "PALM is on the App Store.\n\nIt does one job. It sits in on the client assessment, then writes the care plan, finds the billable items, and builds a service contract on your state's rules. A coordinator reviews and signs.\n\nWe kept the scope narrow on purpose. No EVV, no scheduling, no billing processing. Record the visit, get the documentation.\n\nIf your team still documents every visit twice, once out loud and once at a keyboard, the trial is free and it takes one visit to judge.",
        "Download PALM for iPhone: palmcareai.com/app"),
    "2026-08-13": ("image", "w3-phone-transcript.png", "",
        "The most expensive part of a care assessment is the second time it gets documented.\n\nThe first time is free. The client, the family, and the assessor say everything out loud, in the room. The second time costs your best nurse her evening.\n\nPALM keeps the first documentation and deletes the second. The app records the visit, separates the voices, and drafts the care plan, the billables, and the contract from what was actually said.",
        "On the App Store: palmcareai.com/app"),
    "2026-08-18": ("image", "iphone_mockup_contract.png", "",
        "This service agreement was drafted before the assessor left the driveway.\n\nRate, hours, services, and state specific terms, pulled from the assessment conversation itself. The coordinator reviewed it, the family signed it the same day.\n\nIn home care, the first clear agreement in front of the family usually wins the client. Speed here isn't a vanity metric. It's revenue.\n\nWhat's your average time from assessment to signature? The range I hear from owners is wider than you'd think.",
        "Try it on one visit, free: palmcareai.com/app"),
    "2026-08-20": ("image", "w4-founder-note.png", "",
        "A month after putting PALM on the App Store, the feedback that sticks with me isn't about the AI.\n\nIt's owners telling me their assessors stopped dreading the evenings. The visit ends and the paperwork is drafted. They review it, send it, and go home.\n\nWe built the care plan generation, the billable detection, and the 50-state contract engine. But the product, the real one, is the evening back.",
        "PALM for iPhone: palmcareai.com/app"),
    "2026-08-25": ("image", "w3-math.png", "",
        "312 hours a year. That's 3 assessments a week at 2 hours of paperwork each.\n\n39 working days per assessor, spent retyping conversations that already happened. For a team of five, roughly 195 days a year of pure transcription labor, unbudgeted and unpaid.\n\nPALM's pitch is not that AI is impressive. It's that this line item can go to zero. The app listens to the assessment and drafts the care plan, the billables, and the contract. Your team approves instead of types.",
        "Run it on your next visit: palmcareai.com/app"),
    "2026-08-27": ("image", "linkedin_crm_showcase.png", "",
        "The iPhone app is where PALM starts. It isn't where it ends.\n\nEvery recorded assessment lands in your agency dashboard: the transcript, the care plan, the priced billables, and the contract, organized by client and ready for review. Owners see the pipeline. Coordinators approve documents. Nothing ships without a human sign-off.\n\nThat review step is deliberate. AI drafts fast. Your people stay accountable.",
        "Start with the app: palmcareai.com/app"),
    "2026-09-01": ("image", "w2-vs-table.png", "",
        "Same visit. Two very different nights.\n\nThe information in a care assessment doesn't change based on who types it up. What changes is where the hours go: your nurse's evening, or two minutes of AI processing plus a human review.\n\nSeptember is a good month to run the comparison on your own visits. The trial is free and the first contract usually settles the argument.",
        "PALM on the App Store: palmcareai.com/app"),
    "2026-09-03": ("image", "w4-states.png", "",
        "50 states. 50 different rule books for home care service agreements.\n\nMost software handles this with one template and a logo swap. PALM drafts the agreement on the contract rules of the state you actually operate in, from the assessment you actually recorded.\n\nCompliance isn't a feature we bolted on. It's the reason agencies trust the draft enough to send it the same day.",
        "Download PALM: palmcareai.com/app"),
    "2026-09-08": ("image", "appstore-download-1x1.png", "",
        "The best product demo we have is 30 seconds long and happens on your own visit.\n\nDownload PALM, record your next client assessment, and watch it hand you the care plan, the billables, and the state specific contract. Then compare that to your current evening.\n\nNo sales call required. The App Store link is in the comments.",
        "palmcareai.com/app, free for 14 days"),
    "2026-09-10": ("image", "w1-timeline-sameday.png", "",
        "10:00, the assessment starts.\n10:47, you press stop.\n10:49, the care plan, billables, and agreement are drafted.\n12:15, the family signs.\n\nTwo months ago this timeline was our launch promise. Now it's the daily rhythm for the agencies running PALM.\n\nIf your assessment-to-signature time is still measured in days, the gap is the opportunity.",
        "PALM for iPhone: palmcareai.com/app"),
}


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))


def threads_safe(caption: str, limit: int = 500) -> str:
    """Threads caps posts at 500 chars (FB/IG don't). Trim safely if needed:
    first drop the trailing hashtag line, then hard-truncate at a word boundary."""
    if len(caption) <= limit:
        return caption
    lines = caption.rstrip().split("\n")
    while lines and lines[-1].lstrip().startswith("#"):
        lines.pop()
    trimmed = "\n".join(lines).rstrip()
    if len(trimmed) <= limit:
        return trimmed
    cut = trimmed[: limit - 1]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip()


def run_meta(date: str, dry: bool) -> dict | None:
    """Publish the day-of IG + Threads posts. Facebook photos are NOT posted
    here: they are scheduled natively via schedule_meta_fb.py so they show up in
    Meta Business Suite's planner and publish even if this machine is asleep.
    IG and Threads can't be pre-scheduled through the API, so they run day-of.
    Videos (.mp4) also run fully day-of: IG Reel + FB video + Threads video."""
    entry = META.get(date)
    if entry is None:
        return None
    media, caption = entry
    caption = caption.format(s=SIGNUP, a=APP)
    is_video = media.endswith(".mp4")
    if dry:
        kind = "IG Reel + FB video + Threads" if is_video else "IG + Threads (FB is natively scheduled)"
        print(f"{date}: WOULD post {media} to {kind}:\n---\n{caption}\n---")
        return {"dry": True}
    require_meta_env()
    results = {}
    if is_video:
        ig = ig_publish_reel(media, caption)
        results["ig"] = ig.get("id")
        print(f"IG Reel OK: {results['ig']}")
        try:
            fb = fb_post_video(media, caption)
            results["fb"] = fb.get("id")
            print(f"FB video OK: {results['fb']}")
        except Exception as e:
            results["fb_error"] = str(e)[:200]
            print(f"FB WARN: {e}", file=sys.stderr)
        try:
            th = threads_post(threads_safe(caption), video=media)
            results["th"] = th.get("id")
            print(f"Threads OK: {results['th']}")
        except Exception as e:
            results["th_error"] = str(e)[:200]
            print(f"Threads WARN: {e}", file=sys.stderr)
        return results
    ig = ig_publish_image(media, caption)
    results["ig"] = ig.get("id")
    print(f"IG OK: {results['ig']}")
    try:
        th = threads_post(threads_safe(caption), image=media)
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
