"""
Shared constants, email templates, and helpers for the sales_leads package.

Split out of the original monolithic sales_leads.py. `_auto_start_sequence`
is re-exported from app.routers.sales_leads (see __init__.py) because the
outreach package imports it directly.
"""

import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.sales_lead import SalesLead, LeadStatus
from app.models.analytics import EmailCampaignEvent
from app.services.email import email_service

logger = logging.getLogger(__name__)

# ─── US states for bulk import ───

ALL_US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "GU", "VI", "AS", "MP",
]




# ─── Brand colors, email wrapper, templates & state names ───

_SITE = "https://palmcareai.com"
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_CYAN = "#0891b2"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"
_GH_MARKETING = "https://raw.githubusercontent.com/museibrahim1/homecare-ai-mvp/main/apps/web/public/marketing"
_APP_STORE = "https://apps.apple.com/us/app/palm-home-care-contracts/id6766371988"
_QR_APP = f"{_GH_MARKETING}/social/palm-appstore-qr.png"
_LAUNCH_VIDEO = f"{_SITE}/launch/palm-app-launch.mp4"


def _email_wrap(body_sections: str, provider_name: str = "{provider_name}") -> str:
    """Apple-style clean email wrapper with PALM IT branding."""
    return (
        '<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, '
        'sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">'
        # Header
        '<div style="background: linear-gradient(135deg, #0d9488, #0891b2); '
        'padding: 32px 40px; text-align: center; border-radius: 0;">'
        '<p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; '
        'letter-spacing: -0.3px;">PalmCare AI</p>'
        '<p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); '
        'letter-spacing: 0.05em;">WHERE CARE MEETS INTELLIGENCE</p>'
        '</div>'
        # Body
        f'<div style="padding: 40px; color: {_SLATE_900}; font-size: 15px; line-height: 1.7;">'
        f'{body_sections}'
        '</div>'
        # Signature
        f'<div style="padding: 0 40px 32px; border-top: 1px solid {_SLATE_200}; padding-top: 24px;">'
        f'<p style="margin: 0; font-weight: 700; font-size: 15px; color: {_SLATE_900};">The PalmCare AI Team</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Palm Technologies, Inc.</p>'
        f'<p style="margin: 6px 0 0;"><a href="{_SITE}" '
        f'style="color: {_TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">'
        f'palmcareai.com</a></p>'
        '</div>'
        # Product showcase — iPhone + CRM
        '<div style="padding: 0 40px 32px; text-align: center;">'
        f'<a href="{_SITE}" style="text-decoration: none;">'
        f'<img src="{_GH_MARKETING}/hero_banner.png" '
        'alt="PalmCare AI iPhone App and CRM Dashboard" '
        'style="max-width: 520px; width: 100%; border-radius: 12px; '
        f'border: 1px solid {_SLATE_200};" />'
        '</a></div>'
        # iPhone app previews
        '<div style="padding: 0 40px 24px; text-align: center;">'
        f'<img src="{_GH_MARKETING}/iphone_home.png" alt="Home" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        f'<img src="{_GH_MARKETING}/iphone_record.png" alt="Palm It" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        f'<img src="{_GH_MARKETING}/iphone_clients.png" alt="Clients" '
        'style="width: 30%; max-width: 150px; margin: 0 4px; border-radius: 8px; vertical-align: top;" />'
        '</div>'
        # CTA banner — the app download is the ask
        '<div style="margin: 0 40px 32px; background: linear-gradient(135deg, #0d9488, #0f766e); '
        'border-radius: 12px; padding: 28px 32px; text-align: center;">'
        f'<p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #ffffff;">PALM is on the App Store.</p>'
        '<p style="margin: 0 0 16px; font-size: 13px; color: rgba(255,255,255,0.85);">'
        'It sits in on the assessment, writes the care plan, finds the billables, and builds the contract.</p>'
        f'<a href="{_APP_STORE}" style="display: inline-block; background-color: #ffffff; '
        f'color: {_TEAL_DARK}; text-decoration: none; font-size: 14px; font-weight: 700; '
        'padding: 12px 28px; border-radius: 8px;">Download PALM for iPhone</a>'
        '<p style="margin: 12px 0 0; font-size: 12px;">'
        f'<a href="{_SITE}/register" style="color: rgba(255,255,255,0.9); text-decoration: underline;">'
        'Start your 14 day free trial</a></p>'
        '</div>'
        # Footer
        f'<div style="padding: 24px 40px; background-color: {_SLATE_100}; '
        f'border-top: 1px solid {_SLATE_200}; text-align: center;">'
        f'<a href="{_APP_STORE}" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">'
        f'<img src="{_QR_APP}" alt="Scan to download PALM on the App Store" '
        'style="width: 88px; height: 88px; border-radius: 8px; border: 1px solid #e2e8f0;" />'
        '</a><br>'
        f'<p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">Scan with your iPhone camera to download PALM</p>'
        f'<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: {_SLATE_900};">'
        'PalmCare AI</p>'
        f'<p style="margin: 0 0 12px; font-size: 12px; color: {_SLATE_600};">'
        'Built for care professionals</p>'
        f'<p style="margin: 0 0 12px; font-size: 11px; color: #94a3b8;">'
        f'Palm Technologies, Inc. &middot; Omaha, NE<br>'
        f'You received this because {provider_name} is listed in public agency directories.</p>'
        '<p style="margin: 0;">'
        f'<a href="{_SITE}/privacy" style="color: #94a3b8; text-decoration: underline; '
        'font-size: 11px;">Privacy</a>'
        '&nbsp;&middot;&nbsp;'
        f'<a href="{_SITE}/unsubscribe" style="color: #94a3b8; text-decoration: underline; '
        'font-size: 11px;">Unsubscribe</a>'
        '</p></div>'
        '</div>'
    )


def _section(heading: str, body: str) -> str:
    """Apple-style content section with teal heading accent."""
    return (
        f'<div style="margin-bottom: 28px;">'
        f'<p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: {_TEAL}; '
        f'text-transform: uppercase; letter-spacing: 0.08em;">{heading}</p>'
        f'<p style="margin: 0; font-size: 15px; color: {_SLATE_900}; line-height: 1.7;">{body}</p>'
        f'</div>'
    )


def _stat_block(stat: str, label: str) -> str:
    """Inline stat block for data-driven emails."""
    return (
        f'<div style="display: inline-block; text-align: center; padding: 16px 24px; '
        f'background-color: {_SLATE_100}; border: 1px solid {_SLATE_200}; border-radius: 12px; '
        f'margin: 0 8px 12px 0;">'
        f'<div style="font-size: 28px; font-weight: 800; color: {_TEAL};">{stat}</div>'
        f'<div style="font-size: 11px; color: {_SLATE_600}; font-weight: 600; margin-top: 4px; '
        f'text-transform: uppercase; letter-spacing: 0.05em;">{label}</div>'
        f'</div>'
    )


_P = f"margin: 0 0 16px 0; color: {_SLATE_900};"
_P_MUTED = f"margin: 0 0 16px 0; color: {_SLATE_600}; font-size: 14px;"


_PALM_IT_BTN = (
    f'<div style="text-align: center; margin: 24px 0;">'
    f'<p style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: {_TEAL};">Just PALM IT.</p>'
    f'<a href="{_APP_STORE}" style="display: inline-block; '
    f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
    'text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; '
    'border-radius: 10px;">Download PALM Today</a></div>'
)

_DOWNLOAD_BTN = (
    f'<div style="text-align: center; margin: 24px 0;">'
    f'<a href="{_APP_STORE}" style="display: inline-block; '
    f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
    'text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; '
    'border-radius: 10px;">Download PALM on the App Store</a></div>'
)

EMAIL_TEMPLATES = {
    # ─── New (Jul 2026) app-download marketing emails. Used by the drip
    # sequence, the opened-reengage cron, and the broad resend. ───
    "just_palm_it": {
        "id": "just_palm_it",
        "name": "Just PALM IT",
        "subject": "stop typing what was already said out loud",
        "description": "Standalone — punchy download push. The Just PALM IT ask.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Every care assessment at {{provider_name}} gets documented twice. '
            'Once out loud in the living room, and once again at a keyboard that night.</p>'
            f'<p style="{_P}">PALM keeps the first one and deletes the second. Record the visit '
            'on your iPhone and it writes the care plan, prices the billables, and builds a '
            'contract on your state\'s rules. You review and sign.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("1", "Recording")
            + _stat_block("4", "Documents")
            + _stat_block("0", "Evenings lost")
            + '</div>'
            + f'<p style="{_P}" align="center"><strong>Don\'t type it. Just PALM IT.</strong></p>'
            + _DOWNLOAD_BTN,
            "{provider_name}",
        ),
    },
    "app_qr_download": {
        "id": "app_qr_download",
        "name": "The QR Download",
        "subject": "point your iPhone camera at this email",
        "description": "Standalone — QR-first. The fastest path from inbox to install.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">This is the shortest software pitch you will get this year. '
            'Point your iPhone camera at the code below.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_APP_STORE}" style="text-decoration: none;">'
            f'<img src="{_QR_APP}" alt="Scan to download PALM" '
            'style="width: 160px; height: 160px; border-radius: 12px; '
            f'border: 1px solid {_SLATE_200};" /></a>'
            f'<p style="margin: 8px 0 0; font-size: 13px; color: {_SLATE_600};">'
            'Scan to download PALM from the App Store</p>'
            '</div>'
            + _section(
                "What happens next",
                "Record your next client assessment in the app. PALM writes the transcript, "
                "the care plan, the billable items, and a service contract built on "
                "{state_full} rules. A staff member reviews before anything is final."
            )
            + f'<p style="{_P_MUTED}">The first 14 days are free, no card. '
            f'Prefer a link? <a href="{_APP_STORE}" style="color: {_TEAL}; font-weight: 600;">'
            'Download PALM here</a>. Just PALM IT.</p>',
            "{provider_name}",
        ),
    },
    "seven_second_demo": {
        "id": "seven_second_demo",
        "name": "The 7 Second Demo",
        "subject": "a 7 second demo of your evenings coming back",
        "description": "Standalone — launch video lead. Show, then download.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">We made the product demo 7 seconds long because that is honestly '
            'all there is to show. '
            f'<a href="{_LAUNCH_VIDEO}" style="color: {_TEAL}; font-weight: 600;">Watch it here</a>.</p>'
            + _section(
                "What you are watching",
                "A recorded assessment turning into the care plan, the billable items, and a "
                "signed service contract. No forms. No retyping. The visit was already "
                "documented out loud, and PALM was listening."
            )
            + _section(
                "Why agencies keep it",
                "The contract is drafted before the assessor leaves the driveway, so the "
                "family signs the same day. In home care, the first clear agreement on the "
                "table usually wins the client."
            )
            + _DOWNLOAD_BTN
            + f'<p style="{_P_MUTED}" align="center">Free for 14 days. Just PALM IT.</p>',
            "{provider_name}",
        ),
    },
    "evenings_back": {
        "id": "evenings_back",
        "name": "Your Evenings Back",
        "subject": "what would you do with Tuesday nights again",
        "description": "Standalone — emotional relief angle. Just PALM IT download push.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Most assessors at agencies like {{provider_name}} finish the visit at 4pm '
            'and start the paperwork at 8pm. The visit was already documented out loud. '
            'PALM was just not in the room yet.</p>'
            + _section(
                "What changes with one download",
                "Record the assessment on your iPhone. PALM writes the care plan, finds the "
                "billable items, and builds the contract on your state's rules. You review "
                "and sign before you leave the driveway."
            )
            + _PALM_IT_BTN,
            "{provider_name}",
        ),
    },
    "same_day_contract": {
        "id": "same_day_contract",
        "name": "Same Day Contract",
        "subject": "the family signed before dinner",
        "description": "Standalone — speed to signature. Just PALM IT.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "The agency that wins the client",
                "In home care, the first clear service agreement in front of the family "
                "usually wins them. Most agencies take days. The ones running PALM put the "
                "contract on the table the same afternoon as the assessment."
            )
            + _section(
                "How",
                "PALM sits in on the visit, drafts the care plan and billables from what was "
                "said, and builds a contract on {state_full} rules. A coordinator reviews, "
                "the family signs. Same day."
            )
            + _PALM_IT_BTN,
            "{provider_name}",
        ),
    },
    "one_visit_proof": {
        "id": "one_visit_proof",
        "name": "One Visit Proof",
        "subject": "try it on one visit, then decide",
        "description": "Standalone — low commitment proof. Just PALM IT.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">You do not need to switch your whole workflow to judge PALM. '
            'Run it on one assessment and compare the output to what your team produces '
            'after three hours at a keyboard.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("1", "Visit recorded")
            + _stat_block("4", "Documents drafted")
            + _stat_block("14", "Day free trial")
            + '</div>'
            + f'<p style="{_P}">Record the visit. Read the care plan, the billables, and the '
            'contract PALM hands back. If it is not better than your current process, delete '
            'the app and we will not follow up.</p>'
            + _PALM_IT_BTN,
            "{provider_name}",
        ),
    },
    "download_today": {
        "id": "download_today",
        "name": "Download Today",
        "subject": "PALM is on your App Store, download today",
        "description": "Standalone — direct urgency. QR + Just PALM IT.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">PALM is live on the App Store. It sits in on the client assessment, '
            'writes the care plan, finds the billable items, and builds the service contract. '
            'Your team reviews and signs.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_APP_STORE}" style="text-decoration: none;">'
            f'<img src="{_QR_APP}" alt="Scan to download PALM" '
            'style="width: 140px; height: 140px; border-radius: 12px; '
            f'border: 1px solid {_SLATE_200};" /></a>'
            f'<p style="margin: 8px 0 0; font-size: 13px; color: {_SLATE_600};">'
            'Scan with your iPhone camera</p>'
            '</div>'
            + _PALM_IT_BTN,
            "{provider_name}",
        ),
    },
}

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia",
}


# =============================================================================
# LIST & FILTER
# =============================================================================



# ─── Template renderer ───

def _render_template(template_str: str, data: dict) -> str:
    """Replace merge tags like {provider_name} with actual values."""
    result = template_str
    for key, value in data.items():
        result = result.replace("{" + key + "}", str(value))
    return result




# ─── Drip-sequence order & cadence ───

# Drip sequence now runs entirely on the new (Jul 2026) app-download material.
# The old May "warm_open" family was deleted. Values are cumulative day offsets
# from the first send.
SEQUENCE_ORDER = [
    "just_palm_it", "app_qr_download", "seven_second_demo", "evenings_back",
    "same_day_contract", "one_visit_proof", "download_today",
]
SEQUENCE_DAYS = {
    "just_palm_it": 0,
    "app_qr_download": 3,
    "seven_second_demo": 7,
    "evenings_back": 12,
    "same_day_contract": 18,
    "one_visit_proof": 25,
    "download_today": 33,
}

# Rotating templates for leads who opened but did not convert. Each lead gets the
# next template they have not received yet. Sent by the daily reengage cron.
OPENED_REENGAGE_ORDER = [
    "just_palm_it",
    "app_qr_download",
    "seven_second_demo",
    "evenings_back",
    "same_day_contract",
    "one_visit_proof",
    "download_today",
]
REENGAGE_CAMPAIGN_TAG = "opened-reengage-2026"
REENGAGE_MIN_DAYS_BETWEEN = 4
REENGAGE_DAILY_CAP = 40

# Broad resend: send the new app-download marketing emails to EVERY agency we have
# already contacted before today (not just openers). Rotates the same 7 standalone
# templates, tracked cross-campaign so no lead ever gets the same email twice.
MARKETING_RESEND_TAG = "marketing-resend-2026"




# ─── Auto-start drip sequence (also used by the outreach package) ───

def _auto_start_sequence(lead: SalesLead, campaign_name: str, db: Session):
    """Start the drip sequence for a lead if not already in one.

    Called automatically whenever an email is sent to a lead that
    doesn't have an active sequence. Sets sequence_step=1 and schedules
    the next email a few days later.
    """
    if lead.sequence_step and lead.sequence_step > 0:
        return
    if lead.sequence_completed:
        return

    now = datetime.now(timezone.utc)
    lead.sequence_step = 1
    lead.sequence_started_at = now
    lead.sequence_completed = False
    lead.last_template_sent = SEQUENCE_ORDER[0]
    lead.campaign_tag = campaign_name or "auto-sequence"
    lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS[SEQUENCE_ORDER[1]])

    activity = lead.activity_log or []
    activity.append({
        "action": f"Auto-sequence started (Email 1/{len(SEQUENCE_ORDER)} counted from initial send)",
        "campaign": lead.campaign_tag,
        "at": now.isoformat(),
    })
    lead.activity_log = activity

    db.add(EmailCampaignEvent(
        lead_id=lead.id,
        template_id=SEQUENCE_ORDER[0],
        campaign_tag=lead.campaign_tag,
        event_type="sent",
        subject=lead.last_email_subject or "initial outreach",
        to_email=lead.contact_email,
        created_at=now,
    ))

