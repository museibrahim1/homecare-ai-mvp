#!/usr/bin/env python3
"""
MEGA investor outreach: Load all new investors from JSON data files,
add to CRM via batch-import, and send personalized outreach emails.

Combines investors found by 4 parallel research agents + inline data.
"""

import os
import sys
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "").strip()

API_BASE = "https://api-production-a0a2.up.railway.app"
PITCH_DECK_URL = "https://palmcareai.com/PalmCare_Full_v4.pdf"
DATA_DIR = PROJECT_ROOT / "scripts" / "data"

INLINE_INVESTORS = [
    {"fund_name": "Project Voice Capital Partners", "contact_email": "bradley@pvcp.vc", "contact_name": "Bradley Metrock", "location": "Nashville, TN", "focus_stages": ["Seed"], "check_size_display": "$50K-$500K", "description": "Conversational AI and voice AI fund with Siri co-founder as venture partner", "priority": "high"},
    {"fund_name": "IA Seed Ventures", "contact_email": "hello@iasv.co", "contact_name": "Team", "location": "Berkeley, CA", "focus_stages": ["Seed"], "check_size_display": "$500K-$2M", "description": "AI-focused fund across HealthTech, Vertical AI, and Space", "priority": "high"},
    {"fund_name": "Fellows Fund", "contact_email": "alex@fellows.fund", "contact_name": "Alex Ren", "location": "Sunnyvale, CA", "focus_stages": ["Seed"], "check_size_display": "$250K-$1M", "description": "AI seed fund with 30+ AI pioneers from OpenAI and Salesforce", "priority": "high"},
    {"fund_name": "Forum Ventures", "contact_email": "info@forumvc.com", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$100K-$1M", "description": "B2B AI accelerator and venture studio, 430 companies funded", "priority": "high"},
    {"fund_name": "Recall Capital", "contact_email": "contact@recall.capital", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed"], "check_size_display": "$100K-$500K", "description": "Pre-seed B2B SaaS, AI, and fintech fund", "priority": "high"},
    {"fund_name": "Leonis Capital", "contact_email": "partners@leoniscap.com", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$500K-$2M", "description": "AI-native startups fund for technical founders", "priority": "high"},
    {"fund_name": "TipTop VC", "contact_email": "deals@tiptop.vc", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$250K-$1M", "description": "Vertical SaaS and AI founders fund", "priority": "high"},
    {"fund_name": "ScOp Ventures", "contact_email": "info@scopvc.com", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$4M", "description": "SaaS and AI companies fund targeting $400K-$2M ARR", "priority": "high"},
    {"fund_name": "INITIATE Ventures", "contact_email": "info@initiate.vc", "contact_name": "Jessica Owens", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$2M", "description": "AI-native healthcare fund", "priority": "high"},
    {"fund_name": "Conversion Capital", "contact_email": "info@conversioncapital.com", "contact_name": "Christian Lawless", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "AI, cloud infrastructure, and software/SaaS fund", "priority": "medium"},
    {"fund_name": "Decibel Partners", "contact_email": "founders@decibel.vc", "contact_name": "Team", "location": "Menlo Park, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "Early-stage software fund", "priority": "medium"},
    {"fund_name": "Basis Set Ventures", "contact_email": "lan@basisset.ventures", "contact_name": "Lan Xuezhao", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$3M", "description": "AI-native fund investing in how people work", "priority": "high"},
    {"fund_name": "Boldstart Ventures", "contact_email": "info@boldstart.vc", "contact_name": "Ed Sim", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$5M", "description": "Enterprise inception fund: AI, cybersecurity, devtools", "priority": "high"},
    {"fund_name": "NFX", "contact_email": "qed@nfx.com", "contact_name": "James Currier", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "Network-effects focused seed fund with Signal platform", "priority": "medium"},
    {"fund_name": "Contour Venture Partners", "contact_email": "businessplan@contourventures.com", "contact_name": "Matt Gorin", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$500K-$1.5M", "description": "NYC enterprise SaaS, fintech seed fund", "priority": "high"},
    {"fund_name": "Eniac Ventures", "contact_email": "advice@eniac.vc", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$1M-$3M", "description": "NYC seed VC", "priority": "medium"},
    {"fund_name": "Bain Capital Ventures", "contact_email": "ventures@baincapital.com", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "AI Apps, AI Infrastructure, Commerce, Fintech; BCV Labs AI incubator", "priority": "high"},
    {"fund_name": "Array Ventures", "contact_email": "deals@array.vc", "contact_name": "Shruti Gandhi", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$2M", "description": "Enterprise software and AI pre-seed/seed fund", "priority": "high"},
    {"fund_name": "Notation Capital", "contact_email": "hello@notation.vc", "contact_name": "Nicholas Chirls", "location": "Brooklyn, NY", "focus_stages": ["Pre-Seed"], "check_size_display": "$500K-$2M", "description": "First pre-seed fund in NYC", "priority": "high"},
    {"fund_name": "Primary Venture Partners", "contact_email": "founders@primary.vc", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$2M-$5M", "description": "NYC seed fund with 60+ person team", "priority": "high"},
    {"fund_name": "BoxGroup", "contact_email": "info@boxgroup.com", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$250K-$1M", "description": "NYC seed firm: consumer, AI, fintech", "priority": "medium"},
    {"fund_name": "Long Journey Ventures", "contact_email": "hi@longjourney.vc", "contact_name": "Lee Jacobs", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$100K-$1M", "description": "AI, fintech, health seed fund", "priority": "high"},
    {"fund_name": "Anthemis Group", "contact_email": "pitch@anthemis.com", "contact_name": "Team", "location": "London / New York", "focus_stages": ["Seed"], "check_size_display": "$200K-$3M", "description": "Fintech, AI, health, enterprise software", "priority": "high"},
    {"fund_name": "Work-Bench", "contact_email": "info@work-bench.com", "contact_name": "Jonathan Lehr", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$2M-$4M", "description": "Seed enterprise VC", "priority": "high"},
    {"fund_name": "Bonfire Ventures", "contact_email": "info@bonfirevc.com", "contact_name": "Mark Mullen", "location": "Los Angeles, CA", "focus_stages": ["Seed"], "check_size_display": "$2M-$4M", "description": "Lead seed investor for B2B SaaS and AI", "priority": "high"},
    {"fund_name": "Renegade Partners", "contact_email": "hi@renegadepartners.com", "contact_name": "Renata Quintini", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "SaaS, AI, fintech, enterprise", "priority": "medium"},
    {"fund_name": "Tribe Capital", "contact_email": "hello@tribecap.co", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "Data-driven VC, backed OpenAI", "priority": "medium"},
    {"fund_name": "Good AI Capital", "contact_email": "darwin@goodai.capital", "contact_name": "Darwin Ling", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$250K-$2M", "description": "AI for Good: healthcare, robotics, life sciences", "priority": "high"},
    {"fund_name": "500 Global", "contact_email": "ir@500.co", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$150K-$2.5M", "description": "Global early-stage fund, 3148 investments", "priority": "medium"},
    {"fund_name": "Conviction", "contact_email": "info@conviction.com", "contact_name": "Sarah Guo", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$5M", "description": "AI-native fund by ex-Greylock GP", "priority": "high"},
    {"fund_name": "Bowery Capital", "contact_email": "loren.straub@bowerycap.com", "contact_name": "Loren Straub", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$750K-$2M", "description": "B2B SaaS and vertical AI seed investor", "priority": "high"},
    {"fund_name": "Novy Ventures", "contact_email": "david@novyventures.com", "contact_name": "David", "location": "Cedar Rapids, IA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$250K-$1M", "description": "Midwest venture studio, healthcare SaaS", "priority": "high"},
    {"fund_name": "Gradient Ventures", "contact_email": "info@gradient.com", "contact_name": "Team", "location": "Mountain View, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$100K-$10M", "description": "Google/Alphabet-backed AI fund", "priority": "high"},
    {"fund_name": "Vertical Venture Partners", "contact_email": "info@vvp.vc", "contact_name": "Team", "location": "Palo Alto, CA", "focus_stages": ["Seed"], "check_size_display": "$500K-$2.5M", "description": "Vertical SaaS seed fund", "priority": "high"},
    {"fund_name": "Tusk Venture Partners", "contact_email": "info@tusk.vc", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "Early-stage tech in regulated markets", "priority": "high"},
    {"fund_name": "Glasswing Ventures", "contact_email": "info@glasswing.vc", "contact_name": "Team", "location": "Boston, MA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "AI and frontier tech for enterprise", "priority": "high"},
    {"fund_name": "Susa Ventures", "contact_email": "info@susaventures.com", "contact_name": "Chad Byers", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$5M", "description": "Seed fund, 10% unicorn rate", "priority": "high"},
    {"fund_name": "8VC", "contact_email": "info@8vc.com", "contact_name": "Joe Lonsdale", "location": "Austin, TX", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "Healthcare IT, enterprise, Palantir co-founder", "priority": "high"},
    {"fund_name": "Harlem Capital", "contact_email": "info@harlem.capital", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$1M-$2.5M", "description": "Diverse-led seed fund, $230M AUM", "priority": "high"},
    {"fund_name": "Moxxie Ventures", "contact_email": "info@moxxie.vc", "contact_name": "Katie Jacobs Stanton", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$100K-$3M", "description": "AI apps modernizing legacy industries", "priority": "high"},
    {"fund_name": "Flyover Capital", "contact_email": "info@flyovercapital.com", "contact_name": "Team", "location": "Kansas City, MO", "focus_stages": ["Seed"], "check_size_display": "$500K-$2M", "description": "Midwest early-stage tech, 49 investments across 19 states", "priority": "high"},
    {"fund_name": "MaC Venture Capital", "contact_email": "info@macventurecapital.com", "contact_name": "Marlon Nichols", "location": "Los Angeles, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$2M", "description": "Diverse founder seed fund, 100+ portfolio", "priority": "high"},
    {"fund_name": "1984 Ventures", "contact_email": "info@1984.vc", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$2M", "description": "AI for real problems: vertical SaaS, digital health", "priority": "high"},
    {"fund_name": "Khosla Ventures", "contact_email": "info@khoslaventures.com", "contact_name": "Team", "location": "Menlo Park, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "Healthcare AI and disruptive business models", "priority": "high"},
    {"fund_name": "Attack Capital", "contact_email": "info@attack.capital", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$250K-$2M", "description": "YC-backed fund investing in voice AI", "priority": "high"},
    {"fund_name": "NextView Ventures", "contact_email": "info@nextview.vc", "contact_name": "Team", "location": "San Francisco / Boston", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$250K-$4M", "description": "AI applied to real-world industries", "priority": "high"},
    {"fund_name": "Asymmetric Capital Partners", "contact_email": "info@acp.vc", "contact_name": "Team", "location": "Boston, MA", "focus_stages": ["Seed"], "check_size_display": "$500K-$2M", "description": "B2B: life sciences, healthcare, business services", "priority": "high"},
    {"fund_name": "Menlo Ventures (Anthology)", "contact_email": "info@menlovc.com", "contact_name": "Team", "location": "Menlo Park, CA", "focus_stages": ["Seed"], "check_size_display": "$100K+", "description": "$100M Anthropic partnership AI fund", "priority": "high"},
    {"fund_name": "Plug and Play Tech Center", "contact_email": "info@pnptc.com", "contact_name": "Team", "location": "Sunnyvale, CA", "focus_stages": ["Seed"], "check_size_display": "$25K-$500K", "description": "Accelerator, 200+ companies/year, healthcare focus", "priority": "medium"},
    {"fund_name": "Sapphire Ventures", "contact_email": "info@sapphireventures.com", "contact_name": "Team", "location": "Menlo Park, CA", "focus_stages": ["Seed", "Series A"], "check_size_display": "$1M-$10M", "description": "Enterprise VC, $11.3B AUM, 30+ IPOs", "priority": "medium"},
    {"fund_name": "Lux Capital", "contact_email": "info@luxcapital.com", "contact_name": "Team", "location": "New York / Menlo Park", "focus_stages": ["Seed"], "check_size_display": "$2M-$20M", "description": "AI, biotech, defense, deep tech", "priority": "medium"},
    {"fund_name": "Radical Ventures", "contact_email": "info@radical.vc", "contact_name": "Team", "location": "Toronto, Canada", "focus_stages": ["Seed"], "check_size_display": "$1M-$10M", "description": "AI-focused VC, backed Cohere", "priority": "medium"},
    {"fund_name": "Dynamo Ventures", "contact_email": "info@dynamo.vc", "contact_name": "Team", "location": "Chattanooga, TN", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$500K-$2.5M", "description": "Supply chain and industrial tech seed VC", "priority": "medium"},
    {"fund_name": "Amplo Ventures", "contact_email": "info@amplovc.com", "contact_name": "Sheel Tyle", "location": "Austin, TX", "focus_stages": ["Seed"], "check_size_display": "$500K-$3M", "description": "SaaS, consumer, healthcare global VC", "priority": "medium"},
    {"fund_name": "Soma Capital", "contact_email": "info@somacap.com", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$100K-$500K", "description": "Prolific seed investor, broad AI portfolio", "priority": "medium"},
    {"fund_name": "Fika Ventures", "contact_email": "info@fika.vc", "contact_name": "Eva Ho", "location": "Los Angeles, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "Early-stage B2B fund, $160M Fund IV", "priority": "medium"},
    {"fund_name": "Torch Capital", "contact_email": "info@torchcapital.vc", "contact_name": "Team", "location": "New York, NY", "focus_stages": ["Seed"], "check_size_display": "$500K-$3M", "description": "Tech-enabled companies transforming operations", "priority": "medium"},
    {"fund_name": "Defy Partners", "contact_email": "info@defy.vc", "contact_name": "Team", "location": "San Francisco, CA", "focus_stages": ["Seed"], "check_size_display": "$1M-$5M", "description": "Early-stage VC for exceptional entrepreneurs", "priority": "medium"},
    {"fund_name": "Picus Capital", "contact_email": "info@picuscap.com", "contact_name": "Alexander Samwer", "location": "Munich / San Francisco", "focus_stages": ["Seed"], "check_size_display": "$100K-$3M", "description": "Global early-stage, AI/frontier tech", "priority": "medium"},
    {"fund_name": "Costanoa Ventures", "contact_email": "info@costanoa.vc", "contact_name": "Greg Sands", "location": "Palo Alto, CA", "focus_stages": ["Seed"], "check_size_display": "$2M-$5M", "description": "Enterprise, fintech, applied AI seed", "priority": "medium"},
    {"fund_name": "Propellant Ventures", "contact_email": "info@propellant.vc", "contact_name": "Team", "location": "Chicago, IL", "focus_stages": ["Pre-Seed", "Seed"], "check_size_display": "$25K-$500K", "description": "Chicago pre-seed/seed healthtech fund", "priority": "medium"},
]


def build_email(fund_name, contact_name, focus_stages):
    first_name = contact_name.split()[0] if contact_name and "Team" not in contact_name and "General" not in contact_name else ""
    greeting = f"Hi {first_name}," if first_name else f"Hi {fund_name} Team,"
    stage = ", ".join(focus_stages[:2]) if focus_stages else "early-stage"

    body = f"""{greeting}

I'm Muse Ibrahim, founder of PalmCare AI — we're building the operating system for home care agencies.

Home care is a $343B industry where millions of assessments still happen on paper and legacy software. PalmCare AI changes that: record a patient assessment by voice, and our AI generates the care plan, clinical notes, billable items, and service contract — in seconds.

Given {fund_name}'s focus on {stage} investments, here are the highlights:

- Full platform live (iOS + web CRM + AI pipeline)
- $92K ARR, $399/mo ARPU, 82% gross margin
- 163 agencies across 48 states
- 50-state compliance knowledge base
- Raising $450K SAFE at $2.25M post-money
- Solo technical founder — built the entire stack

Pitch deck: {PITCH_DECK_URL}

Would you have 15 minutes this week for a quick call?

Warm regards,
Muse Ibrahim
Founder & CEO, Palm Technologies Inc.
213-569-7693 | invest@palmtai.com
palmcareai.com"""

    html = f'<pre style="font-family:-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap;color:#1a1a1a;">{body}</pre>'
    subject = f"{fund_name} x PalmCare AI — AI for Home Care Operations"
    return subject, html, body


def main():
    internal_key = os.getenv("CRON_SECRET", "")

    if not resend.api_key:
        print("ERROR: RESEND_API_KEY not set")
        sys.exit(1)

    # Load from JSON file
    json_path = DATA_DIR / "final_new_investors.json"
    file_investors = []
    if json_path.exists():
        with open(json_path) as f:
            file_investors = json.load(f)
        print(f"Loaded {len(file_investors)} investors from {json_path.name}")

    # Combine with inline investors
    all_investors = file_investors + INLINE_INVESTORS

    # Deduplicate by fund_name
    seen = set()
    unique = []
    for inv in all_investors:
        key = inv.get("fund_name", "").lower().strip()
        email = inv.get("contact_email", "")
        if key and key not in seen and email:
            seen.add(key)
            unique.append(inv)

    print(f"Total unique investors with emails: {len(unique)}")
    print(f"Resend API key: ...{resend.api_key[-8:]}")

    # Step 1: Batch import to CRM
    print(f"\n{'='*60}")
    print(f"STEP 1: Adding {len(unique)} investors to CRM")
    print(f"{'='*60}")

    if internal_key:
        batch_size = 50
        total_added = 0
        total_skipped = 0
        for i in range(0, len(unique), batch_size):
            batch = unique[i:i+batch_size]
            crm_batch = []
            for inv in batch:
                crm_batch.append({
                    "fund_name": inv["fund_name"],
                    "investor_type": inv.get("investor_type", "vc_fund"),
                    "website": inv.get("website", ""),
                    "description": inv.get("description", ""),
                    "focus_sectors": inv.get("focus_sectors", ["Technology", "Healthcare", "AI", "SaaS"]),
                    "focus_stages": inv.get("focus_stages", ["Seed"]),
                    "check_size_display": inv.get("check_size_display", ""),
                    "location": inv.get("location", ""),
                    "contact_name": inv.get("contact_name", ""),
                    "contact_email": inv.get("contact_email", ""),
                    "contact_title": inv.get("contact_title", ""),
                    "relevance_reason": inv.get("relevance_reason", inv.get("description", "")),
                    "priority": inv.get("priority", "medium"),
                    "source": "web_research_mar2026",
                })
            try:
                resp = requests.post(
                    f"{API_BASE}/platform/investors/batch-import",
                    headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                    json=crm_batch,
                    timeout=30,
                )
                if resp.status_code in (200, 201):
                    result = resp.json()
                    a = result.get("added", 0)
                    s = result.get("skipped", 0)
                    total_added += a
                    total_skipped += s
                    print(f"  Batch {i//batch_size + 1}: {a} added, {s} skipped")
                else:
                    print(f"  Batch {i//batch_size + 1}: HTTP {resp.status_code} - {resp.text[:200]}")
            except Exception as e:
                print(f"  Batch {i//batch_size + 1}: Error - {e}")

        print(f"\n  CRM totals: {total_added} added, {total_skipped} skipped")
    else:
        print("  CRON_SECRET not set — skipping CRM import")

    # Step 2: Send emails
    print(f"\n{'='*60}")
    print(f"STEP 2: Sending {len(unique)} outreach emails")
    print(f"{'='*60}")

    sent = 0
    failed = 0

    for i, inv in enumerate(unique):
        email_addr = inv.get("contact_email", "")
        fund = inv["fund_name"]

        if not email_addr:
            continue

        subject, html, text = build_email(
            fund,
            inv.get("contact_name", ""),
            inv.get("focus_stages", ["Seed"]),
        )

        if i > 0:
            time.sleep(1.0)

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
            print(f"  [{i+1}/{len(unique)}] SENT: {fund} -> {email_addr}")
            sent += 1
        except Exception as e:
            err = str(e)[:80]
            print(f"  [{i+1}/{len(unique)}] FAIL: {fund} -> {email_addr}: {err}")
            failed += 1
            time.sleep(2.0)

        if (i + 1) % 50 == 0:
            print(f"  --- Progress: {sent} sent, {failed} failed ---")

    print(f"\n{'='*60}")
    print(f"DONE: {sent} emails sent, {failed} failed out of {len(unique)} investors")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
