#!/usr/bin/env python3
"""Email a preview of the upcoming week's social posts for approval BEFORE anything is posted.

Nothing is published by this script. It compiles the planned week (platforms, day/time,
creative preview, and the exact caption) into an HTML email and sends it via Resend so the
owner can confirm each post first.

Usage:
    python3 scripts/social/send_week_preview.py                 # send for the next Mon-Sun
    python3 scripts/social/send_week_preview.py --start 2026-06-29
    python3 scripts/social/send_week_preview.py --to you@x.com  # override recipient(s)
    python3 scripts/social/send_week_preview.py --dry-run       # print HTML, don't send
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = os.getenv("SOCIAL_PREVIEW_FROM", "PALM Social <sales@send.palmtai.com>")
DEFAULT_TO = os.getenv(
    "SOCIAL_PREVIEW_TO", "museibrahim@palmtai.com,musajama89@gmail.com"
)

MEDIA = "https://palmcareai.com/marketing/social"
SQUARE = f"{MEDIA}/ad-square-how-it-works.png"
VERTICAL = f"{MEDIA}/ad-vertical-talk-dont-type.png"
VIDEO = f"{MEDIA}/ad-video-pipeline-9x16.mp4"

# Mon-Sun plan mirroring marketing/content-calendar-week.md.
# preview = image URL shown in the email; video days use the vertical still as the cover.
WEEK = [
    {
        "dow": "Mon", "pillar": "Demo", "format": "Vertical video (9:16)",
        "platforms": "TikTok + IG Reels + FB", "time": "8\u20139am ET (TikTok also 6\u20138pm)",
        "preview": VERTICAL, "is_video": True, "asset": "pipeline video (cover: Talk. Don't type.)",
        "caption": (
            "Your assessment is the data. Stop entering it twice. \U0001f590\ufe0f\n"
            "PALM records the client visit and writes the transcript, billing items, clinical "
            "notes, and a ready-to-sign care agreement \u2014 in minutes, not after-hours.\n"
            "\u25b6\ufe0f 14-day free trial \u00b7 no credit card \u00b7 built only for home care.\n"
            "#homecare #homehealth #caregiving #healthcareAI"
        ),
    },
    {
        "dow": "Tue", "pillar": "Demo / Education", "format": "Square image (1:1)",
        "platforms": "IG + FB feed", "time": "8\u20139am or 12pm ET",
        "preview": SQUARE, "is_video": False, "asset": "ad-square-how-it-works.png",
        "caption": (
            "From conversation to contract. \U0001f590\ufe0f\n\n"
            "Three steps. That's the whole workflow:\n"
            "1) Record the visit\n2) AI extracts the details\n3) Contract ready to sign \u2705\n\n"
            "No forms to learn. No double entry. Just talk, review, send.\n"
            "Try it free for 14 days (no card needed) \u2014 link in bio.\n"
            "#homecareagency #homecarebusiness #seniorcare #healthtech"
        ),
    },
    {
        "dow": "Wed", "pillar": "Pain / relief", "format": "Vertical video (9:16)",
        "platforms": "TikTok + IG Reels", "time": "12pm or 6\u20138pm ET",
        "preview": VERTICAL, "is_video": True, "asset": "pipeline video (hook B: \"It's 9pm\")",
        "caption": (
            "The visit ended at 4. Why are you still documenting it? \U0001f62e\u200d\U0001f4a8\n"
            "PALM listens to the assessment and writes the notes, billing, and contract for you. "
            "Get your evenings back.\n"
            "Free 14-day trial \u2192 link in bio.\n"
            "#caregiver #homecare #burnout #smallbusiness #healthtech #homehealth"
        ),
    },
    {
        "dow": "Thu", "pillar": "Positioning", "format": "Vertical image (9:16)",
        "platforms": "IG + FB feed/story", "time": "8\u20139am ET",
        "preview": VERTICAL, "is_video": False, "asset": "ad-vertical-talk-dont-type.png",
        "caption": (
            "Most \"home care software\" is a scheduler with billing bolted on. PALM is different.\n"
            "It's AI-native: it listens to the visit and produces the documentation \u2014 transcript, "
            "billables, notes, and a 50-state-compliant contract.\n"
            "Talk. Don't type. \U0001f590\ufe0f \u2192 14-day free trial, no card.\n"
            "#homecare #healthtech #homecareagency #AItools"
        ),
    },
    {
        "dow": "Fri", "pillar": "Education / AEO", "format": "Square image (1:1)",
        "platforms": "IG + FB feed", "time": "8\u20139am or 12pm ET",
        "preview": SQUARE, "is_video": False, "asset": "ad-square-how-it-works.png",
        "caption": (
            "What does a complete home-care assessment capture? Care needs, ADLs, medications, "
            "safety risks, services, hours & rate \u2014 everything your care plan and contract need.\n"
            "PALM pulls all of it from one recorded conversation, automatically.\n"
            "Save this for your next intake. \U0001f4cc\n"
            "Free 14-day trial \u2192 link in bio.\n"
            "#homecare #caregiving #privateduty #aginginplace #homecarebusiness"
        ),
    },
    {
        "dow": "Sat", "pillar": "Trust", "format": "Vertical video (9:16)",
        "platforms": "TikTok", "time": "10\u201311am ET",
        "preview": VERTICAL, "is_video": True, "asset": "pipeline video (hook C: \"Is it secure?\")",
        "caption": (
            "\"Is it secure?\" Yes. \U0001f512 256-bit encryption, role-based access, HIPAA-aligned, "
            "and built only for US home care \u2014 all 50 states.\n"
            "Record the visit, get the contract, keep PHI protected.\n"
            "14-day free trial \u2192 link in bio.\n"
            "#homecare #hipaa #healthtech #caregiver #seniorcare #homehealth"
        ),
    },
    {
        "dow": "Sun", "pillar": "Pain / relief (soft CTA)", "format": "Vertical image (9:16)",
        "platforms": "IG + FB story", "time": "10\u201311am ET",
        "preview": VERTICAL, "is_video": False, "asset": "ad-vertical-talk-dont-type.png",
        "caption": (
            "One recorded visit = your notes, your billing, and a signed-ready contract.\n"
            "Spend Monday with clients, not paperwork. \U0001f590\ufe0f\n"
            "Start free \u2192 link in bio.\n"
            "#homecare #caregiving #homecareagency #aginginplace"
        ),
    },
]


def next_monday(today: dt.date) -> dt.date:
    days = (7 - today.weekday()) % 7
    return today + dt.timedelta(days=days or 7)


def build_html(start: dt.date) -> str:
    cards = []
    for i, p in enumerate(WEEK):
        date = start + dt.timedelta(days=i)
        cap_html = p["caption"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
        video_note = (
            '<div style="font-size:12px;color:#0a7d6b;margin-top:6px;">'
            '\u25b6\ufe0f Video post \u2014 cover shown; full clip: '
            f'<a href="{VIDEO}" style="color:#0a7d6b;">ad-video-pipeline-9x16.mp4</a></div>'
            if p["is_video"] else ""
        )
        cards.append(f"""
        <tr><td style="padding:0 0 22px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8eb;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0a7d6b;color:#fff;padding:10px 16px;font:600 14px -apple-system,Segoe UI,Roboto,Arial;">
                {p['dow']} \u00b7 {date.strftime('%b %-d')} \u2014 {p['platforms']}
                <span style="float:right;font-weight:400;opacity:.9;">{p['time']}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px;">
                <table width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="160" valign="top" style="padding-right:16px;">
                    <img src="{p['preview']}" width="144" style="width:144px;border-radius:10px;border:1px solid #eee;display:block;" alt="creative preview">
                  </td>
                  <td valign="top" style="font:14px/1.5 -apple-system,Segoe UI,Roboto,Arial;color:#222;">
                    <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.04em;">{p['format']} \u00b7 {p['pillar']}</div>
                    <div style="font-size:12px;color:#888;margin:2px 0 10px;">Asset: {p['asset']}</div>
                    <div style="background:#f7f8f9;border-radius:10px;padding:12px 14px;">{cap_html}</div>
                    {video_note}
                  </td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td></tr>""")
    end = start + dt.timedelta(days=6)
    return f"""<!doctype html><html><body style="margin:0;background:#eef1f3;padding:24px 0;">
    <table width="640" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;padding:28px 28px 8px;font-family:-apple-system,Segoe UI,Roboto,Arial;">
      <tr><td>
        <div style="font:700 20px -apple-system,Segoe UI,Roboto,Arial;color:#0a7d6b;">PALM \u2014 Social plan for your approval</div>
        <div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial;color:#444;margin:8px 0 4px;">
          Week of <b>{start.strftime('%B %-d')} \u2013 {end.strftime('%B %-d, %Y')}</b>.
          Nothing below has been posted. Reply <b>"approve all"</b>, or tell me which days to
          change/skip, and I'll only post what you confirm.
        </div>
        <div style="font:13px -apple-system,Segoe UI,Roboto,Arial;color:#888;margin-bottom:20px;">
          Accounts: Facebook \u00b7 Instagram @palmcareai \u00b7 TikTok (Threads added once its token is set).
        </div>
      </td></tr>
      {''.join(cards)}
      <tr><td style="font:12px -apple-system,Segoe UI,Roboto,Arial;color:#aaa;padding:8px 0 16px;border-top:1px solid #eee;">
        Sent automatically before publishing \u00b7 PALM Social Publisher
      </td></tr>
    </table></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", help="YYYY-MM-DD (defaults to next Monday)")
    ap.add_argument("--to", default=DEFAULT_TO, help="Comma-separated recipients")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    start = dt.date.fromisoformat(args.start) if args.start else next_monday(dt.date.today())
    html = build_html(start)
    end = start + dt.timedelta(days=6)
    subject = f"Approve PALM social posts \u2014 week of {start.strftime('%b %-d')}\u2013{end.strftime('%b %-d')}"

    if args.dry_run:
        out = PROJECT_ROOT / "marketing" / "week-preview.html"
        out.write_text(html)
        print(f"DRY RUN \u2014 wrote {out}\nSubject: {subject}\nTo: {args.to}")
        return 0

    if not RESEND_API_KEY:
        raise SystemExit("RESEND_API_KEY missing in .env")

    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={
            "from": FROM,
            "to": [t.strip() for t in args.to.split(",") if t.strip()],
            "subject": subject,
            "html": html,
        },
        timeout=60,
    )
    if r.status_code >= 400:
        print(f"ERROR {r.status_code}: {r.text}")
        return 1
    print(f"Sent: {r.json()}\nTo: {args.to}\nSubject: {subject}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
