#!/usr/bin/env python3
"""
Add pre-seed/seed investors relevant to PalmCare AI via the batch-import API.

Sources:
  - Beta Boom article (22 funds)
  - Seedtable pre-seed list (2 funds)
  - NFX Signal / curated AI investors (9 funds)

Usage:
  python scripts/add_investors.py
"""

import os
import sys
import requests
from pathlib import Path

API_BASE = "https://api-production-a0a2.up.railway.app"
INTERNAL_KEY = "palmcare-cron-2026"
HEADERS = {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}

INVESTORS = [
    # ── Source 1: Beta Boom article ──
    {
        "fund_name": "Beta Boom",
        "investor_type": "vc_fund",
        "website": "https://betaboom.com",
        "focus_sectors": ["Enterprise", "AI", "Digital Health"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Invests in AI and Digital Health at pre-seed — direct overlap with PalmCare AI's voice-to-contract platform for home care agencies.",
    },
    {
        "fund_name": "Forum Ventures",
        "investor_type": "vc_fund",
        "website": "https://forumvc.com",
        "focus_sectors": ["Healthcare", "SaaS", "AI"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + SaaS + AI focus at pre-seed/seed. PalmCare AI is a B2B SaaS for healthcare — triple overlap.",
    },
    {
        "fund_name": "FullCircle",
        "investor_type": "vc_fund",
        "website": "https://fullcirclefund.io",
        "focus_sectors": ["SaaS", "HR", "Healthcare"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "SaaS + Healthcare pre-seed fund. PalmCare AI is a healthcare SaaS product, strong fit.",
    },
    {
        "fund_name": "Lombardstreet Ventures",
        "investor_type": "vc_fund",
        "website": "https://lombardstreet.vc",
        "focus_sectors": ["SaaS", "Analytics", "FinTech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "medium",
        "relevance_reason": "SaaS-focused pre-seed fund. PalmCare AI is a B2B SaaS platform with analytics capabilities.",
    },
    {
        "fund_name": "Unshackled Ventures",
        "investor_type": "vc_fund",
        "website": "https://unshackledvc.com",
        "focus_sectors": ["Healthcare", "AI/ML"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + AI/ML pre-seed specialist. Directly relevant to PalmCare AI's AI-powered home care documentation.",
    },
    {
        "fund_name": "2048 Ventures",
        "investor_type": "vc_fund",
        "website": "https://2048.vc",
        "focus_sectors": ["Biotech", "Digital Health", "AI/ML"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Digital Health + AI/ML at pre-seed. PalmCare AI sits at the intersection of health tech and AI.",
    },
    {
        "fund_name": "The Fund (Everywhere Ventures)",
        "investor_type": "vc_fund",
        "website": "https://thefund.vc",
        "focus_sectors": ["Healthcare", "E-Commerce", "FinTech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare pre-seed investor with broad portfolio. PalmCare AI's home care focus aligns with their health thesis.",
    },
    {
        "fund_name": "Hustle Fund",
        "investor_type": "vc_fund",
        "website": "https://hustlefund.vc",
        "focus_sectors": ["FinTech", "Healthcare", "AI/ML"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$25K",
        "check_size_max": "$500K",
        "check_size_display": "$25K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + AI/ML at pre-seed/seed. Known for fast decisions and founder-friendly terms.",
    },
    {
        "fund_name": "1517 Fund",
        "investor_type": "vc_fund",
        "website": "https://1517fund.com",
        "focus_sectors": ["Healthcare", "SaaS", "Mobile Apps"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + SaaS + Mobile focus. PalmCare AI has both web SaaS and iOS mobile app for home care.",
    },
    {
        "fund_name": "Ascend",
        "investor_type": "vc_fund",
        "website": "https://ascend.vc",
        "focus_sectors": ["SaaS", "AI/ML", "B2B"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "B2B SaaS + AI/ML pre-seed fund. PalmCare AI is a B2B AI SaaS product — exact match.",
    },
    {
        "fund_name": "TheVentureCity",
        "investor_type": "vc_fund",
        "website": "https://theventure.city",
        "focus_sectors": ["SaaS", "AI/ML", "Healthcare"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "SaaS + AI/ML + Healthcare pre-seed fund with data-driven approach. Strong fit for PalmCare AI.",
    },
    {
        "fund_name": "Hannah Grey",
        "investor_type": "vc_fund",
        "website": "https://hannahgrey.com",
        "focus_sectors": ["Healthcare", "Education", "Wellness"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + Wellness pre-seed focus. Home care sits at the intersection of healthcare and wellness.",
    },
    {
        "fund_name": "Backstage Capital",
        "investor_type": "vc_fund",
        "website": "https://backstagecapital.com",
        "focus_sectors": ["FinTech", "Health", "EdTech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$25K",
        "check_size_max": "$500K",
        "check_size_display": "$25K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Health-focused pre-seed fund backing underrepresented founders. PalmCare AI is health tech with diverse leadership.",
    },
    {
        "fund_name": "VitalizeVC",
        "investor_type": "vc_fund",
        "website": "https://vitalize.vc",
        "focus_sectors": ["SaaS", "Analytics", "Education"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "medium",
        "relevance_reason": "SaaS + Analytics pre-seed fund. PalmCare AI's analytics and reporting features align with their thesis.",
    },
    {
        "fund_name": "XFactor Ventures",
        "investor_type": "vc_fund",
        "website": "https://xfactor.ventures",
        "focus_sectors": ["Wellness", "Healthcare"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Wellness + Healthcare pre-seed focus. Home care is a core healthcare vertical.",
    },
    {
        "fund_name": "Precursor Ventures",
        "investor_type": "vc_fund",
        "website": "https://precursorvc.com",
        "focus_sectors": ["FinTech", "Digital Health"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "San Francisco, CA",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Digital Health pre-seed specialist run by Charles Hudson. PalmCare AI is digital health for home care agencies.",
    },
    {
        "fund_name": "NFX",
        "investor_type": "vc_fund",
        "website": "https://nfx.com",
        "focus_sectors": ["Healthcare", "Marketplaces", "AI"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "San Francisco, CA",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Healthcare + AI at pre-seed/seed. Known for network-effects thesis — PalmCare AI's multi-agency platform has network effects.",
    },
    {
        "fund_name": "Chingona Ventures",
        "investor_type": "vc_fund",
        "website": "https://chingona.ventures",
        "focus_sectors": ["FinTech", "Health"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Health-focused pre-seed fund investing in diverse founders. Strong alignment with PalmCare AI's mission.",
    },
    {
        "fund_name": "The House Fund",
        "investor_type": "vc_fund",
        "website": "https://thehouse.fund",
        "focus_sectors": ["ML/AI", "Healthcare"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "Berkeley, CA",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "ML/AI + Healthcare pre-seed fund. PalmCare AI uses ML for transcription and AI for contract generation.",
    },
    {
        "fund_name": "Yes VC",
        "investor_type": "vc_fund",
        "website": "https://yes.vc",
        "focus_sectors": ["SaaS", "AI/ML"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "medium",
        "relevance_reason": "SaaS + AI/ML pre-seed fund. PalmCare AI is an AI-powered SaaS platform.",
    },
    {
        "fund_name": "Launchpad Capital",
        "investor_type": "vc_fund",
        "website": "https://launchpad.vc",
        "focus_sectors": ["FinTech", "AI/ML"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "medium",
        "relevance_reason": "AI/ML pre-seed focus. PalmCare AI leverages AI/ML across its entire pipeline.",
    },
    {
        "fund_name": "Cake Ventures",
        "investor_type": "vc_fund",
        "website": "https://cake.vc",
        "focus_sectors": ["Aging", "Women", "Future of Work"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "betaboom_list",
        "priority": "high",
        "relevance_reason": "Aging + Future of Work focus. Home care is directly tied to aging populations — PalmCare AI modernizes elderly care documentation.",
    },

    # ── Source 2: Seedtable ──
    {
        "fund_name": "Antler",
        "investor_type": "vc_fund",
        "website": "https://antler.co",
        "focus_sectors": ["Health Tech", "EdTech", "Climate Tech"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "Global",
        "source": "seedtable",
        "priority": "high",
        "relevance_reason": "Global Health Tech investor at pre-seed/seed. PalmCare AI is health tech with plans to scale nationally.",
    },
    {
        "fund_name": "Cornerstone VC",
        "investor_type": "vc_fund",
        "website": "https://cornerstonevc.co",
        "focus_sectors": ["Health Tech", "FinTech", "AI"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "seedtable",
        "priority": "high",
        "relevance_reason": "Health Tech + AI at pre-seed/seed. Direct alignment with PalmCare AI's AI-powered health tech platform.",
    },

    # ── Source 3: NFX Signal / curated AI investors ──
    {
        "fund_name": "Initialized Capital",
        "investor_type": "vc_fund",
        "website": "https://initialized.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + SaaS + Healthcare. Co-founded by Garry Tan (YC President). PalmCare AI fits all three thesis areas.",
    },
    {
        "fund_name": "Lux Capital",
        "investor_type": "vc_fund",
        "website": "https://luxcapital.com",
        "focus_sectors": ["Healthcare", "Deep Tech", "AI"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "New York, NY",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Healthcare + AI deep tech investor. PalmCare AI's Deepgram + Claude pipeline is deep tech applied to healthcare.",
    },
    {
        "fund_name": "Flybridge",
        "investor_type": "vc_fund",
        "website": "https://flybridge.com",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Boston, MA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + SaaS seed fund. PalmCare AI is an AI healthcare SaaS — triple match.",
    },
    {
        "fund_name": "Contrary Capital",
        "investor_type": "vc_fund",
        "website": "https://contrary.com",
        "focus_sectors": ["AI", "Health", "Deep Tech"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$2M",
        "check_size_display": "$100K–$2M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Health at pre-seed. Known for backing technical founders building AI-first products.",
    },
    {
        "fund_name": "Afore Capital",
        "investor_type": "vc_fund",
        "website": "https://afore.vc",
        "focus_sectors": ["AI", "SaaS", "Pre-seed"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Dedicated pre-seed specialist with AI + SaaS focus. PalmCare AI is raising pre-seed for an AI SaaS product.",
    },
    {
        "fund_name": "Day One Ventures",
        "investor_type": "vc_fund",
        "website": "https://dayoneventures.com",
        "focus_sectors": ["AI", "Health Tech"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Health Tech seed investor. PalmCare AI is an AI health tech company at the right stage.",
    },
    {
        "fund_name": "Pioneer Fund",
        "investor_type": "vc_fund",
        "website": "https://pioneer.app/fund",
        "focus_sectors": ["AI", "Health Tech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Health Tech pre-seed fund from Pioneer. PalmCare AI's AI-first approach matches their thesis.",
    },
    {
        "fund_name": "Pear VC",
        "investor_type": "vc_fund",
        "website": "https://pear.vc",
        "focus_sectors": ["AI", "Healthcare", "B2B SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Palo Alto, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + B2B SaaS at pre-seed/seed. PalmCare AI is a B2B SaaS selling AI to healthcare agencies — perfect fit.",
    },
    {
        "fund_name": "Liquid 2 Ventures",
        "investor_type": "vc_fund",
        "website": "https://liquid2.vc",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + SaaS seed fund co-founded by Joe Montana. PalmCare AI fits their investment criteria across all three sectors.",
    },
]


def main():
    print(f"\n{'='*60}")
    print("  PalmCare AI — Investor Batch Import")
    print(f"  Target: {API_BASE}")
    print(f"  Investors to add: {len(INVESTORS)}")
    print(f"{'='*60}\n")

    sources = {}
    for inv in INVESTORS:
        s = inv.get("source", "unknown")
        sources[s] = sources.get(s, 0) + 1
    for src, count in sources.items():
        print(f"  [{src}] {count} investors")
    print()

    print("[1/2] Sending batch import request...")
    try:
        resp = requests.post(
            f"{API_BASE}/platform/investors/batch-import",
            headers=HEADERS,
            json=INVESTORS,
            timeout=60,
        )
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to API. Is the server running?")
        sys.exit(1)

    if resp.status_code == 401:
        print("ERROR: Authentication failed (401). Internal key may be invalid.")
        print(f"  Response: {resp.text}")
        sys.exit(1)

    if resp.status_code != 200:
        print(f"ERROR: API returned {resp.status_code}")
        print(f"  Response: {resp.text}")
        sys.exit(1)

    data = resp.json()
    added = data.get("added", 0)
    skipped = data.get("skipped", 0)
    results = data.get("results", [])

    print(f"\n[2/2] Results:")
    print(f"  Added:   {added}")
    print(f"  Skipped: {skipped} (already existed)")
    print()

    if results:
        added_list = [r["fund_name"] for r in results if r["status"] == "added"]
        skipped_list = [r["fund_name"] for r in results if r["status"] == "skipped"]

        if added_list:
            print("  NEW investors added:")
            for name in added_list:
                print(f"    + {name}")

        if skipped_list:
            print(f"\n  Skipped (already in DB):")
            for name in skipped_list:
                print(f"    - {name}")

    print(f"\n{'='*60}")
    print(f"  DONE — {added} new investors imported")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
