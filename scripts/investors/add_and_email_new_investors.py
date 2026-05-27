#!/usr/bin/env python3
"""
Add 15 new investor/VC firms to the PalmCare AI CRM and send outreach emails.

Investors:
  Silicon Valley Bank, KGC Capital, Novel TMT, Flight Ventures, KDWC Capital,
  Golden Ventures, Cassius, Founders Fund, Maveron, Dundee Venture Capital,
  Access Venture Partners, Matchstick Ventures, Techstars, Kokopelli Capital,
  Foundry Group / Boulder Ventures
"""

import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "").strip()

API_BASE = "https://api-production-a0a2.up.railway.app"
PITCH_DECK_URL = "https://palmcareai.com/PalmCare_Full_v4.pdf"

NEW_INVESTORS = [
    {
        "fund_name": "Silicon Valley Bank (SVB)",
        "investor_type": "venture_debt",
        "website": "https://www.svb.com",
        "description": "SVB Venture Lending provides term loans for VC-backed companies to extend runway. $40B in loans outstanding. Part of First Citizens BancShares.",
        "focus_sectors": ["Technology", "Healthcare", "Life Sciences", "SaaS"],
        "focus_stages": ["Seed", "Series A", "Series B", "Growth"],
        "check_size_min": "$500K",
        "check_size_max": "$25M",
        "check_size_display": "$500K–$25M (venture debt)",
        "location": "Santa Clara, CA",
        "contact_name": "Mark Lau",
        "contact_email": "clientsupport@svb.com",
        "contact_title": "Head of Venture Capital Relationship Management",
        "contact_linkedin": "",
        "relevance_reason": "Venture debt provider for VC-backed startups. Could provide non-dilutive capital alongside equity round to extend PalmCare's runway.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "KGC Capital",
        "investor_type": "vc_fund",
        "website": "https://kgccapital.com",
        "description": "Chicago-based VC founded in 2004. 33+ investments in seed-stage US startups. Focus on early and mid-stage technology companies.",
        "focus_sectors": ["Enterprise Applications", "Software", "Financial Services", "Technology"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$1M",
        "check_size_max": "$5M",
        "check_size_display": "$1M–$5M",
        "location": "Chicago, IL",
        "contact_name": "KGC Team",
        "contact_email": "info@kgccapital.net",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Seed-stage fund with 33+ investments. Chicago-based with focus on enterprise applications and software — fits PalmCare's SaaS model.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Novel TMT Ventures",
        "investor_type": "vc_fund",
        "website": "https://www.noveltmt.com",
        "description": "TMT investment arm of the Hong Kong-based Novel Group (Silas Chou family). 51+ investments, 41 portfolio companies including The RealReal and Rent the Runway. BVI-based, NYC HQ.",
        "focus_sectors": ["Technology", "Media", "Telecom", "SaaS", "Consumer Tech"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$1M",
        "check_size_max": "$10M",
        "check_size_display": "$1M–$10M",
        "location": "New York, NY",
        "contact_name": "Novel TMT Team",
        "contact_email": "info@noveltmt.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Series A investor with strong TMT focus. 51+ investments including major consumer platforms. Could bring cross-border connections from Hong Kong parent group.",
        "portfolio_companies": ["The RealReal", "Rent the Runway", "PredictSpring"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Flight Ventures",
        "investor_type": "vc_fund",
        "website": "https://flight.vc",
        "description": "VC firm investing in prototype and early revenue stage companies. Self-described as 'the world's largest venture syndicate.'",
        "focus_sectors": ["Technology", "AI", "SaaS", "Innovation"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Cheyenne, WY / San Francisco, CA",
        "contact_name": "Flight Ventures Team",
        "contact_email": "info@flightventurescorp.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Large venture syndicate investing in early-revenue companies. PalmCare's $92K ARR and live product are a strong fit for their stage.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "KDWC Ventures",
        "investor_type": "vc_fund",
        "website": "https://kdwcventures.com",
        "description": "Chicago-based VC founded 2015. $1-10M checks in B2B technology companies in the Midwest. Focus on growth stage with scalable technology platforms.",
        "focus_sectors": ["B2B Technology", "SaaS", "Enterprise Software"],
        "focus_stages": ["Series A", "Series B"],
        "check_size_min": "$1M",
        "check_size_max": "$10M",
        "check_size_display": "$1M–$10M",
        "location": "Chicago, IL",
        "contact_name": "Jodi Kastilahn",
        "contact_email": "info@kdwcventures.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Midwest B2B tech investor. PalmCare is a Nebraska-based B2B SaaS platform with scalable unit economics — aligns with KDWC's thesis of backing Midwest tech companies.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Golden Ventures",
        "investor_type": "vc_fund",
        "website": "https://golden.ventures",
        "description": "Toronto-based seed-stage VC. $123M fund, $500K-$2M checks. Founded 2011. Invests across North America. Accepts cold pitches.",
        "focus_sectors": ["Technology", "SaaS", "AI", "Consumer"],
        "focus_stages": ["Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$2M",
        "check_size_display": "$500K–$2M",
        "location": "Toronto, ON, Canada",
        "contact_name": "Matt Golden",
        "contact_email": "hello@golden.ventures",
        "contact_title": "Founder & Managing Partner",
        "contact_linkedin": "",
        "relevance_reason": "Seed-stage fund with $123M AUM. Invests across North America with $500K-$2M checks — perfect size for PalmCare's $450K raise. Accepts cold pitches.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "CASSIUS",
        "investor_type": "vc_fund",
        "website": "https://cassius.vc",
        "description": "Early-stage VC founded 2017 by Emmanuel Seugé. Average round $4M. Jean de La Rochebrochard (1000+ investments at Kima) joined as GP. Backed Zenly, BeReal, Alan, Mistral.",
        "focus_sectors": ["Consumer", "Content", "Commerce", "AI", "SaaS"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "New York / Paris",
        "contact_name": "Jean de La Rochebrochard",
        "contact_email": "jean@2lr.com",
        "contact_title": "General Partner",
        "contact_linkedin": "https://linkedin.com/in/jeandlr",
        "relevance_reason": "Jean has 1000+ investments including Zenly (sold to Snap), BeReal (sold to Voodoo), Alan (health tech), Mistral (AI). Deep AI + health tech experience.",
        "portfolio_companies": ["Zenly", "BeReal", "Alan", "PayFit", "Mistral"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Founders Fund",
        "investor_type": "vc_fund",
        "website": "https://foundersfund.com",
        "description": "Tier 1 SF-based VC founded by Peter Thiel. Focus on hard tech, AI, defense, biotech, energy. Invests in founders with contrarian worldviews building category-defining companies.",
        "focus_sectors": ["AI", "Healthcare", "Deep Tech", "Defense", "Biotech"],
        "focus_stages": ["Seed", "Series A", "Series B", "Growth"],
        "check_size_min": "$1M",
        "check_size_max": "$100M",
        "check_size_display": "$1M–$100M",
        "location": "San Francisco, CA",
        "contact_name": "Founders Fund Team",
        "contact_email": "info@foundersfund.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Top-tier fund that backs contrarian founders. PalmCare is disrupting a $343B industry that hasn't changed in decades — fits their thesis of backing tech that transforms old industries.",
        "portfolio_companies": ["SpaceX", "Palantir", "Stripe", "Anduril"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Maveron",
        "investor_type": "vc_fund",
        "website": "https://maveron.com",
        "description": "Consumer-focused VC founded 1998 by Dan Levitan and Howard Schultz (Starbucks). Based in Seattle/SF. Invests in early-stage consumer brands disrupting traditional industries.",
        "focus_sectors": ["Consumer", "Health", "Education", "Fintech", "CPG"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$100K",
        "check_size_max": "$15M",
        "check_size_display": "$100K–$15M",
        "location": "Seattle, WA / San Francisco, CA",
        "contact_name": "Maveron Team",
        "contact_email": "info@maveron.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Consumer + health investor. Founded by Starbucks' Howard Schultz. Focus on brands disrupting traditional industries — PalmCare is disrupting home care documentation.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Dundee Venture Capital",
        "investor_type": "vc_fund",
        "website": "https://dundeeventurecapital.com",
        "description": "$40M fund writing $1M checks. $90M+ AUM, 50+ portfolio companies. 12+ year track record in commerce technology. Leads pre-seed/seed rounds of $1-4M.",
        "focus_sectors": ["Commerce", "Supply Chain", "Fintech", "D2C", "SaaS"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$1M",
        "check_size_max": "$4M",
        "check_size_display": "$1M–$4M",
        "location": "Omaha, NE",
        "contact_name": "Mark Hasebroock",
        "contact_email": "info@dundeeventurecapital.com",
        "contact_title": "Managing Partner",
        "contact_linkedin": "",
        "relevance_reason": "Omaha-based fund — PalmCare is a Nebraska C-Corp. $40M fund leading pre-seed/seed rounds. Strong Midwest tech network. Local investor is a huge advantage.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Access Venture Partners",
        "investor_type": "vc_fund",
        "website": "https://accessvp.com",
        "description": "Denver-based seed-stage VC. $250-500K initial checks. Focus on technology companies with North American presence.",
        "focus_sectors": ["Technology", "SaaS", "Enterprise"],
        "focus_stages": ["Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$500K",
        "check_size_display": "$250K–$500K",
        "location": "Denver, CO",
        "contact_name": "Access VP Team",
        "contact_email": "info@accessvp.com",
        "contact_title": "Investment Team",
        "contact_linkedin": "",
        "relevance_reason": "Denver-based seed fund with $250-500K checks — perfect fit for PalmCare's $450K raise. Focus on technology companies in North America.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Matchstick Ventures",
        "investor_type": "vc_fund",
        "website": "https://matchstick.vc",
        "description": "$30M Fund II. $500K-$1.5M checks in pre-seed/seed. 'Between the coasts' focus. Founded by Natty Zola and Ryan Broshar. 100+ investments including ScaleFactor and Branch.",
        "focus_sectors": ["Technology", "SaaS", "AI", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$1.5M",
        "check_size_display": "$500K–$1.5M",
        "location": "Minneapolis, MN / Boulder, CO",
        "contact_name": "Natty Zola",
        "contact_email": "natty@matchstick.vc",
        "contact_title": "Co-Founder & Managing Partner",
        "contact_linkedin": "",
        "relevance_reason": "Pre-seed/seed fund focused on startups between the coasts. PalmCare is a Nebraska-based company — exactly their geography thesis. 100+ investments, former founders.",
        "portfolio_companies": ["ScaleFactor", "Branch"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Techstars",
        "investor_type": "accelerator",
        "website": "https://www.techstars.com",
        "description": "Top global accelerator. $220K investment ($200K uncapped MFN SAFE + $20K for 5% equity). 21 unicorns, $30B+ raised by alumni. Free to join, 3-month program.",
        "focus_sectors": ["Technology", "AI", "Healthcare", "SaaS", "Deep Tech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$220K",
        "check_size_max": "$220K",
        "check_size_display": "$220K (accelerator)",
        "location": "Boulder, CO (global programs)",
        "contact_name": "Techstars Team",
        "contact_email": "hello@techstars.com",
        "contact_title": "Accelerator Program",
        "contact_linkedin": "",
        "relevance_reason": "Top accelerator, co-founded by Brad Feld (Foundry Group). $220K investment. Boulder-based — close to PalmCare's Nebraska home. 21 unicorns, massive network.",
        "portfolio_companies": ["Uber", "DigitalOcean", "Sendgrid", "Sphero"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Kokopelli Capital",
        "investor_type": "vc_fund",
        "website": "https://kokopelli.vc",
        "description": "Micro-VC investing in Rocky Mountain and Austin regions. $25-50K individual checks, $100-300K syndicated. Pre-Seed to Series A. Founded by Cory and Jamie Finney.",
        "focus_sectors": ["Technology", "Consumer Products", "Life Sciences", "Healthcare"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$25K",
        "check_size_max": "$300K",
        "check_size_display": "$25K–$300K",
        "location": "Boulder, CO / Austin, TX",
        "contact_name": "Cory Finney",
        "contact_email": "cory@kokopelli.vc",
        "contact_title": "Co-Founder & General Partner",
        "contact_linkedin": "",
        "relevance_reason": "Rocky Mountain micro-VC with healthcare in focus. Backs founders outside coastal hubs — PalmCare's Nebraska HQ is ideal. Deep local startup community ties.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Foundry Group (Foundry)",
        "investor_type": "vc_fund",
        "website": "https://foundry.vc",
        "description": "$3B+ AUM. Boulder-based. Co-founded by Brad Feld (also co-founded Techstars). Seed through Series B+. $5-15M checks. Flat partnership, no associates. 70 active investments.",
        "focus_sectors": ["Technology", "AI", "SaaS", "Enterprise"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$5M",
        "check_size_max": "$15M",
        "check_size_display": "$5M–$15M",
        "location": "Boulder, CO",
        "contact_name": "Brad Feld",
        "contact_email": "info@foundry.vc",
        "contact_title": "Co-Founder & Partner",
        "contact_linkedin": "https://linkedin.com/in/bfeld",
        "relevance_reason": "Premier Boulder VC co-founded by Brad Feld (Techstars). $3B+ AUM. PalmCare's Nebraska proximity to Boulder corridor is an advantage. AI + SaaS focus matches.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
]


def build_investor_email(fund_name, contact_name, description, relevance_reason, focus_stages):
    first_name = contact_name.split()[0] if contact_name and contact_name.strip() and "Team" not in contact_name else ""
    greeting = f"Hi {first_name}," if first_name else f"Hi {fund_name} Team,"

    stage_note = ", ".join(focus_stages) if focus_stages else "early-stage"

    body = f"""{greeting}

I hope this finds you well. I'm Muse Ibrahim, founder of PalmCare AI — we're building the operating system for home care agencies.

Home care is a $343B industry where millions of Medicaid and private-pay assessments still happen on paper and legacy software. PalmCare AI changes that: a caregiver records a patient assessment by voice, and our AI auto-generates the care plan, clinical notes, billable items, and a ready-to-sign service contract — in seconds.

Given {fund_name}'s focus on {stage_note} investments, I thought this might be relevant:

• Full platform live today — iOS app + web CRM + AI pipeline
• $92K ARR, $399/mo blended ARPU, 82% gross margin
• 163 agencies across 48 states in our CRM
• 50-state Medicaid/Medicare compliance knowledge base
• Raising $450K SAFE at $2.25M post-money valuation
• Solo technical founder — built the entire stack

Our pitch deck is here: {PITCH_DECK_URL}

Would you have 15 minutes this week for a quick call? I'd love to share more about what we're building.

Warm regards,
Muse Ibrahim
Founder & CEO, Palm Technologies Inc.
213-569-7693 | invest@palmtai.com
palmcareai.com"""

    html = f"""<pre style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;">{body}</pre>"""
    subject = f"{fund_name} x PalmCare AI — AI for Home Care Operations"
    return subject, html, body


def _add_individually(internal_key):
    """Fallback: add investors one at a time via the platform endpoint."""
    added = 0
    for inv in NEW_INVESTORS:
        try:
            resp = requests.post(
                f"{API_BASE}/platform/investors/batch-import",
                headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                json=[inv],
                timeout=15,
            )
            if resp.status_code in (200, 201):
                print(f"    ✓ {inv['fund_name']}")
                added += 1
            else:
                print(f"    ✗ {inv['fund_name']}: {resp.status_code} {resp.text[:100]}")
        except Exception as e:
            print(f"    ✗ {inv['fund_name']}: {e}")
    print(f"  Individual adds: {added}/{len(NEW_INVESTORS)} succeeded")


def main():
    internal_key = os.getenv("CRON_SECRET", "")

    if not resend.api_key:
        print("ERROR: RESEND_API_KEY not set in .env")
        sys.exit(1)

    print(f"Resend API key: ...{resend.api_key[-8:]}")

    # --- Step 1: Add investors to CRM via batch-import ---
    print(f"\n{'='*60}")
    print("STEP 1: Adding {0} investors to CRM".format(len(NEW_INVESTORS)))
    print(f"{'='*60}")

    if internal_key:
        try:
            resp = requests.post(
                f"{API_BASE}/platform/investors/batch-import",
                headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                json=NEW_INVESTORS,
                timeout=30,
            )
            if resp.status_code in (200, 201):
                result = resp.json()
                print(f"  Batch import result: {result}")
            else:
                print(f"  Batch import returned {resp.status_code}: {resp.text[:300]}")
                print("  Trying individual adds...")
                _add_individually(internal_key)
        except Exception as e:
            print(f"  Batch import error: {e}")
            print("  Trying individual adds...")
            _add_individually(internal_key)
    else:
        print("  CRON_SECRET not set — skipping CRM import, will just send emails")

    # --- Step 2: Send emails ---
    print(f"\n{'='*60}")
    print("STEP 2: Sending outreach emails")
    print(f"{'='*60}")

    sent_count = 0
    fail_count = 0

    for i, inv in enumerate(NEW_INVESTORS):
        email_addr = inv.get("contact_email", "")
        fund = inv["fund_name"]

        if not email_addr:
            print(f"  SKIP: {fund} — no email")
            continue

        subject, html, text = build_investor_email(
            fund,
            inv.get("contact_name", ""),
            inv.get("description", ""),
            inv.get("relevance_reason", ""),
            inv.get("focus_stages", []),
        )

        if i > 0:
            time.sleep(1.5)

        try:
            resp = resend.Emails.send({
                "from": "Muse Ibrahim <invest@send.palmtai.com>",
                "to": [email_addr],
                "subject": subject,
                "html": html,
                "text": text,
                "reply_to": "invest@palmtai.com",
            })
            eid = resp.get("id") if isinstance(resp, dict) else getattr(resp, "id", None)
            print(f"  SENT: {fund} -> {email_addr} (resend_id={eid})")
            sent_count += 1
        except Exception as e:
            print(f"  FAIL: {fund} -> {email_addr}: {e}")
            fail_count += 1
            time.sleep(2.0)

    print(f"\n{'='*60}")
    print(f"DONE: {sent_count} emails sent, {fail_count} failed")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
