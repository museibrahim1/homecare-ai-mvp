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


_DOWNLOAD_BTN = (
    f'<div style="text-align: center; margin: 24px 0;">'
    f'<a href="{_APP_STORE}" style="display: inline-block; '
    f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
    'text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; '
    'border-radius: 10px;">Download PALM on the App Store</a></div>'
)

EMAIL_TEMPLATES = {
    "warm_open": {
        "id": "warm_open",
        "name": "The Warm Open",
        "subject": "{provider_name}, the assessment can write its own contract now",
        "sequence_day": 1,
        "description": "Day 1 — App-first intro. What PALM does, one download CTA.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "One recording, four documents",
                "PALM is an iPhone app for home care agencies. It sits in on the client "
                "assessment, then writes the care plan, finds the billable items, and builds "
                "a service contract based on your state's rules. Your team reviews and signs. "
                "The paperwork that used to take hours after every visit takes minutes."
            )
            + _section(
                "Nothing changes about the visit",
                "Your assessor talks with the client the way they always have. PALM listens, "
                "and the documentation is drafted before they leave the driveway."
            )
            + _DOWNLOAD_BTN
            + f'<p style="{_P_MUTED}">The first 14 days are free. No card required.</p>',
            "{provider_name}",
        ),
    },
    "pattern_interrupt": {
        "id": "pattern_interrupt",
        "name": "The Pattern Interrupt",
        "subject": "the visit was already documented out loud",
        "sequence_day": 3,
        "description": "Day 3 — Reframe: stop retyping the conversation. Product facts, download CTA.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">Every care assessment is already documented. Someone said every '
            'word of it out loud, in the client\'s living room. The only reason your evenings '
            'go to paperwork is that nothing was listening.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("1", "Recording")
            + _stat_block("4", "Documents drafted")
            + _stat_block("50", "States covered")
            + '</div>'
            + _section(
                "What PALM drafts from one recording",
                "The transcript, the care plan, the billable items, and a service contract "
                "built on your state's rules. You review and send. No forms, no double entry."
            )
            + _DOWNLOAD_BTN
            + f'<p style="{_P_MUTED}">Try it on one visit and compare it to your current process.</p>',
            "{provider_name}",
        ),
    },
    "aspiration": {
        "id": "aspiration",
        "name": "The Aspiration",
        "subject": "close clients before you leave their home",
        "sequence_day": 7,
        "description": "Day 7 — Paints the picture, links the 7 second launch video, download CTA.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "Picture this",
                "You sit down with a new client. You talk through the assessment the way you "
                "always do. Before you leave their home, the care plan, the billables, and the "
                "service contract are drafted and ready for review."
            )
            + _section(
                "How it works",
                "<strong>1.</strong> Record the assessment on your iPhone<br>"
                "<strong>2.</strong> PALM transcribes it and keeps every voice separate<br>"
                "<strong>3.</strong> It writes the care plan and prices the billables<br>"
                "<strong>4.</strong> It builds a contract on your state's rules, ready to sign"
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/fb_ad.png" '
            'alt="Before and After PALM" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + _DOWNLOAD_BTN
            + f'<p style="{_P_MUTED}" align="center">Seven seconds is all it takes to see it: '
            f'<a href="{_LAUNCH_VIDEO}" style="color: {_TEAL}; font-weight: 600;">watch the launch video</a>.</p>',
            "{provider_name}",
        ),
    },
    "proof_point": {
        "id": "proof_point",
        "name": "The Proof Point",
        "subject": "the billables you already earned but never invoiced",
        "sequence_day": 14,
        "description": "Day 14 — Concrete product proof: billables caught, state rules. Download CTA.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "The line you never invoice",
                '"Oh, and she needs help with meals." Said once, in passing, at minute 34 of '
                "the assessment. The old way, it never makes the invoice. PALM hears it, "
                "prices it, and puts it in the agreement."
            )
            + _section(
                "Built on your state's rules",
                "PALM's service agreements follow the contract rules of the state you operate "
                "in, all 50 of them. Not a generic template with your logo pasted on top. "
                "A staff member reviews and approves before anything is final."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/linkedin_crm.png" '
            'alt="PALM dashboard, pipeline, and mobile app" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + f'<p style="{_P}">For {{provider_name}}, that is fewer missed billables and same day '
            'contracts, starting with the next visit.</p>'
            + _DOWNLOAD_BTN,
            "{provider_name}",
        ),
    },
    "graceful_exit": {
        "id": "graceful_exit",
        "name": "The Graceful Exit",
        "subject": "closing the loop, {provider_name}",
        "sequence_day": 28,
        "description": "Day 28 — Short, confident, respectful. Door stays open. App link stays.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">We have reached out a few times and know you are busy. '
            'Running {provider_name} in {city} is more than a full-time job.</p>'
            f'<p style="{_P}">We will not keep filling your inbox.</p>'
            + _section(
                "When you are ready",
                "PALM is on the App Store whenever the timing is right. Record the assessment, "
                "and it writes the care plan, the billables, and the contract. "
                f'<a href="{_APP_STORE}" style="color: {_TEAL}; font-weight: 600;">Download it here</a> '
                "and try it on one visit."
            )
            + f'<p style="{_P_MUTED}">Your next client is waiting. So are we.</p>',
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

SEQUENCE_ORDER = ["warm_open", "pattern_interrupt", "aspiration", "proof_point", "graceful_exit"]
SEQUENCE_DAYS = {
    "warm_open": 0,
    "pattern_interrupt": 2,
    "aspiration": 6,
    "proof_point": 13,
    "graceful_exit": 27,
}




# ─── Auto-start drip sequence (also used by the outreach package) ───

def _auto_start_sequence(lead: SalesLead, campaign_name: str, db: Session):
    """Start the 5-email drip sequence for a lead if not already in one.

    Called automatically whenever an email is sent to a lead that
    doesn't have an active sequence. Sets sequence_step=1 and schedules
    the next email (pattern_interrupt) in 2 days.
    """
    if lead.sequence_step and lead.sequence_step > 0:
        return
    if lead.sequence_completed:
        return

    now = datetime.now(timezone.utc)
    lead.sequence_step = 1
    lead.sequence_started_at = now
    lead.sequence_completed = False
    lead.last_template_sent = "warm_open"
    lead.campaign_tag = campaign_name or "auto-sequence"
    lead.next_email_scheduled_at = now + timedelta(days=SEQUENCE_DAYS["pattern_interrupt"])

    activity = lead.activity_log or []
    activity.append({
        "action": "Auto-sequence started (Email 1/5 counted from initial send)",
        "campaign": lead.campaign_tag,
        "at": now.isoformat(),
    })
    lead.activity_log = activity

    db.add(EmailCampaignEvent(
        lead_id=lead.id,
        template_id="warm_open",
        campaign_tag=lead.campaign_tag,
        event_type="sent",
        subject=lead.last_email_subject or "initial outreach",
        to_email=lead.contact_email,
        created_at=now,
    ))

