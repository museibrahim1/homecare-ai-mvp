"""
Canonical investor outreach email (post-launch, $250K ask).

Single source of truth for investor email copy. All send scripts import
from here so the message stays consistent with the live pitch deck
(marketing/pitch-deck-v5). Numbers must match the deck:
$250K SAFE, $199 to $1,200 per month pricing, 50 states plus DC validated.

Copy follows .cursor/rules/no-ai-slop.mdc: no em dashes, no slashes in
prose, no buzzwords, no unverifiable claims.
"""

import base64
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DECK_PATH = PROJECT_ROOT / "marketing" / "pitch-deck-v5" / "PalmCare_Deck_v5.pdf"
DECK_URL = "https://palmcareai.com/PalmCare_Deck_v5.pdf"

SUBJECT = "Seed round: home care AI, live on the App Store"


def deck_attachment():
    """Resend attachment dict for the current pitch deck."""
    content = base64.b64encode(DECK_PATH.read_bytes()).decode()
    return {"filename": "PalmCare_Deck_v5.pdf", "content": content}


def build_email(fund_name, contact_name="", focus_line=""):
    """Return (subject, html, text) for one investor.

    focus_line: optional one-liner tying the fund's thesis to PALM,
    e.g. "You back early vertical AI, so this should be on your radar."
    """
    first_name = ""
    if contact_name and not any(w in contact_name for w in ("Team", "General", "Inquir")):
        first_name = contact_name.split()[0]
    greeting = f"Hi {first_name}," if first_name else f"Hi {fund_name} Team,"

    relevance = (focus_line.strip() + "\n\n") if focus_line.strip() else ""

    body = f"""{greeting}

{relevance}Home care agencies lose up to 60% of staff time to paperwork. PalmCare AI removes most of it: a caregiver records the assessment on their phone, and our AI writes the transcript, billable items, clinical notes, and a state compliant service contract in minutes.

We just launched. The iOS app and web CRM are live, subscriptions run $199 to $1,200 per month through the App Store, and the contract engine is validated in all 50 states plus DC.

Since launch I've been driving distribution myself. The app is live for download on the App Store, and I run direct outreach to agencies across email and social every day to land the first paying customers.

I built the platform solo after 9 years in home care. I'm raising $250K on a SAFE to fund the first sales, marketing, and engineering hires. The deck is attached.

Worth a look?

Muse Ibrahim
Founder and CEO, PalmCare AI
invest@palmtai.com | palmcareai.com | 213-569-7693"""

    html = (
        '<pre style="font-family:-apple-system,BlinkMacSystemFont,Roboto,Arial,'
        'sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;'
        f'color:#1a1a1a;">{body}</pre>'
    )
    return SUBJECT, html, body
