"""Delete the OLD routine events from the 'Work' calendar using EventKit.

Calendar.app's AppleScript delete gets reverted by iCloud for recurring events.
EventKit removes the whole series (EKSpanFutureEvents) and commits it, which
syncs cleanly. Keeps the NEW routine events untouched.
"""
import datetime
import objc
from EventKit import EKEventStore, EKEntityTypeEvent, EKSpanFutureEvents
from Foundation import NSDate, NSRunLoop, NSDefaultRunLoopMode

OLD_TITLES = [
    "Grounding & Daily Intention", "Morning Market Pulse", "Marketing Deep Work",
    "Distribution & Outreach", "Lunch & Reset", "Investor Pipeline",
    "Pitch Events & Community", "Demos & Calls", "Follow-ups & CRM",
    "Daily Shutdown & Log", "Weekly Planning & Pipeline Review",
    "Weekly Metrics & Retro", "Week Prep & Grounding",
]
# Old "Post & Engage" started 11:30; the NEW one starts 11:45 — keep that.
POST_ENGAGE = "Post & Engage"

CAL_NAME = "Work"


def request_access(store):
    done = {"ok": False, "called": False}

    def handler(granted, err):
        done["ok"] = bool(granted)
        done["called"] = True

    if hasattr(store, "requestFullAccessToEventsWithCompletion_"):
        store.requestFullAccessToEventsWithCompletion_(handler)
    else:
        store.requestAccessToEntityType_completion_(EKEntityTypeEvent, handler)

    loop = NSRunLoop.currentRunLoop()
    deadline = datetime.datetime.now() + datetime.timedelta(seconds=60)
    while not done["called"] and datetime.datetime.now() < deadline:
        loop.runMode_beforeDate_(
            NSDefaultRunLoopMode, NSDate.dateWithTimeIntervalSinceNow_(0.1)
        )
    return done["ok"]


def main():
    store = EKEventStore.alloc().init()
    if not request_access(store):
        print("ACCESS DENIED — grant Calendar access to this process and re-run.")
        return

    cals = [c for c in store.calendarsForEntityType_(EKEntityTypeEvent)
            if c.title() == CAL_NAME]
    if not cals:
        print(f"No calendar named {CAL_NAME!r} found.")
        return

    start = NSDate.dateWithTimeIntervalSince1970_(
        datetime.datetime(2026, 7, 1).timestamp())
    end = NSDate.dateWithTimeIntervalSince1970_(
        datetime.datetime(2028, 12, 31).timestamp())
    pred = store.predicateForEventsWithStartDate_endDate_calendars_(start, end, cals)
    events = store.eventsMatchingPredicate_(pred) or []

    removed_series = set()
    removed = 0

    for ev in sorted(events, key=lambda e: e.startDate().timeIntervalSince1970()):
        title = ev.title() or ""
        ident = ev.calendarItemIdentifier()
        if ident in removed_series:
            continue

        is_old = any(t in title for t in OLD_TITLES)

        if not is_old and POST_ENGAGE in title:
            # Distinguish old (11:30) from new (11:45) by occurrence time.
            comps = ev.startDate().descriptionWithCalendarFormat_timeZone_locale_(
                "%H:%M", None, None) if hasattr(
                ev.startDate(), "descriptionWithCalendarFormat_timeZone_locale_") else None
            # Fallback: use python datetime from epoch (local tz)
            dt = datetime.datetime.fromtimestamp(ev.startDate().timeIntervalSince1970())
            is_old = (dt.hour == 11 and dt.minute == 30)

        if not is_old:
            continue

        ok, err = store.removeEvent_span_commit_error_(ev, EKSpanFutureEvents, True, None)
        if ok:
            removed += 1
            removed_series.add(ident)
            print(f"removed: {title}")
        else:
            print(f"FAILED: {title} — {err}")

    print(f"\nTotal series removed: {removed}")


if __name__ == "__main__":
    main()
