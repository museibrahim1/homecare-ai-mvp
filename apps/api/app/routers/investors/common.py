"""Shared brand constants, email wrapper, and templates for the investors package."""

_SITE = "https://palmcareai.com"
_DECK_URL = "https://palmcareai.com/PalmCare_Full_v4.pdf"
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"


def _investor_email_wrap(body_sections: str) -> str:
    """Simple, plain email container. No banners, colored blocks, or footers."""
    return (
        '<div style="font-family: -apple-system, \'Segoe UI\', Arial, sans-serif; '
        'max-width: 560px; margin: 0 auto; color: #222222; font-size: 15px; line-height: 1.6;">'
        f'{body_sections}'
        '</div>'
    )


# ─── Email Templates ───

INVESTOR_EMAIL_TEMPLATES = {
    "seed_outreach": {
        "id": "seed_outreach",
        "name": "Seed Round Outreach",
        "subject": "PalmCare AI: AI for home care operations",
        "description": "Primary investor outreach email for the $450K seed round. Brochure and pitch deck attached.",
        "body": _investor_email_wrap(
            '<p style="margin: 0 0 16px;">Hi {contact_name},</p>'

            '<p style="margin: 0 0 16px;">I am Muse Ibrahim, founder of PalmCare AI. We build software for '
            'home care agencies. A caregiver records the client visit by voice, and our platform writes the '
            'transcript, the care notes, the billable items, and a state compliant service agreement that is '
            'ready to sign the same day.</p>'

            '<p style="margin: 0 0 16px;">Home care is a <strong>$343B industry</strong> that still runs on paper '
            'and software built two decades ago. Agencies already pay for tools like WellSky and AxisCare, so the '
            'willingness to pay is proven. What none of them offer is intelligence. Documentation still consumes '
            '<strong>40 to 60 percent</strong> of staff time, and that is the work we take off their plate.</p>'

            '<p style="margin: 0 0 16px;">The platform is built and live today. It runs the full assessment '
            'pipeline, the voice documentation engine, and the CRM. Gross margin is <strong>82 percent</strong>, '
            'and agencies run daily operations inside the product, so retention is strong by design.</p>'

            '<p style="margin: 0 0 16px;">We are raising <strong>$450K on a SAFE</strong> to make our first AI '
            'engineering hire, grow the customer base, and expand compliance coverage. The cap table is clean and '
            'fully bootstrapped with no prior dilution.</p>'

            '<p style="margin: 0 0 16px;">I attached our brochure and pitch deck. You can also '
            f'<a href="{_DECK_URL}" style="color: {_TEAL};">view the deck online</a>. '
            'I would welcome a short call to walk you through it and hear your thoughts.</p>'

            '<p style="margin: 24px 0 0;">Warm regards,<br/>'
            'Muse Ibrahim<br/>'
            'Founder and CEO, Palm Technologies Inc.<br/>'
            'invest@palmtai.com<br/>'
            'palmcareai.com</p>'
        ),
    },
}


# ─── Routes ───

