"""Shared brand constants, email wrapper, and templates for the investors package."""

_SITE = "https://palmcareai.com"
_DECK_URL = "https://palmcareai.com/PalmCare_Deck.pdf"
_TEAL = "#0d9488"
_TEAL_DARK = "#0f766e"
_SLATE_900 = "#0f172a"
_SLATE_600 = "#475569"
_SLATE_200 = "#e2e8f0"
_SLATE_100 = "#f1f5f9"


def _investor_email_wrap(body_sections: str) -> str:
    """Investor-specific email wrapper — professional fundraising style."""
    return (
        '<div style="font-family: Inter, -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, '
        'sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">'
        '<div style="background: linear-gradient(135deg, #0d9488, #0891b2); '
        'padding: 32px 40px; text-align: center;">'
        '<p style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; '
        'letter-spacing: -0.3px;">PalmCare AI</p>'
        '<p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.8); '
        'letter-spacing: 0.05em;">AI-NATIVE HOME CARE DOCUMENTATION</p>'
        '</div>'
        f'<div style="padding: 40px; color: {_SLATE_900}; font-size: 15px; line-height: 1.7;">'
        f'{body_sections}'
        '</div>'
        f'<div style="padding: 0 40px 32px; border-top: 1px solid {_SLATE_200}; padding-top: 24px;">'
        f'<p style="margin: 0; font-weight: 700; font-size: 15px; color: {_SLATE_900};">Muse Ibrahim</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Founder &amp; CEO</p>'
        f'<p style="margin: 2px 0 0; font-size: 13px; color: {_TEAL};">Palm Technologies, Inc.</p>'
        f'<p style="margin: 6px 0 0;"><a href="{_SITE}" '
        f'style="color: {_TEAL}; text-decoration: none; font-size: 13px; font-weight: 500;">'
        f'palmcareai.com</a></p>'
        '</div>'
        f'<div style="padding: 24px 40px; background-color: {_SLATE_100}; '
        f'border-top: 1px solid {_SLATE_200}; text-align: center;">'
        f'<p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: {_SLATE_900};">'
        'PalmCare AI</p>'
        f'<p style="margin: 0 0 4px; font-size: 12px; color: {_SLATE_600};">'
        'Record it. Transcribe it. Contract it.</p>'
        f'<p style="margin: 0; font-size: 11px; color: #94a3b8;">'
        'Palm Technologies, Inc. &middot; Omaha, NE</p>'
        '</div>'
        '</div>'
    )


# ─── Email Templates ───

INVESTOR_EMAIL_TEMPLATES = {
    "seed_outreach": {
        "id": "seed_outreach",
        "name": "Seed Round Outreach",
        "subject": "Pre-Seed: Defining the Future of Home Care Operations",
        "description": "Primary investor outreach email for the $450K seed round with pitch deck attached.",
        "body": _investor_email_wrap(
            '<p style="margin: 0 0 16px;">Hi {contact_name},</p>'
            '<p style="margin: 0 0 16px;">I hope you\'re well. I\'m reaching out to share what we\'re building at '
            'Palm Technologies Inc, a Nebraska-based C-Corp developing an AI-powered platform that automates '
            'the patient assessment, care planning, and contracting workflow for home care agencies.</p>'
            '<p style="margin: 0 0 16px;">One of the strongest signals that this market is ready for disruption is '
            'how little has changed. Home care is a <strong>$343B industry</strong> processing millions of Medicaid and '
            'private-pay assessments every year, and nearly all of it still happens on paper, spreadsheets, '
            'and legacy software built two decades ago. The incumbents&mdash;WellSky, AxisCare, and CareTime&mdash;'
            'proved that agencies will pay for software. What they never delivered was intelligence. Not one of them '
            'has touched AI in a way to speed up processes, meaning leaving not leaving the table without a deal.</p>'
            '<p style="margin: 0 0 16px;">What the incumbents validated was the willingness to pay. What agencies are '
            'urgently asking for now is a platform that actually thinks&mdash;one that eliminates the documentation '
            'burden consuming <strong>40 to 60 percent</strong> of their staff\'s time and replaces it with automation. '
            'That is the gap PalmCare AI is filling.</p>'
            '<p style="margin: 0 0 16px;">We are raising a <strong>$450K seed round</strong> via SAFE or convertible '
            'note at a <strong>$1.8M pre-money valuation</strong>. This capital will fund our first AI engineering hire, '
            'go-to-market execution, and compliance infrastructure as we scale to 700 agencies by the end of 2027.</p>'

            f'<div style="background-color: {_SLATE_100}; border-radius: 8px; padding: 20px; margin: 24px 0;">'
            f'<p style="margin: 0 0 8px; font-weight: 700; color: {_SLATE_900};">Why this market and why now</p>'
            '<ul style="margin: 0; padding-left: 20px; color: #334155;">'
            '<li style="margin-bottom: 6px;">LLMs and voice AI are now production-ready at the cost structures '
            'vertical SaaS requires; this window just opened</li>'
            '<li style="margin-bottom: 6px;">10,000 Americans turn 65 every day through 2030, accelerating '
            'home-based care demand</li>'
            '<li style="margin-bottom: 6px;">Medicaid and Medicare Advantage are actively shifting reimbursement '
            'toward home care over institutional settings</li>'
            '<li style="margin-bottom: 0;">No competitor has an AI roadmap; this is a greenfield opportunity '
            'inside a mature, paying market</li>'
            '</ul></div>'

            f'<div style="background-color: {_SLATE_100}; border-radius: 8px; padding: 20px; margin: 24px 0;">'
            f'<p style="margin: 0 0 8px; font-weight: 700; color: {_SLATE_900};">PalmCare AI Highlights</p>'
            '<ul style="margin: 0; padding-left: 20px; color: #334155;">'
            '<li style="margin-bottom: 6px;">Full platform built and live today&mdash;AI assessment pipeline, '
            'voice documentation engine, CRM</li>'
            '<li style="margin-bottom: 6px;">$414/mo blended ARPU across mobile and full platform tiers</li>'
            '<li style="margin-bottom: 6px;">82% gross margin with strong unit economics</li>'
            '<li style="margin-bottom: 6px;">Structural retention: agencies run daily operations through the platform, '
            'switching cost is high by design</li>'
            '<li style="margin-bottom: 6px;">Founder with a rare combination: software engineer, B2B sales professional, '
            'and former home care experience</li>'
            '<li style="margin-bottom: 0;">Clean cap table&mdash;100% bootstrapped, no prior dilution</li>'
            '</ul></div>'

            '<p style="margin: 0 0 16px;">I\'ll attach our deck below. I\'d welcome the chance to walk you through '
            'what we\'re building and get your feedback.</p>'

            f'<div style="text-align: center; margin: 24px 0;">'
            f'<a href="{_DECK_URL}" style="display: inline-block; background: linear-gradient(135deg, {_TEAL}, #0891b2); '
            f'color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; '
            f'font-size: 15px; letter-spacing: -0.2px;">View Pitch Deck &rarr;</a></div>'

            f'<p style="margin: 0 0 4px;">Visit our website @ '
            f'<a href="{_SITE}" style="color: {_TEAL}; text-decoration: none; font-weight: 600;">palmcareai.com</a></p>'
            '<p style="margin: 24px 0 0; color: #64748b; font-size: 14px;">Warm regards,<br/>'
            'Muse Ibrahim<br/>Founder &amp; CEO, Palm Technologies Inc.<br/>'
            '213-569-7693 | invest@palmtai.com</p>'
        ),
    },
}


# ─── Routes ───

