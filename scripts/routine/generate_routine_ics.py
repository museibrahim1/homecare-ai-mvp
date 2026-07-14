"""Generate a recurring Apple Calendar (.ics) routine for a solo founder in
growth mode: marketing, distribution, investors, and pitch events.

Design principles:
  - Consistent daily rhythm (same blocks every weekday) so it becomes automatic.
  - Grounding anchors morning / midday / evening keep you steady.
  - Directives live in each event's notes, so the calendar tells you what to do.
  - Floating local time (no timezone) so 8 AM is always 8 AM wherever you are.

Outputs:
  - <Desktop>/PALM Founder Routine/PALM-Founder-Routine.ics  (import into Apple Calendar)
  - <Desktop>/PALM Founder Routine/ROUTINE.md                (human-readable reference)
"""
import os
from datetime import datetime

HOME = os.path.expanduser("~")
OUT_DIR = os.path.join(HOME, "Desktop", "PALM Founder Routine")
ICS_PATH = os.path.join(OUT_DIR, "PALM-Founder-Routine.ics")
MD_PATH = os.path.join(OUT_DIR, "ROUTINE.md")

WEEKDAYS = ["MO", "TU", "WE", "TH", "FR"]
CALL_DAYS = ["MO", "WE", "TH"]  # cold calls: never Tuesday or Friday

# Anchor dates (must fall on a day in the event's BYDAY set).
MON = "20260713"  # Monday
TUE = "20260714"
WED = "20260715"
THU = "20260716"
FRI = "20260717"

# Each event: (uid, summary, start HHMM, end HHMM, byday list, anchor date,
#              description lines, alarm?)
EVENTS = [
    # ── Repeats EVERY weekday ──────────────────────────────────────────────
    ("inbound", "📥 Inbound & Market Pulse", "0830", "0900", WEEKDAYS, MON, [
        "Check overnight signups, App Store reviews, and ranking.",
        "Reply to every inbound lead and DM (target: within 12 hours).",
        "Flag anything urgent, then close the inbox. Thirty minutes only.",
    ], False),

    ("email", "✉️ Email Outreach & Follow-ups", "0900", "0945", WEEKDAYS, MON, [
        "Send 10 personalized emails to home care agencies.",
        "Send every follow-up you owe from yesterday FIRST.",
        "Log every touch in the CRM. If it's not logged, it didn't happen.",
    ], False),

    ("social", "📲 Post & Engage", "1145", "1215", WEEKDAYS, MON, [
        "Publish today's post across your channels.",
        "Comment genuinely on 10 agency / founder posts.",
        "Reply to every comment and DM. Show up in the conversation.",
    ], False),

    # ── Monday: MARKETING & CONTENT ────────────────────────────────────────
    ("mon-content", "🎯 MON focus: Marketing & Content", "1000", "1145", ["MO"], MON, [
        "Today's ONE focus: marketing and content.",
        "Create the week's core content — blog, video, or campaign centerpiece.",
        "One asset, done well. Phone on Do Not Disturb.",
    ], False),
    ("mon-exec", "🎯 Marketing Execution", "1300", "1500", ["MO"], MON, [
        "Schedule the week's social posts.",
        "SEO / AEO pass and analytics review.",
        "Repurpose the core asset into 3 smaller pieces.",
    ], False),

    # ── Tuesday: INVESTOR OUTREACH (no cold calls) ─────────────────────────
    ("tue-research", "💼 TUE focus: Investor Outreach", "1000", "1200", ["TU"], TUE, [
        "Today's ONE focus: investors.",
        "Research 5 relevant investors (pre-seed / seed, health tech or vertical SaaS).",
        "Send 3 personalized outreaches — warm intro first, cold second.",
    ], False),
    ("tue-deck", "💼 Deck, Data Room & Warm Intros", "1300", "1500", ["TU"], TUE, [
        "Keep the one-pager and data room current.",
        "Ask your network for 2 warm intros.",
        "Log every touch and the next step.",
    ], False),

    # ── Wednesday: DISTRIBUTION / AGENCIES ─────────────────────────────────
    ("wed-dist", "🤝 WED focus: Distribution & Agencies", "1000", "1200", ["WE"], WED, [
        "Today's ONE focus: distribution and agencies.",
        "Line up demos and partnership conversations.",
        "Explore one new channel: referrals, associations, resellers.",
    ], False),
    ("wed-demos", "🤝 Demos & Partnership Calls", "1300", "1500", ["WE"], WED, [
        "Run scheduled demos. Every call ends with a clear next step.",
        "Follow up the same day.",
    ], False),

    # ── Thursday: PITCH EVENTS ─────────────────────────────────────────────
    ("thu-pitch", "🎤 THU focus: Pitch Events", "1000", "1200", ["TH"], THU, [
        "Today's ONE focus: pitch events.",
        "Find and apply to 1 pitch competition, accelerator, or demo day.",
        "Sources: F6S, Gust, Luma, Eventbrite, YC, Techstars, local startup weeks.",
    ], False),
    ("thu-apps", "🎤 Applications & Community", "1300", "1500", ["TH"], THU, [
        "Finish applications. Track every deadline on this calendar.",
        "Join one founder community conversation (Slack / Discord / X).",
    ], False),

    # ── Friday: INVESTOR FOLLOW-UPS + REVIEW (no cold calls) ────────────────
    ("fri-follow", "📊 FRI focus: Investor Follow-ups", "1000", "1200", ["FR"], FRI, [
        "Today's ONE focus: investor follow-ups and weekly review.",
        "Follow up on every open investor thread. Nothing goes cold.",
    ], False),
    ("fri-review", "📊 Weekly Review & Next-Week Plan", "1300", "1430", ["FR"], FRI, [
        "Review the week's KPIs: signups, demos, investor touches, applications.",
        "What worked? Do more. What flopped? Cut it.",
        "Set next week's Top 3 and the one metric that matters.",
    ], False),

    # ── Cold Calls: Mon / Wed / Thu only ───────────────────────────────────
    ("coldcalls", "📞 Cold Calls", "1500", "1600", CALL_DAYS, MON, [
        "Call agencies from today's list. Aim for 15 dials.",
        "Goal: book demos. Leave a crisp voicemail if no answer.",
        "Log outcomes and queue follow-up emails for tomorrow.",
    ], False),
]


def fold(line: str) -> str:
    """Fold a content line to 75 octets per RFC 5545 (continuation = leading space)."""
    out = []
    b = line.encode("utf-8")
    while len(b) > 75:
        # Avoid splitting a multibyte char: back off to a safe boundary.
        cut = 75
        while (b[cut] & 0xC0) == 0x80:
            cut -= 1
        out.append(b[:cut].decode("utf-8"))
        b = b" " + b[cut:]
    out.append(b.decode("utf-8"))
    return "\r\n".join(out)


def esc(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(",", "\\,")
                .replace(";", "\\;").replace("\n", "\\n"))


def build_ics() -> str:
    now = datetime.now().strftime("%Y%m%dT%H%M%S")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//PALM//Founder Routine//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:PALM Founder Routine",
        "X-WR-CALDESC:Daily operating system: marketing, distribution, investors, pitch events.",
        "X-APPLE-CALENDAR-COLOR:#0D9488",
    ]
    for uid, summary, start, end, days, anchor, desc, alarm in EVENTS:
        dtstart = f"{anchor}T{start}00"
        dtend = f"{anchor}T{end}00"
        rrule = f"FREQ=WEEKLY;BYDAY={','.join(days)}"
        body = "\\n".join(esc(d) for d in desc)
        ev = [
            "BEGIN:VEVENT",
            f"UID:{uid}@palmcareai.com",
            f"DTSTAMP:{now}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"RRULE:{rrule}",
            fold(f"SUMMARY:{esc(summary)}"),
            fold(f"DESCRIPTION:{body}"),
        ]
        if alarm:
            ev += [
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                "DESCRIPTION:Reminder",
                "TRIGGER:-PT2M",
                "END:VALARM",
            ]
        ev.append("END:VEVENT")
        lines += ev
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def _fmt(start, end):
    return f"{start[:2]}:{start[2:]}–{end[:2]}:{end[2:]}"


def build_md() -> str:
    daily = [e for e in EVENTS if e[4] == WEEKDAYS]
    day_map = {"MO": "Monday", "TU": "Tuesday", "WE": "Wednesday",
               "TH": "Thursday", "FR": "Friday"}
    themes = {
        "MO": "Marketing & Content",
        "TU": "Investor Outreach",
        "WE": "Distribution & Agencies",
        "TH": "Pitch Events",
        "FR": "Investor Follow-ups + Weekly Review",
    }

    md = [
        "# PALM Founder Routine",
        "",
        "One clear focus each day. A few things repeat daily; everything else is",
        "themed so you go deep on one pillar at a time.",
        "",
        "## How to use it",
        "1. Double-click `PALM-Founder-Routine.ics` and choose **New Calendar** when asked.",
        "2. It recurs weekly. Times are your local time.",
        "3. The **directives live in each event's notes** — open a block to see the checklist.",
        "4. To change anything, tell me and I'll regenerate, or edit the event in Calendar.",
        "",
        "## Repeats every weekday",
        "| Time | Block |",
        "|---|---|",
    ]
    for uid, summary, start, end, days, anchor, desc, alarm in daily:
        md.append(f"| {_fmt(start, end)} | {summary} |")

    md += ["", "## Each day's focus", ""]
    for code in ["MO", "TU", "WE", "TH", "FR"]:
        md.append(f"### {day_map[code]} — {themes[code]}")
        md.append("")
        for uid, summary, start, end, days, anchor, desc, alarm in EVENTS:
            if days == WEEKDAYS or code not in days:
                continue
            md.append(f"- **{_fmt(start, end)}** {summary}")
        md.append("")

    md += [
        "## Cold calls",
        "- Only **Monday, Wednesday, Thursday** at 15:00–16:00. Never Tuesday or Friday.",
        "",
        "## Weekly targets to aim for (tune as you learn)",
        "- Distribution: 40+ personalized outreaches, 8–10 demos booked.",
        "- Marketing: 1 core asset + daily engagement + weekly SEO/analytics review.",
        "- Investors: 5 researched + 3 outreaches on Tue, all follow-ups sent Fri.",
        "- Pitch events: 1+ application submitted every Thursday.",
    ]
    return "\n".join(md) + "\n"


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(ICS_PATH, "w", newline="") as f:
        f.write(build_ics())
    with open(MD_PATH, "w") as f:
        f.write(build_md())
    print("Wrote:", ICS_PATH)
    print("Wrote:", MD_PATH)
    print("Events:", len(EVENTS))


if __name__ == "__main__":
    main()
