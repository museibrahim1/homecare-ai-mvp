#!/usr/bin/env python3
"""
Add pre-seed/seed investors (Batch 2) to PalmCare AI CRM.

Sources:
  - NFX Signal top AI pre-seed angels (3)
  - NFX Signal firms list + web research (42 VC funds)

Usage:
  python scripts/add_investors_batch2.py
"""

import sys
import requests

API_BASE = "https://api-production-a0a2.up.railway.app"
INTERNAL_KEY = "palmcare-cron-2026"
HEADERS = {"X-Internal-Key": INTERNAL_KEY, "Content-Type": "application/json"}

INVESTORS = [
    # ── Angel Investors / Solo-Capitalists (NFX Signal) ──
    {
        "fund_name": "LAUNCH (Jason Calacanis)",
        "investor_type": "angel",
        "website": "https://launch.co",
        "focus_sectors": ["AI", "SaaS", "Consumer Health", "Sales & CRM"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$5M",
        "check_size_display": "$100K–$5M (sweet spot $1.5M)",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Jason Calacanis invests heavily in AI + SaaS at pre-seed. PalmCare AI is an AI-powered SaaS for healthcare — his LAUNCH fund has backed similar B2B AI tools.",
    },
    {
        "fund_name": "Streamlined Ventures (Ullas Naik)",
        "investor_type": "angel",
        "website": "https://streamlinedventures.com",
        "focus_sectors": ["AI", "Sales & CRM", "Developer Tools"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K (sweet spot $300K)",
        "location": "Palo Alto, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Ullas Naik focuses on AI + CRM tools — PalmCare AI is essentially an AI-powered CRM for home care agencies with voice-to-contract automation.",
    },
    {
        "fund_name": "Scott Belsky (Angel)",
        "investor_type": "angel",
        "website": "https://scottbelsky.com",
        "focus_sectors": ["AI", "SaaS", "Developer Tools"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K (sweet spot $100K)",
        "location": "New York, NY",
        "source": "nfx_signal",
        "priority": "medium",
        "relevance_reason": "Scott Belsky (Adobe CPO, Behance founder) backs AI + SaaS products. PalmCare AI's AI-first design approach aligns with his product-focused investing.",
    },

    # ── VC Firms (NFX Signal + web research) ──
    {
        "fund_name": "1984 Ventures",
        "investor_type": "vc_fund",
        "website": "https://1984.vc",
        "focus_sectors": ["AI", "SaaS", "B2B"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + B2B SaaS pre-seed/seed fund. PalmCare AI is a B2B AI SaaS product for healthcare — strong thesis alignment.",
    },
    {
        "fund_name": "305 Ventures",
        "investor_type": "vc_fund",
        "website": "https://305ventures.com",
        "focus_sectors": ["AI", "HealthTech", "FinTech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "Miami, FL",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + HealthTech pre-seed fund based in Miami. PalmCare AI is AI-powered health tech with a strong Florida agency base.",
    },
    {
        "fund_name": "Plug and Play Tech Center",
        "investor_type": "vc_fund",
        "website": "https://plugandplaytechcenter.com",
        "focus_sectors": ["Healthcare", "AI", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$25K",
        "check_size_max": "$500K",
        "check_size_display": "$25K–$500K",
        "location": "Sunnyvale, CA",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Global accelerator with dedicated Healthcare + AI verticals. PalmCare AI fits both verticals — AI-powered healthcare documentation platform.",
    },
    {
        "fund_name": "SOSV",
        "investor_type": "vc_fund",
        "website": "https://sosv.com",
        "focus_sectors": ["Health Tech", "AI", "Deep Tech"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$1M",
        "check_size_display": "$50K–$1M",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Health Tech + AI accelerator running HAX and IndieBio programs. PalmCare AI's deep tech AI pipeline (Deepgram + Claude) fits their thesis.",
    },
    {
        "fund_name": "Sequoia Scout / Arc",
        "investor_type": "vc_fund",
        "website": "https://sequoiacap.com/arc",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "Menlo Park, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Sequoia's pre-seed program targets AI + Healthcare startups. PalmCare AI is building AI infrastructure for a $100B+ home care market.",
    },
    {
        "fund_name": "FJ Labs",
        "investor_type": "vc_fund",
        "website": "https://fjlabs.com",
        "focus_sectors": ["AI", "SaaS", "Marketplaces"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "New York, NY",
        "source": "nfx_signal",
        "priority": "medium",
        "relevance_reason": "AI + SaaS investor with marketplace expertise. PalmCare AI is a B2B SaaS with marketplace potential connecting agencies and caregivers.",
    },
    {
        "fund_name": "Indie.vc",
        "investor_type": "vc_fund",
        "website": "https://indie.vc",
        "focus_sectors": ["SaaS", "B2B", "AI"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "SaaS + B2B pre-seed fund with founder-friendly terms. PalmCare AI is a revenue-generating B2B SaaS ($92K ARR).",
    },
    {
        "fund_name": "Slow Ventures",
        "investor_type": "vc_fund",
        "website": "https://slow.co",
        "focus_sectors": ["AI", "Healthcare", "Consumer"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare at pre-seed/seed. Known for patient capital — aligns with PalmCare AI's methodical approach to capturing the home care market.",
    },
    {
        "fund_name": "Village Global",
        "investor_type": "vc_fund",
        "website": "https://villageglobal.vc",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + SaaS fund backed by Bill Gates, Jeff Bezos, and Mark Zuckerberg. PalmCare AI fits all three focus areas.",
    },
    {
        "fund_name": "Array Ventures",
        "investor_type": "vc_fund",
        "website": "https://array.vc",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + SaaS + Healthcare seed fund. PalmCare AI is an AI SaaS platform for healthcare agencies — triple match.",
    },
    {
        "fund_name": "Homebrew",
        "investor_type": "vc_fund",
        "website": "https://homebrew.co",
        "focus_sectors": ["AI", "SaaS", "B2B Software"],
        "focus_stages": ["seed"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Premier seed fund investing in AI + B2B SaaS. PalmCare AI is B2B AI SaaS with $92K ARR — fits their thesis of 'bottom-up' enterprise adoption.",
    },
    {
        "fund_name": "Resolute Ventures",
        "investor_type": "vc_fund",
        "website": "https://resolute.vc",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + SaaS at pre-seed/seed. PalmCare AI checks all three boxes — AI-powered SaaS for healthcare agencies.",
    },
    {
        "fund_name": "Dream Machine Ventures",
        "investor_type": "vc_fund",
        "website": "https://dream-machine.vc",
        "focus_sectors": ["AI", "Health Tech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Health Tech pre-seed specialist. PalmCare AI is exactly at this intersection — AI-first health tech for home care.",
    },
    {
        "fund_name": "Founder Collective",
        "investor_type": "vc_fund",
        "website": "https://foundercollective.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Cambridge, MA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + SaaS + Healthcare seed fund. Known for being founder-first — PalmCare AI's solo founder story and $92K ARR demonstrate strong execution.",
    },
    {
        "fund_name": "BoxGroup",
        "investor_type": "vc_fund",
        "website": "https://boxgroup.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "New York, NY",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + SaaS + Healthcare pre-seed/seed fund. Early backer of many breakout companies — PalmCare AI fits their portfolio profile.",
    },
    {
        "fund_name": "Tau Ventures",
        "investor_type": "vc_fund",
        "website": "https://tauventures.com",
        "focus_sectors": ["AI", "Healthcare", "Deep Tech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + Deep Tech pre-seed fund. PalmCare AI's deep tech stack (Deepgram ASR + Claude AI) applied to healthcare is a direct match.",
    },
    {
        "fund_name": "Correlation Ventures",
        "investor_type": "vc_fund",
        "website": "https://correlationvc.com",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Data-driven co-investor in AI + Healthcare + SaaS deals. Fast decisions with algorithm-based investing — PalmCare AI's metrics ($92K ARR) speak clearly.",
    },
    {
        "fund_name": "Right Side Capital Management",
        "investor_type": "vc_fund",
        "website": "https://rightsidecapital.com",
        "focus_sectors": ["AI", "SaaS", "B2B"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "Quantitative pre-seed fund investing in AI + SaaS. PalmCare AI is an AI SaaS company at the right stage for their portfolio.",
    },
    {
        "fund_name": "Alumni Ventures",
        "investor_type": "vc_fund",
        "website": "https://av.vc",
        "focus_sectors": ["AI", "Healthcare", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "One of the most active VCs in the US with AI + Healthcare focus. PalmCare AI fits their thesis and stage requirements.",
    },
    {
        "fund_name": "Great Oaks Venture Capital",
        "investor_type": "vc_fund",
        "website": "https://greatoaksvc.com",
        "focus_sectors": ["Healthcare", "AI", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "New York, NY",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Healthcare + AI + SaaS fund. PalmCare AI's voice-to-contract platform for home care is healthcare SaaS powered by AI.",
    },
    {
        "fund_name": "Kindred Ventures",
        "investor_type": "vc_fund",
        "website": "https://kindredventures.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "AI + SaaS + Healthcare seed investor. PalmCare AI's $450K SAFE round at $2.25M valuation fits their check size.",
    },
    {
        "fund_name": "Wischoff Ventures",
        "investor_type": "vc_fund",
        "website": "https://wischoff.com",
        "focus_sectors": ["SaaS", "AI", "B2B"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$25K",
        "check_size_max": "$250K",
        "check_size_display": "$25K–$250K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "SaaS + AI pre-seed micro-fund. PalmCare AI is a B2B AI SaaS with early revenue traction — fits their focused portfolio.",
    },
    {
        "fund_name": "Notation Capital",
        "investor_type": "vc_fund",
        "website": "https://notation.vc",
        "focus_sectors": ["Healthcare", "AI", "Blockchain"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "Brooklyn, NY",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Healthcare + AI pre-seed fund based in NYC. PalmCare AI is AI healthcare at the pre-seed stage — direct alignment.",
    },
    {
        "fund_name": "SV Angel",
        "investor_type": "vc_fund",
        "website": "https://svangel.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Legendary early-stage fund (backed Google, Airbnb). AI + SaaS + Healthcare focus — PalmCare AI is all three in one product.",
    },
    {
        "fund_name": "Incisive Ventures",
        "investor_type": "vc_fund",
        "website": "https://incisive.vc",
        "focus_sectors": ["AI", "Healthcare", "B2B SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "AI + Healthcare + B2B SaaS is their exact thesis. PalmCare AI is a B2B SaaS product using AI to automate healthcare documentation.",
    },
    {
        "fund_name": "Khosla Ventures",
        "investor_type": "vc_fund",
        "website": "https://khoslaventures.com",
        "focus_sectors": ["Healthcare", "AI", "Clean Tech"],
        "focus_stages": ["seed"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "Menlo Park, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Vinod Khosla's fund has a strong Healthcare + AI thesis. PalmCare AI's AI-powered healthcare platform aligns with their 'reimagine healthcare' mandate.",
    },
    {
        "fund_name": "GV (Google Ventures)",
        "investor_type": "vc_fund",
        "website": "https://gv.com",
        "focus_sectors": ["Healthcare", "AI", "Life Sciences"],
        "focus_stages": ["seed"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "Mountain View, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Google's venture arm with dedicated Healthcare + AI investing. PalmCare AI uses Google-adjacent tech (Deepgram, Claude) to transform healthcare workflows.",
    },
    {
        "fund_name": "Rock Health",
        "investor_type": "vc_fund",
        "website": "https://rockhealth.com",
        "focus_sectors": ["Digital Health", "AI", "Healthcare"],
        "focus_stages": ["seed"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "San Francisco, CA",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "THE premier digital health seed fund. PalmCare AI is digital health for home care agencies — this is their exact mandate. Top priority target.",
    },
    {
        "fund_name": "StartUp Health",
        "investor_type": "vc_fund",
        "website": "https://startuphealth.com",
        "focus_sectors": ["Health Tech", "AI", "Digital Health"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "New York, NY",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Health Tech accelerator/fund with 450+ portfolio companies. PalmCare AI's mission to modernize home care aligns with their Health Moonshots initiative.",
    },
    {
        "fund_name": "First Round Capital",
        "investor_type": "vc_fund",
        "website": "https://firstround.com",
        "focus_sectors": ["AI", "SaaS", "Healthcare"],
        "focus_stages": ["seed"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Top-tier seed fund with AI + Healthcare investments. PalmCare AI's early traction ($92K ARR, 163 agencies) matches their seed criteria.",
    },
    {
        "fund_name": "Gradient Ventures (Google AI fund)",
        "investor_type": "vc_fund",
        "website": "https://gradient.google",
        "focus_sectors": ["AI", "Healthcare", "Machine Learning"],
        "focus_stages": ["seed"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "Mountain View, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Google's AI-focused fund — they specifically back AI-first companies. PalmCare AI's entire pipeline is AI (Deepgram ASR + Claude LLM). Perfect fit.",
    },
    {
        "fund_name": "General Catalyst",
        "investor_type": "vc_fund",
        "website": "https://generalcatalyst.com",
        "focus_sectors": ["Healthcare", "AI", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "Cambridge, MA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Major Healthcare + AI investor behind Livongo, Hims, Ro. PalmCare AI is building the AI infrastructure for home care — a massive underserved vertical.",
    },
    {
        "fund_name": "Bessemer Venture Partners",
        "investor_type": "vc_fund",
        "website": "https://bvp.com",
        "focus_sectors": ["Healthcare", "AI", "SaaS"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "San Francisco, CA",
        "source": "nfx_signal",
        "priority": "high",
        "relevance_reason": "Century-old fund with deep Healthcare + AI thesis. PalmCare AI's voice-to-contract platform digitizes a paper-heavy industry — fits their 'cloud atlas' healthcare roadmap.",
    },
    {
        "fund_name": "Collab Capital",
        "investor_type": "vc_fund",
        "website": "https://collab.capital",
        "focus_sectors": ["FinTech", "Consumer", "Future of Work"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "Atlanta, GA",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "Pre-seed fund backing Black founders. PalmCare AI is building the future of work for home care agencies with AI-powered tools.",
    },
    {
        "fund_name": "Motivate Venture Capital",
        "investor_type": "vc_fund",
        "website": "https://motivate.vc",
        "focus_sectors": ["FinTech", "Education", "SaaS"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "SaaS pre-seed fund. PalmCare AI is a B2B SaaS platform with strong early traction and revenue.",
    },
    {
        "fund_name": "Surface Ventures",
        "investor_type": "vc_fund",
        "website": "https://surface.vc",
        "focus_sectors": ["SaaS", "CRM", "Analytics"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "SaaS + CRM + Analytics focus — PalmCare AI is essentially a healthcare CRM with AI analytics for home care agencies. Direct product-thesis match.",
    },
    {
        "fund_name": "Devlabs",
        "investor_type": "vc_fund",
        "website": "https://devlabs.vc",
        "focus_sectors": ["FinTech", "AI", "B2B", "SaaS"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "AI + B2B SaaS pre-seed fund. PalmCare AI is an AI-powered B2B SaaS product with developer-led technical architecture.",
    },
    {
        "fund_name": "First Check Ventures",
        "investor_type": "vc_fund",
        "website": "https://firstcheckventures.com",
        "focus_sectors": ["FinTech", "E-Commerce"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$25K",
        "check_size_max": "$250K",
        "check_size_display": "$25K–$250K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "Pre-seed micro-fund focused on first checks. PalmCare AI is at the right stage for their investment thesis.",
    },
    {
        "fund_name": "Side Door Ventures",
        "investor_type": "vc_fund",
        "website": "https://sdv.vc",
        "focus_sectors": ["FinTech", "Healthcare", "Blockchain"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "Healthcare pre-seed fund. PalmCare AI is a healthcare platform modernizing home care agency operations with AI.",
    },
    {
        "fund_name": "Good Growth Capital",
        "investor_type": "vc_fund",
        "website": "https://goodgrowthvc.com",
        "focus_sectors": ["GreenTech", "BioMed Tech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "BioMed Tech pre-seed fund. PalmCare AI's healthcare technology has biomedical applications in patient documentation and care coordination.",
    },
    {
        "fund_name": "E²JDJ",
        "investor_type": "vc_fund",
        "website": "https://e2jdj.com",
        "focus_sectors": ["FoodTech", "AgTech"],
        "focus_stages": ["pre_seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "US",
        "source": "openvc",
        "priority": "medium",
        "relevance_reason": "Pre-seed fund exploring adjacent verticals. PalmCare AI demonstrates strong AI/SaaS fundamentals that may interest sector-agnostic LPs.",
    },
    {
        "fund_name": "Boost VC",
        "investor_type": "vc_fund",
        "website": "https://boost.vc",
        "focus_sectors": ["AI", "Blockchain", "VR"],
        "focus_stages": ["pre_seed", "seed"],
        "check_size_min": "$50K",
        "check_size_max": "$500K",
        "check_size_display": "$50K–$500K",
        "location": "San Mateo, CA",
        "source": "openvc",
        "priority": "high",
        "relevance_reason": "AI pre-seed/seed accelerator. PalmCare AI's AI-first architecture (Deepgram + Claude pipeline) fits their deep tech AI thesis.",
    },
]


def main():
    print(f"\n{'='*60}")
    print("  PalmCare AI — Investor Batch 2 Import")
    print(f"  Target: {API_BASE}")
    print(f"  Investors to add: {len(INVESTORS)}")
    print(f"{'='*60}\n")

    sources = {}
    for inv in INVESTORS:
        s = inv.get("source", "unknown")
        sources[s] = sources.get(s, 0) + 1
    for src, count in sources.items():
        print(f"  [{src}] {count} investors")

    types = {}
    for inv in INVESTORS:
        t = inv.get("investor_type", "unknown")
        types[t] = types.get(t, 0) + 1
    for t, count in types.items():
        print(f"  [{t}] {count}")
    print()

    # Step 1: Fetch existing investors to report on duplicates
    print("[1/3] Fetching existing investors to check for duplicates...")
    try:
        resp = requests.get(
            f"{API_BASE}/platform/investors",
            headers=HEADERS,
            timeout=30,
        )
        if resp.status_code == 200:
            existing = resp.json()
            if isinstance(existing, dict):
                existing = existing.get("investors", [])
            existing_names = {inv.get("fund_name", "").lower().strip() for inv in existing}
            print(f"  Found {len(existing_names)} existing investors in CRM")

            pre_dupes = []
            for inv in INVESTORS:
                if inv["fund_name"].lower().strip() in existing_names:
                    pre_dupes.append(inv["fund_name"])
            if pre_dupes:
                print(f"  ⚠ {len(pre_dupes)} will be skipped (already exist): {', '.join(pre_dupes)}")
        else:
            print(f"  Could not fetch existing investors ({resp.status_code}), proceeding anyway...")
    except Exception as e:
        print(f"  Could not fetch existing investors: {e}, proceeding anyway...")

    # Step 2: Send batch import
    print("\n[2/3] Sending batch import request...")
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

    # Step 3: Report results
    print(f"\n[3/3] Results:")
    print(f"  ✓ Added:   {added}")
    print(f"  ↩ Skipped: {skipped} (already existed)")
    print()

    if results:
        added_list = [r["fund_name"] for r in results if r["status"] == "added"]
        skipped_list = [r["fund_name"] for r in results if r["status"] == "skipped"]

        if added_list:
            print("  NEW investors added:")
            for name in added_list:
                print(f"    ✓ {name}")

        if skipped_list:
            print(f"\n  Skipped (already in DB):")
            for name in skipped_list:
                print(f"    ↩ {name}")

    print(f"\n{'='*60}")
    print(f"  DONE — {added} new investors imported (Batch 2)")
    print(f"  Total attempted: {len(INVESTORS)}")
    print(f"  Added: {added} | Skipped: {skipped}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
