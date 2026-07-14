"""Create a dedicated 'PALM Founder Routine' calendar with the 14 routine events
plus the preserved PALM Zoom Meeting, via AppleScript (creation persists cleanly).

After running this, delete the old 'Work'-mixed imports by removing the whole
'Work' calendar in Calendar.app (right-click -> Delete) if it only holds the
old imports, OR just delete the old events. This script does not delete anything.
"""
import subprocess

CAL = "PALM Founder Routine"

WEEKDAYS = ["MO", "TU", "WE", "TH", "FR"]
CALL_DAYS = ["MO", "WE", "TH"]

# anchor code -> (year, month, day)
ANCHOR = {
    "MON": (2026, 7, 13), "TUE": (2026, 7, 14), "WED": (2026, 7, 15),
    "THU": (2026, 7, 16), "FRI": (2026, 7, 17),
}

# (summary, startHHMM, endHHMM, byday, anchor, [desc lines])
EVENTS = [
    ("\U0001F4E5 Inbound & Market Pulse", "0830", "0900", WEEKDAYS, "MON", [
        "Check overnight signups, App Store reviews, and ranking.",
        "Reply to every inbound lead and DM (target: within 12 hours).",
        "Flag anything urgent, then close the inbox. Thirty minutes only."]),
    ("\u2709\uFE0F Email Outreach & Follow-ups", "0900", "0945", WEEKDAYS, "MON", [
        "Send 10 personalized emails to home care agencies.",
        "Send every follow-up you owe from yesterday FIRST.",
        "Log every touch in the CRM. If it's not logged, it didn't happen."]),
    ("\U0001F4F2 Post & Engage", "1145", "1215", WEEKDAYS, "MON", [
        "Publish today's post across your channels.",
        "Comment genuinely on 10 agency / founder posts.",
        "Reply to every comment and DM. Show up in the conversation."]),
    ("\U0001F3AF MON focus: Marketing & Content", "1000", "1145", ["MO"], "MON", [
        "Today's ONE focus: marketing and content.",
        "Create the week's core content \u2014 blog, video, or campaign centerpiece.",
        "One asset, done well. Phone on Do Not Disturb."]),
    ("\U0001F3AF Marketing Execution", "1300", "1500", ["MO"], "MON", [
        "Schedule the week's social posts.",
        "SEO / AEO pass and analytics review.",
        "Repurpose the core asset into 3 smaller pieces."]),
    ("\U0001F4BC TUE focus: Investor Outreach", "1000", "1200", ["TU"], "TUE", [
        "Today's ONE focus: investors.",
        "Research 5 relevant investors (pre-seed / seed, health tech or vertical SaaS).",
        "Send 3 personalized outreaches \u2014 warm intro first, cold second."]),
    ("\U0001F4BC Deck, Data Room & Warm Intros", "1300", "1500", ["TU"], "TUE", [
        "Keep the one-pager and data room current.",
        "Ask your network for 2 warm intros.",
        "Log every touch and the next step."]),
    ("\U0001F91D WED focus: Distribution & Agencies", "1000", "1200", ["WE"], "WED", [
        "Today's ONE focus: distribution and agencies.",
        "Line up demos and partnership conversations.",
        "Explore one new channel: referrals, associations, resellers."]),
    ("\U0001F91D Demos & Partnership Calls", "1300", "1500", ["WE"], "WED", [
        "Run scheduled demos. Every call ends with a clear next step.",
        "Follow up the same day."]),
    ("\U0001F3A4 THU focus: Pitch Events", "1000", "1200", ["TH"], "THU", [
        "Today's ONE focus: pitch events.",
        "Find and apply to 1 pitch competition, accelerator, or demo day.",
        "Sources: F6S, Gust, Luma, Eventbrite, YC, Techstars, local startup weeks."]),
    ("\U0001F3A4 Applications & Community", "1300", "1500", ["TH"], "THU", [
        "Finish applications. Track every deadline on this calendar.",
        "Join one founder community conversation (Slack / Discord / X)."]),
    ("\U0001F4CA FRI focus: Investor Follow-ups", "1000", "1200", ["FR"], "FRI", [
        "Today's ONE focus: investor follow-ups and weekly review.",
        "Follow up on every open investor thread. Nothing goes cold."]),
    ("\U0001F4CA Weekly Review & Next-Week Plan", "1300", "1430", ["FR"], "FRI", [
        "Review the week's KPIs: signups, demos, investor touches, applications.",
        "What worked? Do more. What flopped? Cut it.",
        "Set next week's Top 3 and the one metric that matters."]),
    ("\U0001F4DE Cold Calls", "1500", "1600", CALL_DAYS, "MON", [
        "Call agencies from today's list. Aim for 15 dials.",
        "Goal: book demos. Leave a crisp voicemail if no answer.",
        "Log outcomes and queue follow-up emails for tomorrow."]),
]

ZOOM = {
    "summary": "PALM Zoom Meeting",
    "date": (2026, 6, 22), "start": "1700", "end": "1730",
    "location": "https://us05web.zoom.us/j/84309238162?pwd=4IJewX5SUM4C1F9P3RnbtPEHkI7frL.1",
    "desc": [
        "Muse ibrahim is inviting you to a scheduled Zoom meeting.",
        "",
        "Join Zoom Meeting",
        "https://us05web.zoom.us/j/84309238162?pwd=4IJewX5SUM4C1F9P3RnbtPEHkI7frL.1",
        "",
        "Meeting ID: 843 0923 8162",
        "Passcode: 7JCapX",
    ],
}


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def as_desc(lines):
    parts = [f'"{esc(l)}"' for l in lines]
    return " & linefeed & ".join(parts)


def date_expr(y, m, d, hhmm):
    hh, mm = int(hhmm[:2]), int(hhmm[2:])
    # set day=1 first to avoid month-rollover, then set fields.
    return (f"(my mkDate({y}, {m}, {d}, {hh}, {mm}))")


def build_applescript() -> str:
    s = []
    s.append('on mkDate(y, m, d, hh, mm)')
    s.append('  set dd to current date')
    s.append('  set day of dd to 1')
    s.append('  set year of dd to y')
    s.append('  set month of dd to m')
    s.append('  set day of dd to d')
    s.append('  set hours of dd to hh')
    s.append('  set minutes of dd to mm')
    s.append('  set seconds of dd to 0')
    s.append('  return dd')
    s.append('end mkDate')
    s.append('')
    s.append('tell application "Calendar"')
    s.append(f'  if (count of (calendars whose name is "{CAL}")) = 0 then')
    s.append(f'    make new calendar with properties {{name:"{CAL}"}}')
    s.append('  end if')
    s.append(f'  set cal to first calendar whose name is "{CAL}"')

    for summ, start, end, days, anchor, desc in EVENTS:
        y, m, d = ANCHOR[anchor]
        sd = date_expr(y, m, d, start)
        ed = date_expr(y, m, d, end)
        rr = "FREQ=WEEKLY;BYDAY=" + ",".join(days)
        s.append(
            f'  make new event at end of events of cal with properties '
            f'{{summary:"{esc(summ)}", start date:{sd}, end date:{ed}, '
            f'description:({as_desc(desc)}), recurrence:"{rr}"}}')

    # Zoom meeting (single, non-recurring)
    zy, zm, zd = ZOOM["date"]
    zsd = date_expr(zy, zm, zd, ZOOM["start"])
    zed = date_expr(zy, zm, zd, ZOOM["end"])
    s.append(
        f'  make new event at end of events of cal with properties '
        f'{{summary:"{esc(ZOOM["summary"])}", start date:{zsd}, end date:{zed}, '
        f'location:"{esc(ZOOM["location"])}", description:({as_desc(ZOOM["desc"])})}}')

    s.append('  set n to (count of events of cal)')
    s.append('  return "created calendar with events=" & n')
    s.append('end tell')
    return "\n".join(s)


def main():
    script = build_applescript()
    result = subprocess.run(["osascript", "-e", script],
                            capture_output=True, text=True)
    print("STDOUT:", result.stdout.strip())
    if result.stderr.strip():
        print("STDERR:", result.stderr.strip())


if __name__ == "__main__":
    main()
