#!/usr/bin/env python3
"""Email this week's (Wed-Fri) new Higgsfield creatives for approval before posting.

Nothing is published here. Sends an HTML preview (creative + platform + exact caption)
via Resend so the owner can confirm first.

Usage:
    python3 scripts/social/send_thisweek_preview.py            # send
    python3 scripts/social/send_thisweek_preview.py --dry-run  # write html only
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM = os.getenv("SOCIAL_PREVIEW_FROM", "PALM Social <sales@send.palmtai.com>")
TO = os.getenv("SOCIAL_PREVIEW_TO", "museibrahim@palmtai.com,musajama89@gmail.com")

CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3F9AviGmEM8gKCWjLWCbFstSG1F"
WED = f"{CDN}/hf_20260625_023058_1112c1c1-5326-4be3-b41b-262d48d6fbb2.png"
THU = f"{CDN}/hf_20260625_023319_6157025a-0ad2-4b15-ad20-523427c0e4e0.png"
FRI = f"{CDN}/hf_20260625_023533_e52cb42d-c0e6-4ebd-b844-e34bb7b0569a.png"

POSTS = [
    {
        "day": "Wed", "date": "Jun 24", "platforms": "Instagram + Facebook",
        "fmt": "9:16 image \u00b7 pain/relief", "img": WED,
        "caption": (
            "The visit ended at 4. Why are you still documenting it? \U0001f62e\u200d\U0001f4a8\n\n"
            "PALM listens to the assessment and writes the notes, billing, and contract for you. "
            "Get your evenings back.\n\n"
            "Free 14-day trial \u2192 link in bio.\n"
            "#caregiver #homecare #burnout #smallbusiness #healthtech #homehealth"
        ),
    },
    {
        "day": "Thu", "date": "Jun 25", "platforms": "Instagram + Facebook",
        "fmt": "9:16 image \u00b7 positioning", "img": THU,
        "caption": (
            "Most \"home care software\" is a scheduler with billing bolted on. PALM is different. \U0001f590\ufe0f\n\n"
            "It's AI-native: it listens to the visit and produces the documentation \u2014 transcript, "
            "billables, notes, and a 50-state-compliant contract.\n\n"
            "Talk. Don't type. \u2192 14-day free trial, no card.\n"
            "#homecare #healthtech #homecareagency #AItools"
        ),
    },
    {
        "day": "Fri", "date": "Jun 26", "platforms": "Instagram + Facebook",
        "fmt": "1:1 image \u00b7 education / AEO", "img": FRI,
        "caption": (
            "What does a complete home-care assessment capture? \U0001f4cb\n\n"
            "Care needs, daily living (ADLs), medications, safety risks, services & hours, and rate "
            "\u2014 everything your care plan and contract need. PALM pulls all of it from one recorded "
            "conversation, automatically.\n\n"
            "Save this for your next intake. Free 14-day trial \u2192 link in bio.\n"
            "#homecare #caregiving #privateduty #aginginplace #homecarebusiness"
        ),
    },
]


def build_html() -> str:
    cards = []
    for p in POSTS:
        cap = (p["caption"].replace("&", "&amp;").replace("<", "&lt;")
               .replace(">", "&gt;").replace("\n", "<br>"))
        cards.append(f"""
        <tr><td style="padding:0 0 22px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8eb;border-radius:14px;overflow:hidden;">
            <tr><td style="background:#0a7d6b;color:#fff;padding:10px 16px;font:600 14px -apple-system,Segoe UI,Roboto,Arial;">
              {p['day']} \u00b7 {p['date']} \u2014 {p['platforms']}
            </td></tr>
            <tr><td style="padding:16px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="172" valign="top" style="padding-right:16px;">
                  <img src="{p['img']}" width="156" style="width:156px;border-radius:10px;border:1px solid #eee;display:block;" alt="creative">
                </td>
                <td valign="top" style="font:14px/1.5 -apple-system,Segoe UI,Roboto,Arial;color:#222;">
                  <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px;">{p['fmt']}</div>
                  <div style="background:#f7f8f9;border-radius:10px;padding:12px 14px;">{cap}</div>
                </td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>""")
    return f"""<!doctype html><html><body style="margin:0;background:#eef1f3;padding:24px 0;">
    <table width="660" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:16px;padding:28px 28px 8px;font-family:-apple-system,Segoe UI,Roboto,Arial;">
      <tr><td>
        <div style="font:700 20px -apple-system,Segoe UI,Roboto,Arial;color:#0a7d6b;">PALM \u2014 This week's new creatives (for your approval)</div>
        <div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial;color:#444;margin:8px 0 4px;">
          Fresh, premium creatives made with Higgsfield for <b>Wed Jun 24 \u2013 Fri Jun 26</b>.
          Nothing below is posted yet. Reply <b>"approve"</b> (or tell me what to tweak) and I'll
          publish to Instagram @palmcareai + the Facebook page. The week-of-29th set comes after.
        </div>
        <div style="font:13px -apple-system,Segoe UI,Roboto,Arial;color:#888;margin-bottom:20px;">
          Note: TikTok is video-only, so these image posts go to IG + FB; say the word if you want a video cut too.
        </div>
      </td></tr>
      {''.join(cards)}
      <tr><td style="font:12px -apple-system,Segoe UI,Roboto,Arial;color:#aaa;padding:8px 0 16px;border-top:1px solid #eee;">
        Sent automatically before publishing \u00b7 PALM Social Publisher
      </td></tr>
    </table></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--to", default=TO)
    args = ap.parse_args()

    html = build_html()
    subject = "Approve PALM creatives \u2014 this week (Wed Jun 24\u2013Fri Jun 26)"

    if args.dry_run:
        out = ROOT / "marketing" / "thisweek-preview.html"
        out.write_text(html)
        print(f"DRY RUN \u2014 wrote {out}")
        return 0
    if not RESEND_API_KEY:
        raise SystemExit("RESEND_API_KEY missing")

    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={"from": FROM, "to": [t.strip() for t in args.to.split(",") if t.strip()],
              "subject": subject, "html": html},
        timeout=60,
    )
    if r.status_code >= 400:
        print(f"ERROR {r.status_code}: {r.text}")
        return 1
    print(f"Sent: {r.json()}\nTo: {args.to}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
