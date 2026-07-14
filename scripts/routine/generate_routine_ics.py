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

# Anchor dates (must fall on a day in the event's BYDAY set).
MON = "20260713"  # Monday
FRI = "20260717"  # Friday
SUN = "20260719"  # Sunday

# Each event: (uid, summary, start HHMM, end HHMM, byday list, anchor date,
#              description lines, alarm?)
EVENTS = [
    ("ground-am", "🌅 Grounding & Daily Intention", "0730", "0755", WEEKDAYS, MON, [
        "Phone stays face-down for the first 10 minutes.",
        "Read your mission: Help home care agencies win contracts faster.",
        "Write today's 3 must-win tasks — one marketing, one distribution, one investor.",
        "Five slow breaths. One line of gratitude.",
        "Mantra: consistent reps beat perfect days.",
    ], True),

    ("pulse", "☕ Morning Market Pulse", "0800", "0830", WEEKDAYS, MON, [
        "Check overnight signups, App Store reviews, and ranking.",
        "Reply to every inbound lead and email (target: within 12 hours).",
        "Flag anything urgent, then close the inbox.",
        "Do not rabbit-hole. Thirty minutes only.",
    ], False),

    ("marketing", "🎯 Marketing Deep Work", "0830", "1000", WEEKDAYS, MON, [
        "Ship one asset today. One channel, done well.",
        "Daily rotation:",
        "  Mon — plan the week and repurpose top content.",
        "  Tue — write (blog or LinkedIn article).",
        "  Wed — video or creative (Higgsfield / studio).",
        "  Thu — build and send an email campaign.",
        "  Fri — SEO / AEO and analytics review.",
        "No meetings in this block. Phone on Do Not Disturb.",
    ], False),

    ("distribution", "📞 Distribution & Outreach", "1000", "1130", WEEKDAYS, MON, [
        "Send 10 personalized outreaches to home care agencies (email, DM, or call).",
        "Follow up with yesterday's warm leads first.",
        "Goal: book 2 demos today.",
        "Log every touch in the CRM. If it's not logged, it didn't happen.",
    ], False),

    ("engage", "📲 Post & Engage", "1130", "1200", WEEKDAYS, MON, [
        "Publish today's social post across your channels.",
        "Comment genuinely on 10 posts from agencies and founders.",
        "Reply to every DM and comment. Show up in the conversation.",
    ], False),

    ("reset", "🧘 Lunch & Reset", "1200", "1300", WEEKDAYS, MON, [
        "Step away from all screens.",
        "Walk for 15 minutes — sunlight if you can.",
        "Eat real food. No doomscrolling.",
        "You are recharging, not slacking. Reset for the afternoon.",
    ], True),

    ("investors", "💼 Investor Pipeline", "1300", "1430", WEEKDAYS, MON, [
        "Research 5 relevant investors (pre-seed / seed, health tech or vertical SaaS).",
        "Send 3 personalized outreaches — warm intro first, cold second.",
        "Keep the one-pager and data room current.",
        "Thursday is dedicated follow-up day. Log every touch and next step.",
    ], False),

    ("pitch", "🎤 Pitch Events & Community", "1430", "1530", WEEKDAYS, MON, [
        "Find and apply to 1 pitch competition, accelerator, or demo day.",
        "Track every deadline on this calendar the moment you find it.",
        "Sources: F6S, Gust, Luma, Eventbrite, YC, Techstars, local startup weeks.",
        "Join one founder community conversation (Slack / Discord / X).",
    ], False),

    ("demos", "🤝 Demos & Calls", "1530", "1630", WEEKDAYS, MON, [
        "Scheduled demos and investor calls go here.",
        "If the slot is open: prep demos, sharpen the pitch, or call a user for feedback.",
        "Every call ends with a clear next step and a calendar hold.",
    ], False),

    ("followup", "✅ Follow-ups & CRM", "1630", "1700", WEEKDAYS, MON, [
        "Send every follow-up you promised today. Never let a lead go cold.",
        "Update pipeline stages for both sales and investors.",
        "Build tomorrow's outreach list of 10 so you start fast.",
    ], False),

    ("shutdown", "🌙 Daily Shutdown & Log", "1700", "1715", WEEKDAYS, MON, [
        "Log today's numbers: signups, demos, investor touches, applications.",
        "Write one win, however small.",
        "Set tomorrow's Top 3.",
        "Close the laptop with intention. You showed up today.",
    ], True),

    # Weekly rituals (after the daily shutdown, no overlap)
    ("plan-week", "🗺️ Weekly Planning & Pipeline Review", "1715", "1800", ["MO"], MON, [
        "Set this week's targets for all 4 pillars: marketing, distribution, investors, pitch events.",
        "Review the sales pipeline and the investor pipeline.",
        "Move stale deals forward or cut them loose.",
        "Choose the ONE metric that matters most this week.",
    ], False),

    ("retro-week", "📊 Weekly Metrics & Retro", "1715", "1800", ["FR"], FRI, [
        "Review KPIs against this week's targets.",
        "What worked? Do more of it. What flopped? Cut it.",
        "Update your investor-update draft (send it monthly).",
        "Celebrate one real win. Progress compounds — trust the process.",
    ], False),

    ("prep-week", "🌱 Week Prep & Grounding (optional)", "1800", "1830", ["SU"], SUN, [
        "Light touch only. Rest is part of the work.",
        "Skim next week: any demos, deadlines, or events?",
        "Set Monday's Top 3.",
        "Reconnect with your why, then unplug.",
    ], True),
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


def build_md() -> str:
    md = [
        "# PALM Founder Routine",
        "",
        "A consistent daily operating system for the growth phase. The app is built —",
        "now it's all marketing, distribution, investors, and pitch events. Same rhythm",
        "every day so it runs on autopilot, with grounding anchors to keep you steady.",
        "",
        "## How to use it",
        "1. Double-click `PALM-Founder-Routine.ics` and let Calendar add it (choose",
        "   **New Calendar** when asked, so you can toggle it on/off).",
        "2. It recurs every weekday automatically. Times are your local time.",
        "3. The **directives are in each event's notes** — open an event to see the checklist.",
        "4. Adjust any time by editing the event in Calendar, or re-run the generator.",
        "",
        "## The daily rhythm (Mon–Fri)",
        "",
        "| Time | Block | Focus |",
        "|---|---|---|",
    ]
    labels = {
        "ground-am": "Marketing/Distribution/Investor",
        "pulse": "All pillars",
        "marketing": "Marketing",
        "distribution": "Distribution",
        "engage": "Marketing",
        "reset": "Grounding",
        "investors": "Investors",
        "pitch": "Pitch events",
        "demos": "Distribution/Investors",
        "followup": "All pillars",
        "shutdown": "Grounding",
    }
    for uid, summary, start, end, days, anchor, desc, alarm in EVENTS:
        if days != WEEKDAYS:
            continue
        t = f"{start[:2]}:{start[2:]}–{end[:2]}:{end[2:]}"
        md.append(f"| {t} | {summary} | {labels.get(uid, '')} |")
    md += [
        "",
        "## Weekly rituals",
        "- **Monday 17:15** — Weekly Planning & Pipeline Review (set targets for all 4 pillars).",
        "- **Friday 17:15** — Weekly Metrics & Retro (review KPIs, celebrate a win).",
        "- **Sunday 18:00** — Week Prep & Grounding (optional, light touch).",
        "",
        "## Weekly targets to aim for (tune as you learn)",
        "- Distribution: 50 personalized outreaches, 8–10 demos booked.",
        "- Marketing: 5 published assets, daily engagement, 1 SEO/analytics review.",
        "- Investors: 25 researched, 15 outreaches, all follow-ups sent.",
        "- Pitch events: 5 applications submitted, deadlines tracked.",
        "",
        "## The marketing rotation (Deep Work block)",
        "- **Mon** plan & repurpose · **Tue** write · **Wed** video/creative ·",
        "  **Thu** email campaign · **Fri** SEO/AEO & analytics.",
        "",
        "## Grounding principles",
        "- Phone down for the first 10 minutes of the day.",
        "- Midday walk is non-negotiable. Rest is part of the work.",
        "- End every day by logging numbers and setting tomorrow's Top 3.",
        "- Consistent reps beat perfect days.",
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
