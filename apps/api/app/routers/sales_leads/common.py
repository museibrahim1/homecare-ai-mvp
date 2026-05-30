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
        # CTA banner
        '<div style="margin: 0 40px 32px; background: linear-gradient(135deg, #0d9488, #0f766e); '
        'border-radius: 12px; padding: 28px 32px; text-align: center;">'
        f'<p style="margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #ffffff;">PALM IT.</p>'
        '<p style="margin: 0 0 16px; font-size: 13px; color: rgba(255,255,255,0.85);">'
        'Record it. Transcribe it. Contract it. All in your palm.</p>'
        f'<a href="{_SITE}/#book-demo" style="display: inline-block; background-color: #ffffff; '
        f'color: {_TEAL_DARK}; text-decoration: none; font-size: 14px; font-weight: 600; '
        'padding: 12px 28px; border-radius: 8px;">Sign Up for Your 14 Day Free Trial</a>'
        '</div>'
        # Footer
        f'<div style="padding: 24px 40px; background-color: {_SLATE_100}; '
        f'border-top: 1px solid {_SLATE_200}; text-align: center;">'
        f'<a href="{_SITE}" style="text-decoration: none; display: inline-block; margin-bottom: 12px;">'
        f'<img src="{_SITE}/qr-code.png" alt="Scan to visit palmcareai.com" '
        'style="width: 72px; height: 72px; border-radius: 8px; border: 1px solid #e2e8f0;" />'
        '</a><br>'
        f'<p style="margin: 0 0 4px; font-size: 11px; color: #94a3b8;">Scan to visit palmcareai.com</p>'
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


EMAIL_TEMPLATES = {
    "warm_open": {
        "id": "warm_open",
        "name": "The Warm Open",
        "subject": "{provider_name}, how many systems is your team using?",
        "sequence_day": 1,
        "description": "Day 1 — CRM-focused intro. Discovery question about their current tools.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "Quick question",
                "How many different systems is {provider_name} using right now to manage client intake, "
                "assessments, documentation, and billing? If it's more than one, things are probably "
                "falling through the cracks."
            )
            + _section(
                "One platform for everything",
                "PalmCare AI is a single platform built for home care agencies. Client CRM, "
                "assessment pipeline, automated care plans, contract generation, billing reports, "
                "and a mobile app for field staff. Everything your team needs, in one place."
            )
            + f'<p style="{_P_MUTED}">Agencies using PalmCare are cutting onboarding time from days '
            'to minutes and saving 15+ hours a week on documentation.</p>',
            "{provider_name}",
        ),
    },
    "pattern_interrupt": {
        "id": "pattern_interrupt",
        "name": "The Pattern Interrupt",
        "subject": "what agencies in {state_full} are replacing first",
        "sequence_day": 3,
        "description": "Day 3 — CRM-focused stat punch. Shows what agencies are actually switching from.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">The #1 thing agencies replace first is not their scheduling tool. '
            'It is the patchwork of spreadsheets, paper forms, and disconnected systems they use '
            'for client intake and documentation.</p>'
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("80%", "Less onboarding time")
            + _stat_block("15hrs", "Saved per week")
            + _stat_block("1", "Platform for everything")
            + '</div>'
            + _section(
                "What PalmCare replaces",
                "Client management, assessments, care plans, contracts, billing reports, and field "
                "documentation, all in one platform with a mobile app. No more copying data "
                "between systems."
            )
            + f'<p style="{_P}">Try the full platform free for 14 days.</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">Sign Up and Get Your 14 Day Free Trial</a></div>',
            "{provider_name}",
        ),
    },
    "aspiration": {
        "id": "aspiration",
        "name": "The Aspiration",
        "subject": "close clients before you leave their home",
        "sequence_day": 7,
        "description": "Day 7 — Paints the picture. Shows the workflow transformation. Identity-driven.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "Picture this",
                "You sit down with a new client. You talk through the assessment on your phone "
                "for a few minutes. Before you leave their home, a complete care plan, "
                "assessment, and service contract are ready to sign."
            )
            + _section(
                "How it works",
                "<strong>1.</strong> Record the assessment interview on your phone<br>"
                "<strong>2.</strong> AI transcribes everything in real time<br>"
                "<strong>3.</strong> AI generates the care plan + service agreement<br>"
                "<strong>4.</strong> Contract sent to client, ready to sign"
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/fb_ad.png" '
            'alt="Before and After PalmCare AI" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + f'<p style="{_P}">No training manuals. No data entry. No delays.<br>'
            '<strong>Just tap, talk, and Palm It.</strong></p>'
            + '<p style="' + _P_MUTED + '">Want to see it work with your actual workflow?</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">Start Your 14 Day Free Trial</a></div>',
            "{provider_name}",
        ),
    },
    "proof_point": {
        "id": "proof_point",
        "name": "The Proof Point",
        "subject": "never lose a client to paperwork again",
        "sequence_day": 14,
        "description": "Day 14 — Data-driven with traction proof. Stats in their language. Competitive edge.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            + _section(
                "The paperwork problem",
                "The average home care agency spends <strong>15+ hours per week</strong> on "
                "documentation alone. That's time that should go to client visits, "
                "caregiver training, or honestly just getting home at a reasonable hour."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            + _stat_block("15hrs", "Typical weekly docs")
            + _stat_block("3hrs", "With PalmCare AI")
            + _stat_block("12hrs", "Back every week")
            + '</div>'
            + _section(
                "Why agencies are switching",
                "<strong>60+ agencies</strong> on the waitlist. "
                "<strong>24 active pilot users.</strong> "
                "<strong>300+ assessments</strong> generated with 68% accuracy improvement. "
                "No other platform does AI assessment generation, AI contract creation, "
                "and voice-to-contract. We're the first."
            )
            + '<div style="text-align: center; margin: 24px 0;">'
            f'<img src="{_GH_MARKETING}/linkedin_crm.png" '
            'alt="PalmCare AI CRM Dashboard, Pipeline, Mobile App" '
            f'style="max-width: 520px; width: 100%; border-radius: 12px; border: 1px solid {_SLATE_200};" />'
            '</div>'
            + '<p style="' + _P + '">For {provider_name}, that could mean 12 hours back. Every single week.</p>'
            + f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_SITE}/#book-demo" style="display: inline-block; '
            f'background: linear-gradient(135deg, {_TEAL}, {_TEAL_DARK}); color: #ffffff; '
            'text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; '
            'border-radius: 10px;">Start Your 14 Day Free Trial</a></div>',
            "{provider_name}",
        ),
    },
    "graceful_exit": {
        "id": "graceful_exit",
        "name": "The Graceful Exit",
        "subject": "closing the loop, {provider_name}",
        "sequence_day": 28,
        "description": "Day 28 — Short, confident, respectful. Restraint signals strength. Door stays open.",
        "body": _email_wrap(
            f'<p style="{_P}">Hi,</p>'
            f'<p style="{_P}">We have reached out a few times and know you are busy. '
            'Running {provider_name} in {city} is more than a full-time job.</p>'
            f'<p style="{_P}">We will not keep filling your inbox.</p>'
            + _section(
                "When you are ready",
                "If the timing is ever right for a faster way to handle assessments, contracts, "
                "and documentation, we are here. One tap, AI handles the rest."
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

