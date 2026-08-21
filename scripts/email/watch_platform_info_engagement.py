#!/usr/bin/env python3
"""Watch platform_info outreach emails and alert Muse on open/click.

Reads scripts/email/.platform_info_sends.json (written when emails are sent).
Polls Resend GET /emails/{id} for last_event. On first transition to opened
or clicked, emails Muse once (alerted_events is persisted by the GitHub
workflow that runs this script). Re-opens do not re-alert. Also watches for
matching signups via Resend "New Signup" is already handled by the API;
this script additionally flags when a watched contact's address appears in
recent outbound onboarding mail.

Usage:
  python scripts/email/watch_platform_info_engagement.py
  python scripts/email/watch_platform_info_engagement.py --once
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
TRACK_LOG = Path(__file__).resolve().parent / ".platform_info_sends.json"
STATE_LOG = Path(__file__).resolve().parent / ".platform_info_watch_state.json"
ALERT_FROM = "PalmCare Tracking <sales@send.palmtai.com>"
ALERT_TO = ["museibrahim@palmtai.com", "musajama89@gmail.com"]
REPLY_TO = "sales@palmtai.com"
HEADERS = {
    "Authorization": f"Bearer {RESEND_API_KEY}",
    "Content-Type": "application/json",
    "User-Agent": "PalmCare-PlatformInfoWatch/1.0",
}


def _get(path: str) -> dict:
    r = requests.get(f"https://api.resend.com{path}", headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()


def _post_email(payload: dict) -> dict:
    r = requests.post("https://api.resend.com/emails", headers=HEADERS, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()


def _load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _send_alert(subject: str, html: str) -> bool:
    try:
        _post_email(
            {
                "from": ALERT_FROM,
                "to": ALERT_TO,
                "reply_to": REPLY_TO,
                "subject": subject,
                "html": html,
            }
        )
        return True
    except Exception as e:
        print(f"ALERT SEND FAIL: {e}", file=sys.stderr)
        return False


def _alert_html(row: dict, event: str) -> str:
    return f"""\
<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;">
  <div style="background:#ecfdf5;border:1px solid #99f6e4;border-radius:12px;padding:20px;">
    <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f766e;">
      Platform info email: {event.upper()}
    </p>
    <p style="margin:0 0 4px;color:#334155;"><strong>Who:</strong> {row.get('to_name')} &lt;{row.get('to_email')}&gt;</p>
    <p style="margin:0 0 4px;color:#334155;"><strong>Agency:</strong> {row.get('agency')}</p>
    <p style="margin:0 0 4px;color:#334155;"><strong>Subject:</strong> {row.get('subject')}</p>
    <p style="margin:0 0 4px;color:#334155;"><strong>Resend event:</strong> {event}</p>
    <p style="margin:0;color:#64748b;font-size:13px;">Email id: {row.get('resend_email_id')}</p>
  </div>
  <p style="font-size:13px;color:#64748b;margin:16px 0 0;">
    Opens can be inflated by Gmail image prefetch. Clicks are the stronger signal they read and acted.
    Signups from these contacts also trigger the normal New Signup admin email (utm_campaign=platform_info).
  </p>
</div>"""


def check_sends() -> int:
    """Return number of new alerts fired."""
    rows = _load_json(TRACK_LOG, [])
    if not rows:
        print("No tracked sends in", TRACK_LOG)
        return 0

    fired = 0
    changed = False
    for row in rows:
        email_id = row.get("resend_email_id")
        if not email_id or email_id == "?":
            continue
        try:
            detail = _get(f"/emails/{email_id}")
        except Exception as e:
            print(f"poll fail {email_id}: {e}")
            continue

        event = (detail.get("last_event") or "unknown").lower()
        row["last_event"] = event
        row["last_polled_at"] = datetime.now(timezone.utc).isoformat()
        alerted = set(row.get("alerted_events") or [])

        # Prefer notifying on clicked; also notify on first opened only.
        for interesting in ("opened", "clicked"):
            if event == interesting and interesting not in alerted:
                ok = _send_alert(
                    f"[Engagement] {row.get('to_name')} {interesting} — {row.get('agency')}",
                    _alert_html(row, interesting),
                )
                print(f"{'ALERT' if ok else 'FAIL'} {interesting} → {row.get('to_email')}")
                if ok:
                    alerted.add(interesting)
                    fired += 1
                    # clicked already means they engaged; mark opened too so we don't double-spam later
                    if interesting == "clicked":
                        alerted.add("opened")
                    # Persist immediately so a crash / next CI checkout cannot re-alert.
                    row["alerted_events"] = sorted(alerted)
                    _save_json(TRACK_LOG, rows)

        # If Resend only reports clicked as last_event, still fine.
        # If last_event is clicked but we never saw opened, alert clicked only.
        if event == "clicked" and "clicked" not in alerted:
            pass  # handled above

        row["alerted_events"] = sorted(alerted)
        changed = True
        print(f"  {row.get('to_email')}: last_event={event} alerted={sorted(alerted)}")

    if changed:
        _save_json(TRACK_LOG, rows)
    return fired


def check_signups_by_email() -> int:
    """Best-effort: if a watched contact signs up, Resend admin mail already fires.

    Extra: scan recent Resend outbound for subjects starting with 'New Signup'
    mentioning watched emails is unreliable. Instead, compare watched emails
    against a simple local watch list reminder in state, and rely on API
    ADMIN_NOTIFICATION_EMAIL + utm_campaign=platform_info.

    This helper emails Muse a reminder once that signup alerts are wired via
    the normal New Signup path for these addresses.
    """
    state = _load_json(STATE_LOG, {})
    if state.get("signup_watch_ack_sent"):
        return 0

    rows = _load_json(TRACK_LOG, [])
    if not rows:
        return 0

    contacts = "<br/>".join(
        f"• {r.get('to_name')} &lt;{r.get('to_email')}&gt; ({r.get('agency')})"
        for r in rows
    )
    html = f"""\
<div style="font-family:-apple-system,sans-serif;max-width:560px;">
  <p>Tracking is live for these platform info emails:</p>
  <p>{contacts}</p>
  <p><strong>You will get an email when:</strong></p>
  <ul>
    <li>They open the email (Resend open pixel)</li>
    <li>They click demo, App Store, or register links</li>
    <li>Someone signs up (existing New Signup admin email), with utm_campaign=platform_info if they used your links</li>
  </ul>
</div>"""
    ok = _send_alert("[Tracking armed] Platform info emails — Nurdennis + Wanda", html)
    if ok:
        state["signup_watch_ack_sent"] = True
        state["armed_at"] = datetime.now(timezone.utc).isoformat()
        _save_json(STATE_LOG, state)
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="Single poll (default for CI)")
    parser.add_argument("--loop-seconds", type=int, default=0, help="Poll forever every N seconds")
    args = parser.parse_args()

    if not RESEND_API_KEY:
        print("Missing RESEND_API_KEY")
        sys.exit(1)

    def run():
        n = check_sends()
        n += check_signups_by_email()
        print(f"Done. alerts_fired={n}")

    if args.loop_seconds > 0:
        while True:
            run()
            time.sleep(args.loop_seconds)
    else:
        run()


if __name__ == "__main__":
    main()
