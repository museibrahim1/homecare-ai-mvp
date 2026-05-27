#!/usr/bin/env python3
"""Add newly researched investors to the PalmCare AI CRM via the production API."""
import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_BASE = "https://api-production-a0a2.up.railway.app"

NEW_INVESTORS = [
    {
        "fund_name": "Equitage Ventures",
        "investor_type": "vc_fund",
        "website": "https://equitagevc.com",
        "description": "$47.3M early-stage fund 100% focused on aging and senior care tech. Backed by senior living operators, home health agencies, hospice providers. Perfect thesis match for PalmCare AI.",
        "focus_sectors": ["AgeTech", "Home Health", "Senior Care", "Digital Health"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2.5M",
        "check_size_display": "$250K–$2.5M",
        "location": "United States",
        "contact_name": "Russell Hirsch",
        "contact_email": "info@equitagevc.com",
        "contact_title": "Co-Founder & Managing Partner",
        "contact_linkedin": "https://linkedin.com/company/equitage-ventures",
        "relevance_reason": "Fund is 100% focused on aging/senior care tech. Portfolio includes home health coding, workforce management for home-based care. PalmCare AI is a perfect thesis match — voice-to-contract for home care agencies.",
        "portfolio_companies": ["Kare", "VirtuSense", "Nymbl Science"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "2048 Ventures",
        "investor_type": "vc_fund",
        "website": "https://2048.vc",
        "description": "Pre-seed fund investing $500K-$1.5M. No warm intro required — direct pitch at 2048.vc/pitch-alex. Fast Track program: funding in 10 business days.",
        "focus_sectors": ["AI", "Healthcare", "Digital Health", "SaaS", "Deep Tech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$1.5M",
        "check_size_display": "$500K–$1.5M",
        "location": "New York, NY",
        "contact_name": "Alex Iskold",
        "contact_email": "alex@2048.vc",
        "contact_title": "Founder & Managing Partner",
        "contact_linkedin": "https://linkedin.com/in/alexiskold",
        "relevance_reason": "Pre-seed fund that backs AI + healthcare. No warm intro needed. Has Pre-Seed Fast Track (10 days to funding). Alex is a 4-5x founder and former Techstars NYC MD. 150+ investments.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Tau Ventures",
        "investor_type": "vc_fund",
        "website": "https://tauventures.com",
        "description": "AI-first, seed-stage fund with $86.3M AUM. 70+ deals. Focus on digital health + enterprise AI. Founded by ex-Samsung NEXT and Norwest partner.",
        "focus_sectors": ["AI", "Healthcare", "Digital Health", "Enterprise"],
        "focus_stages": ["Seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "Menlo Park, CA",
        "contact_name": "Amit Garg",
        "contact_email": "amit@tauventures.com",
        "contact_title": "Co-Founder & Managing Partner",
        "contact_linkedin": "https://linkedin.com/in/amgarg",
        "relevance_reason": "AI-first fund with deep healthcare focus. Amit is ex-Samsung NEXT, backed $6B+ enterprise value portfolio. Perfect for PalmCare's AI + healthcare intersection.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "SeedtoB Capital",
        "investor_type": "vc_fund",
        "website": "https://seedtob.com",
        "description": "Healthcare AI focused fund. Founded by ex-Jvion founders (largest prescriptive AI company for healthcare, 9-figure exit). Invests Seed to Series A.",
        "focus_sectors": ["Healthcare AI", "Clinical AI", "Health IT"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K",
        "check_size_max": "$2M",
        "check_size_display": "$500K–$2M",
        "location": "San Francisco / Atlanta / New York",
        "contact_name": "Shantanu Nigam",
        "contact_email": "info@seedtob.com",
        "contact_title": "Managing Partner",
        "contact_linkedin": "https://linkedin.com/company/seedtob-capital",
        "relevance_reason": "Founded by healthcare AI veterans (Jvion had 9-figure exit). Deep relationships with healthcare systems. Help founders reach Series B. PalmCare's AI pipeline is exactly their thesis.",
        "portfolio_companies": ["Tern Group"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Embrace Ventures",
        "investor_type": "vc_fund",
        "website": "https://www.embraceventures.vc",
        "description": "Pre-seed and seed investor in healthcare + AI software. Portfolio includes AI agents for clinics, AI-native health information systems.",
        "focus_sectors": ["Healthcare", "AI", "SaaS"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "United States",
        "contact_name": "Embrace Team",
        "contact_email": "hello@embraceventures.vc",
        "contact_title": "Investment Team",
        "relevance_reason": "Active pre-seed/seed healthcare AI investor. Portfolio includes AI agents for clinical workflows — directly adjacent to PalmCare's voice-to-contract automation.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Boomerang Ventures",
        "investor_type": "vc_fund",
        "website": "https://www.boomerang.vc",
        "description": "Venture studio + fund in Indianapolis. Led $2.6M seed in Lizzy Care (AI at-home dementia care). Healthcare informatics and improved care models.",
        "focus_sectors": ["Healthcare", "Life Sciences", "Health IT", "Home Care"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Indianapolis, IN",
        "contact_name": "Boomerang Team",
        "contact_email": "partnerships@boomerang.vc",
        "contact_title": "Investment Team",
        "relevance_reason": "Led seed round in Lizzy Care (AI home care for dementia). Active in healthcare informatics. Indianapolis base gives Midwest healthcare network access.",
        "portfolio_companies": ["Lizzy Care", "Sonara Health"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Nina Capital",
        "investor_type": "vc_fund",
        "website": "https://www.nina.capital",
        "description": "Health tech VC based in Barcelona. Led seed in IO Health (AI documentation for post-acute/home-based care). €40M fund. GP founded Advance Medical (acquired by Teladoc).",
        "focus_sectors": ["Health Tech", "Digital Health", "Clinical Documentation", "AI"],
        "focus_stages": ["Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$2M",
        "check_size_display": "$500K–$2M",
        "location": "Barcelona, Spain",
        "contact_name": "Marc Subirats",
        "contact_email": "dealflow@nina.capital",
        "contact_title": "General Partner",
        "contact_linkedin": "https://linkedin.com/in/marc-subirats-38882a7",
        "relevance_reason": "Led seed in IO Health — AI documentation for home-based care. Marc founded Advance Medical (acquired by Teladoc). Deep understanding of clinical documentation automation.",
        "portfolio_companies": ["IO Health", "Zetta Genomics", "Methinks AI"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Beta Boom",
        "investor_type": "vc_fund",
        "website": "https://betaboom.com",
        "description": "Pre-seed/seed VC. $350-500K checks. No warm intro needed — apply at betaboom.com/apply. 6-week process. Focus on clinical AI and health equity. Must be U.S.-based outside Silicon Valley.",
        "focus_sectors": ["Healthcare", "AI", "Digital Health", "Clinical Operations"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$350K",
        "check_size_max": "$500K",
        "check_size_display": "$350K–$500K",
        "location": "Salt Lake City, UT",
        "contact_name": "Beta Boom Team",
        "contact_email": "hello@betaboom.com",
        "contact_title": "Investment Team",
        "relevance_reason": "Pre-seed healthcare VC that backs AI clinical decision support and operations optimization. No warm intro needed. Provides daily operational support (marketing, sales, product, fundraising).",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
]


def main():
    # Login to get auth token
    email = os.getenv("CEO_EMAIL", "museibrahim@palmtai.com")
    password = os.getenv("CEO_PASSWORD")

    if not password:
        print("ERROR: CEO_PASSWORD not set in .env")
        print("Set CEO_PASSWORD=<your password> in .env to authenticate")
        sys.exit(1)

    print(f"Logging in as {email}...")
    r = requests.post(f"{API_BASE}/auth/login", json={"email": email, "password": password}, timeout=15)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code}")
        sys.exit(1)

    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("Authenticated.\n")

    added = 0
    skipped = 0
    for inv in NEW_INVESTORS:
        print(f"Adding: {inv['fund_name']}...")
        try:
            resp = requests.post(f"{API_BASE}/investors/", json=inv, headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                print(f"  ✓ Added successfully")
                added += 1
            elif resp.status_code == 409 or "already exists" in resp.text.lower():
                print(f"  → Already exists, skipping")
                skipped += 1
            else:
                print(f"  ✗ Error {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"  ✗ Error: {e}")

    print(f"\nDone: {added} added, {skipped} skipped, {len(NEW_INVESTORS) - added - skipped} failed")


if __name__ == "__main__":
    main()
