#!/usr/bin/env python3
"""
MEGA investor batch — 30+ new VCs, angels, accelerators, and corporate VCs
researched from Google, OpenVC, VCSheet, and VC directories.

Categories:
  - Healthcare/HealthTech VCs
  - AI-focused seed funds
  - Midwest/non-coastal VCs
  - Aging/longevity funds
  - Corporate VCs in healthcare
  - Diverse-founder-focused funds
  - Accelerators
  - Generalist seed funds
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

MEGA_INVESTORS = [
    # ─── HEALTHCARE / HEALTHTECH VCs ───────────────────────────────────
    {
        "fund_name": "Heal Ventures",
        "investor_type": "vc_fund",
        "website": "https://heal.vc",
        "description": "Doctor-founded early-stage VC focused on healthcare, healthtech, and biotech. Ideation and seed stage. $50-250K initial checks with follow-on capacity.",
        "focus_sectors": ["Healthcare", "HealthTech", "Biotech", "Digital Health"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$50K",
        "check_size_max": "$250K",
        "check_size_display": "$50K–$250K",
        "location": "New York, NY",
        "contact_name": "Sahil Arora",
        "contact_email": "info@heal.vc",
        "contact_title": "Partner",
        "relevance_reason": "Doctor-founded VC that specifically invests in healthcare and healthtech at seed stage. PalmCare's clinical documentation automation is directly in their thesis.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Define Ventures",
        "investor_type": "vc_fund",
        "website": "https://definevc.com",
        "description": "One of the largest early-stage healthtech VC funds. Seed to Series A, $750K-$6M checks. Day-zero partner for healthcare founders. Founded by ex-Kleiner Perkins partner.",
        "focus_sectors": ["Digital Health", "Healthcare AI", "SaaS", "Insurtech"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$750K",
        "check_size_max": "$6M",
        "check_size_display": "$750K–$6M",
        "location": "San Francisco, CA",
        "contact_name": "Lynne Chou O'Keefe",
        "contact_email": "info@definevc.com",
        "contact_title": "Founder & Managing Partner",
        "relevance_reason": "Top early-stage healthtech fund. Runs AI Fellows program for healthcare AI founders. Portfolio includes Hims & Hers (IPO). Deep payer/provider network.",
        "portfolio_companies": ["Hims & Hers", "Unite Us", "Cohere Health", "FOLX Health"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Jumpstart Nova",
        "investor_type": "vc_fund",
        "website": "https://jumpstartnova.com",
        "description": "Institutional seed fund in Nashville/LA. $250K-$4M checks in Health IT, Digital Health, Tech-enabled Services, Consumer Health, and Medicaid Services.",
        "focus_sectors": ["Health IT", "Digital Health", "Tech-Enabled Services", "Medicaid"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K",
        "check_size_max": "$4M",
        "check_size_display": "$250K–$4M",
        "location": "Nashville, TN / Los Angeles, CA",
        "contact_name": "Marcus Whitney",
        "contact_email": "info@jumpstartnova.com",
        "contact_title": "Founder & Managing Partner",
        "relevance_reason": "Nashville-based healthcare seed fund with focus on Health IT and tech-enabled services. Medicaid is a key sector — directly relevant to PalmCare's home care compliance tools.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Dreamit Ventures",
        "investor_type": "accelerator",
        "website": "https://dreamit.com",
        "description": "Healthcare accelerator + VC. 14-week program with Customer Sprints (15-25 health system execs) and Investor Sprints (20-30 top VCs). Philadelphia-based.",
        "focus_sectors": ["Digital Health", "MedTech", "Healthcare IT"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "Philadelphia, PA",
        "contact_name": "Adam Dakin",
        "contact_email": "info@dreamitventures.com",
        "contact_title": "Partner, Healthtech",
        "relevance_reason": "Healthcare-specific accelerator that connects startups to 15-25 health system executives per sprint. Their network could supercharge PalmCare's agency acquisition.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Route 66 Ventures",
        "investor_type": "vc_fund",
        "website": "https://route66ventures.com",
        "description": "Digital health & wellness VC. 51+ company portfolio. Investing in early-stage tech companies that impact lives. Founded by former McKinsey consultant and submarine officer.",
        "focus_sectors": ["Digital Health", "Wellness", "FinTech", "InsurTech"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Alexandria, VA",
        "contact_name": "Benjamin Britt",
        "contact_email": "info@route66ventures.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Digital health VC with 51+ portfolio companies including DriveWealth ($527M raised). DC area proximity to healthcare policy makers.",
        "portfolio_companies": ["DriveWealth", "AccessPay", "Moven"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "FCA Venture Partners",
        "investor_type": "vc_fund",
        "website": "https://fcavp.com",
        "description": "Nashville-based healthcare VC. $285M across 5 funds. $2-6M checks in digital health and tech-enabled healthcare services. Seed to Series B.",
        "focus_sectors": ["Digital Health", "Healthcare Services", "Health IT"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$2M",
        "check_size_max": "$6M",
        "check_size_display": "$2M–$6M",
        "location": "Nashville, TN",
        "contact_name": "Andrew Bouldin",
        "contact_email": "info@fcavp.com",
        "contact_title": "Partner",
        "relevance_reason": "Nashville healthcare VC with $285M across 5 funds. Reviews 400+ deals per year. Deep healthcare network and Nashville health tech ecosystem access.",
        "portfolio_companies": ["Sondermind", "Watershed Health", "evolvedMD"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Activate Venture Partners",
        "investor_type": "vc_fund",
        "website": "https://activatevp.com",
        "description": "Early-stage VC with 100+ healthcare investments. $750K-$3M initial checks. 35+ years of venture experience. 10 IPOs, $10B+ exit value.",
        "focus_sectors": ["Healthcare", "Technology", "Digital Health"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$750K",
        "check_size_max": "$3M",
        "check_size_display": "$750K–$3M",
        "location": "Bethlehem, PA",
        "contact_name": "Glen Bressner",
        "contact_email": "info@activatevp.com",
        "contact_title": "Co-Founder & Managing Partner",
        "relevance_reason": "100+ healthcare investments with $10B+ in exit value. One of the most experienced healthcare-focused seed investors in the US.",
        "portfolio_companies": ["Noom", "Tabula Rasa Healthcare", "Kaid Health"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Flare Capital Partners",
        "investor_type": "vc_fund",
        "website": "https://flarecapital.com",
        "description": "Early-stage healthcare VC focused on improving health outcomes, broadening care access, and lowering costs. Boston-based.",
        "focus_sectors": ["Healthcare", "Digital Health", "Health IT"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K",
        "check_size_max": "$5M",
        "check_size_display": "$500K–$5M",
        "location": "Boston, MA",
        "contact_name": "Bill Geary",
        "contact_email": "info@flarecapital.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Boston healthcare VC focused on access, outcomes, and cost reduction. PalmCare reduces documentation costs by 80% — directly aligned.",
        "portfolio_companies": ["Greater Good Health", "Photon Health", "Visana Health"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    # ─── AGING / LONGEVITY FOCUSED ─────────────────────────────────────
    {
        "fund_name": "Primetime Partners",
        "investor_type": "vc_fund",
        "website": "https://primetimepartners.com",
        "description": "Leading longevity tech VC. Co-founded by Alan Patricof (50+ yr VC veteran, Greycroft $2B+). Seed + Series A in healthtech, fintech, consumer for aging population.",
        "focus_sectors": ["Longevity", "HealthTech", "FinTech", "Consumer", "AgeTech"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "New York, NY",
        "contact_name": "Abby Miller Levy",
        "contact_email": "abby@primetimepartners.com",
        "contact_title": "Managing Partner & Co-Founder",
        "relevance_reason": "Top longevity VC. Home care is a massive market for aging population. Alan Patricof co-founded the fund — one of the most connected VCs in the world.",
        "portfolio_companies": ["Seen Health", "Carewell", "Isaac Health", "Safe Ride Health"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Generator Ventures",
        "investor_type": "vc_fund",
        "website": "https://generatorvc.com",
        "description": "Investment platform exclusively at intersection of aging, senior care, and technology. Deep relationships with senior care organizations. San Mateo-based.",
        "focus_sectors": ["AgeTech", "Senior Care", "Healthcare IT", "Post-Acute Care"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "San Mateo, CA",
        "contact_name": "Katy Fike",
        "contact_email": "info@generatorvc.com",
        "contact_title": "Managing Director",
        "relevance_reason": "Exclusively focused on aging and senior care tech. Co-founded by Aging2.0 founder. Portfolio includes IntelyCare and CareLinx (home care staffing). Perfect thesis match.",
        "portfolio_companies": ["IntelyCare", "CareLinx", "Active Protective", "Caremerge"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Right at Home Ventures",
        "investor_type": "corporate_vc",
        "website": "https://rightathomeventures.com",
        "description": "$5M corporate venture fund from Right at Home (600+ home care franchise locations). Invests in AgeTech and operational software for aging at home.",
        "focus_sectors": ["AgeTech", "Home Care", "Operational Software", "Senior Care"],
        "focus_stages": ["Seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "Omaha, NE",
        "contact_name": "Bailey Paxton",
        "contact_email": "info@rightathomeventures.com",
        "contact_title": "Director of Venture Investment",
        "relevance_reason": "OMAHA-BASED home care corporate VC with 600+ franchise locations. PalmCare could pilot across their entire network. Local Nebraska investor — huge strategic advantage.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    # ─── CORPORATE VCs IN HEALTHCARE ───────────────────────────────────
    {
        "fund_name": "Healthworx (CareFirst)",
        "investor_type": "corporate_vc",
        "website": "https://healthworxventures.com",
        "description": "Innovation and investment arm of CareFirst (major healthcare company). Baltimore-based. Invests in early-stage digital health startups.",
        "focus_sectors": ["Digital Health", "Healthcare IT", "Consumer Health"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$100K",
        "check_size_max": "$1M",
        "check_size_display": "$100K–$1M",
        "location": "Baltimore, MD",
        "contact_name": "Healthworx Team",
        "contact_email": "comms@healthworx.com",
        "contact_title": "Innovation Team",
        "relevance_reason": "CareFirst corporate VC. Runs 1501 Health program ($100K + mentorship). Could provide payer-side distribution for PalmCare to agencies in their network.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Obvious Ventures",
        "investor_type": "vc_fund",
        "website": "https://obvious.com",
        "description": "B Corp certified VC. $272M fund. Three pillars: sustainable systems, healthy living, people power. Backed Virta, Galileo, Devoted Health.",
        "focus_sectors": ["Healthcare", "Climate", "AI", "Consumer"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$500K",
        "check_size_max": "$6M",
        "check_size_display": "$500K–$6M",
        "location": "San Francisco, CA",
        "contact_name": "Vishal Vasishth",
        "contact_email": "vishal@obvious.com",
        "contact_title": "Co-Founder & Managing Director",
        "relevance_reason": "Values-driven fund with strong healthcare portfolio (Virta, Galileo, Devoted Health). Invests in companies improving patient outcomes and care access — PalmCare's mission.",
        "portfolio_companies": ["Virta", "Galileo", "Devoted Health", "Iterative Health"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    # ─── MIDWEST / NON-COASTAL VCs ─────────────────────────────────────
    {
        "fund_name": "M25",
        "investor_type": "vc_fund",
        "website": "https://m25vc.com",
        "description": "Most active early-stage VC in the Midwest. Invests exclusively in Midwest-HQ companies. Pre-seed/seed. $250-500K checks. 14+ states including Omaha.",
        "focus_sectors": ["Technology", "SaaS", "AI", "Healthcare"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$500K",
        "check_size_display": "$250K–$500K",
        "location": "Chicago, IL",
        "contact_name": "Victor Gutwein",
        "contact_email": "info@m25vc.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Most active Midwest early-stage VC. Invests in Omaha companies specifically. PalmCare is a Nebraska C-Corp — exactly their geography thesis.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Bread & Butter Ventures",
        "investor_type": "vc_fund",
        "website": "https://breadandbutterventures.com",
        "description": "Minneapolis-based early-stage VC. $250-750K checks in Health Tech, Food Tech, and Enterprise SaaS. Led by Mary Grove (ex-Google).",
        "focus_sectors": ["Health Tech", "Food Tech", "Enterprise SaaS"],
        "focus_stages": ["Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$750K",
        "check_size_display": "$250K–$750K",
        "location": "Minneapolis, MN",
        "contact_name": "Mary Grove",
        "contact_email": "mary@breadandbutterventures.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Midwest healthtech seed fund. Mary Grove is ex-Google. Health Tech is one of their three core sectors. Close to Nebraska market.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    # ─── DIVERSE FOUNDER / IMPACT FUNDS ────────────────────────────────
    {
        "fund_name": "Zeal Capital Partners",
        "investor_type": "vc_fund",
        "website": "https://zealvc.co",
        "description": "DC-based VC investing in healthcare, fintech, future of work. $62M fund. $250K-$2M checks. Inclusive investing strategy to narrow wealth and healthcare gaps.",
        "focus_sectors": ["Healthcare", "FinTech", "Future of Work", "Health Equity"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K",
        "check_size_max": "$2M",
        "check_size_display": "$250K–$2M",
        "location": "Washington, DC",
        "contact_name": "Nasir Qadree",
        "contact_email": "info@zealvc.co",
        "contact_title": "Founder & Managing Partner",
        "relevance_reason": "Healthcare seed investor in DC focused on health equity. PalmCare serves Medicaid populations across 48 states. Inclusive investing thesis aligns perfectly.",
        "portfolio_companies": ["Auxa Health", "Rising Team", "GigEasy"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "OCA Ventures",
        "investor_type": "vc_fund",
        "website": "https://ocaventures.com",
        "description": "Chicago VC. $1-3M initial checks in enterprise software, consumer, fintech, and digital health. Seed to Series B. Pitch form on website.",
        "focus_sectors": ["Enterprise Software", "Digital Health", "FinTech", "Consumer"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$1M",
        "check_size_max": "$3M",
        "check_size_display": "$1M–$3M",
        "location": "Chicago, IL",
        "contact_name": "OCA Team",
        "contact_email": "info@ocaventures.com",
        "contact_title": "Investment Team",
        "relevance_reason": "Chicago-based fund investing in digital health and enterprise SaaS. Midwest presence. Portfolio includes mPulse Mobile (healthcare engagement).",
        "portfolio_companies": ["Amplified Sciences", "eBlu Solutions", "mPulse Mobile"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    # ─── GENERALIST SEED FUNDS ─────────────────────────────────────────
    {
        "fund_name": "Correlation Ventures",
        "investor_type": "vc_fund",
        "website": "https://correlationvc.com",
        "description": "Data-driven co-investment fund. $350M+ AUM. Decisions in days (not months). Seed to late-stage. Nearly all sectors. Requires at least one other VC co-investing.",
        "focus_sectors": ["Technology", "Healthcare", "SaaS", "AI"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$250K",
        "check_size_max": "$5M",
        "check_size_display": "$250K–$5M",
        "location": "San Francisco, CA / San Diego, CA",
        "contact_name": "David Coats",
        "contact_email": "david@correlationvc.com",
        "contact_title": "Managing Director & Co-Founder",
        "relevance_reason": "Fastest-deciding VC in the market (days, not months). Data-driven co-investor. Perfect add-on to PalmCare's SAFE round alongside other investors.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Precursor Ventures",
        "investor_type": "vc_fund",
        "website": "https://precursorvc.com",
        "description": "Pre-seed/seed generalist. Founded by Charles Hudson. $100-500K checks. Backs founders before product-market fit. Portfolio: Juniper Square, Modern Health, The Athletic.",
        "focus_sectors": ["Technology", "SaaS", "Healthcare", "Consumer"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K",
        "check_size_max": "$500K",
        "check_size_display": "$100K–$500K",
        "location": "San Francisco, CA",
        "contact_name": "Charles Hudson",
        "contact_email": "info@precursorvc.com",
        "contact_title": "Managing Partner & Founder",
        "relevance_reason": "Pre-seed/seed generalist who backs founders before PMF. Portfolio includes Modern Health. Doesn't require warm intro. Invests globally.",
        "portfolio_companies": ["Juniper Square", "Modern Health", "The Athletic", "Superhuman"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Lerer Hippeau",
        "investor_type": "vc_fund",
        "website": "https://lererhippeau.com",
        "description": "NYC seed-stage VC. $100K-$3M checks. Pre-seed to Series A. Generalist but strong in SaaS, enterprise, consumer, and health. Founded 2010.",
        "focus_sectors": ["SaaS", "Enterprise", "Consumer", "AI", "Health"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$100K",
        "check_size_max": "$3M",
        "check_size_display": "$100K–$3M",
        "location": "New York, NY",
        "contact_name": "Eric Hippeau",
        "contact_email": "info@lererhippeau.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Top NYC seed fund with deep SaaS and enterprise expertise. Eric Hippeau is former CEO of Huffington Post. Could provide major brand amplification.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Company Ventures",
        "investor_type": "vc_fund",
        "website": "https://companyventures.co",
        "description": "NYC seed-stage VC investing in digital health, fintech, and enterprise SaaS. $250K-$1.5M checks. Runs Grand Central Tech residency (1yr, no equity).",
        "focus_sectors": ["Digital Health", "FinTech", "Enterprise SaaS"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$250K",
        "check_size_max": "$1.5M",
        "check_size_display": "$250K–$1.5M",
        "location": "New York, NY",
        "contact_name": "Matt Harrigan",
        "contact_email": "info@companyventures.co",
        "contact_title": "CEO & Managing Partner",
        "relevance_reason": "Digital health is one of three core focus areas. 380+ portfolio companies with $4.4B+ in VC funding raised. Grand Central Tech residency could provide NYC operational base.",
        "portfolio_companies": ["Maven", "Centivo", "Stepful", "Octave"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Outlander VC",
        "investor_type": "vc_fund",
        "website": "https://outlander.vc",
        "description": "Generalist fund that was first/early money in multiple HealthTech companies. Fund III: $500K-$2.5M+ pre-seed/seed checks. No biotech/pharma.",
        "focus_sectors": ["HealthTech", "AI", "Automation", "Deep Tech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$2.5M",
        "check_size_display": "$500K–$2.5M",
        "location": "United States",
        "contact_name": "Outlander Team",
        "contact_email": "info@outlander.vc",
        "contact_title": "Investment Team",
        "relevance_reason": "First/early money in Clover Health, Classpass, and Medely. Bullish on AI and automation in healthcare. PalmCare's AI pipeline is exactly their thesis.",
        "portfolio_companies": ["Clover Health", "Classpass", "Medely", "Fidari"],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Saltgrass Capital",
        "investor_type": "vc_fund",
        "website": "https://saltgrasscapital.com",
        "description": "$150M early-stage fund investing in B2B SaaS healthcare AI. Thesis: data-rich, clinically integrated, operationally scalable solutions.",
        "focus_sectors": ["Healthcare AI", "B2B SaaS", "Clinical AI", "Value-Based Care"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$1M",
        "check_size_max": "$5M",
        "check_size_display": "$1M–$5M",
        "location": "United States",
        "contact_name": "Brian Litten",
        "contact_email": "info@saltgrasscapital.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "$150M fund exclusively focused on B2B SaaS Healthcare AI. PalmCare is literally their thesis: data-rich, clinically integrated, operationally scalable healthcare AI.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Echo Health Ventures",
        "investor_type": "vc_fund",
        "website": "https://echohealthventures.com",
        "description": "Backed by Cambia Health Solutions. Invests early to late stage in healthcare IT and services. Person-centric and shared-risk healthcare models.",
        "focus_sectors": ["Healthcare IT", "Healthcare Services", "Value-Based Care"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$100K",
        "check_size_max": "$5M",
        "check_size_display": "$100K–$5M",
        "location": "Portland, OR / Durham, NC",
        "contact_name": "Dusty Lieb",
        "contact_email": "info@echohealthventures.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Healthcare IT investor backed by major health plan (Cambia). Portfolio includes Cityblock, Main Street Health. Focus on person-centric care aligns with PalmCare.",
        "portfolio_companies": ["Cityblock", "Main Street Health", "Eleanor Health"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Victress Capital",
        "investor_type": "vc_fund",
        "website": "https://victresscapital.com",
        "description": "Women-led VC investing in early-stage consumer startups with gender-diverse teams. $21.7M fund. Seed to early revenue. Boston-based.",
        "focus_sectors": ["Consumer", "Health", "Technology"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$150K",
        "check_size_max": "$2M",
        "check_size_display": "$150K–$2M",
        "location": "Boston, MA",
        "contact_name": "Lori Cashman",
        "contact_email": "lori@victresscapital.com",
        "contact_title": "Managing Partner",
        "relevance_reason": "Women-led fund focused on diverse founding teams and consumer health. PalmCare serves a largely female caregiver workforce — strong impact story.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Indus Ventures",
        "investor_type": "vc_fund",
        "website": "https://indusvp.com",
        "description": "Healthcare-focused platform investing pre-seed to growth. $100K-$2M+ initial checks (up to $10M per company). Hands-on operational support.",
        "focus_sectors": ["Healthcare", "Digital Health", "Healthcare AI"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$100K",
        "check_size_max": "$2M",
        "check_size_display": "$100K–$2M+",
        "location": "United States",
        "contact_name": "Indus Team",
        "contact_email": "info@indusvp.com",
        "contact_title": "Investment Team",
        "relevance_reason": "Healthcare platform investor with hands-on operational support. Provides strategy, ops, and growth alongside capital — exactly what early-stage PalmCare needs.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "DxAngels",
        "investor_type": "angel",
        "website": "https://dxangels.com",
        "description": "Digital health syndicate co-founded by Doximity alumni. $300-500K checks in seed/Series A. Network of tech-forward physicians and health tech leaders.",
        "focus_sectors": ["Digital Health", "HealthTech", "AI/ML"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$300K",
        "check_size_max": "$500K",
        "check_size_display": "$300K–$500K",
        "location": "San Francisco, CA",
        "contact_name": "Ahmed Belal",
        "contact_email": "hello@dxangels.com",
        "contact_title": "Co-Founder & Managing Partner",
        "relevance_reason": "Digital health syndicate with Doximity alumni network. Provides access to dozens of tech-forward physicians who could become PalmCare champions.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Charge Ventures",
        "investor_type": "vc_fund",
        "website": "https://charge.vc",
        "description": "Seed VC focused on AI-driven provider enablement software. ~$500K average checks. Bi-coastal (Palo Alto + NYC).",
        "focus_sectors": ["Healthcare AI", "Provider Enablement", "SaaS"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K",
        "check_size_max": "$750K",
        "check_size_display": "$250K–$750K",
        "location": "Palo Alto, CA / New York, NY",
        "contact_name": "Jinghan Hao",
        "contact_email": "hello@charge.vc",
        "contact_title": "Principal",
        "relevance_reason": "Specifically invests in AI-driven provider enablement software. PalmCare is literally AI that enables home care providers to do assessments faster.",
        "portfolio_companies": [],
        "priority": "high",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Winter Street Ventures",
        "investor_type": "vc_fund",
        "website": "https://winterstreetventures.com",
        "description": "New healthcare VC targeting $100M fund. Founded by former health insurance CEO. 100+ health system partnerships, 50+ health plan partnerships.",
        "focus_sectors": ["Healthcare", "Health Insurance", "Health Systems"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$1M",
        "check_size_max": "$5M",
        "check_size_display": "$1M–$5M",
        "location": "United States",
        "contact_name": "Winter Street Team",
        "contact_email": "info@winterstreetventures.com",
        "contact_title": "Investment Team",
        "relevance_reason": "Founded by former health insurance CEO with 100+ health system partnerships. Could provide massive distribution through payer and provider networks.",
        "portfolio_companies": [],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
    {
        "fund_name": "Initialized Capital",
        "investor_type": "vc_fund",
        "website": "https://initialized.com",
        "description": "$3.2B+ AUM. Pre-seed and seed. Founded by Alexis Ohanian (Reddit) and Garry Tan. Backs founders before PMF. Portfolio: Coinbase, Instacart, Cruise.",
        "focus_sectors": ["Enterprise SaaS", "AI/ML", "Healthcare", "Climate"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K",
        "check_size_max": "$3M",
        "check_size_display": "$500K–$3M",
        "location": "San Francisco, CA",
        "contact_name": "Initialized Team",
        "contact_email": "info@initialized.com",
        "contact_title": "Investment Team",
        "relevance_reason": "$3.2B AUM fund that invests before product-market fit. Explicitly welcomes non-traditional backgrounds. Portfolio includes healthcare companies.",
        "portfolio_companies": ["Coinbase", "Instacart", "Cruise", "Rippling"],
        "priority": "medium",
        "source": "web_research_mar2026",
    },
]


def build_investor_email(fund_name, contact_name, relevance_reason, focus_stages):
    first_name = contact_name.split()[0] if contact_name and "Team" not in contact_name else ""
    greeting = f"Hi {first_name}," if first_name else f"Hi {fund_name} Team,"
    stage_note = ", ".join(focus_stages[:2]) if focus_stages else "early-stage"

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


def main():
    internal_key = os.getenv("CRON_SECRET", "")

    if not resend.api_key:
        print("ERROR: RESEND_API_KEY not set in .env")
        sys.exit(1)

    print(f"Resend API key: ...{resend.api_key[-8:]}")
    print(f"Total investors to process: {len(MEGA_INVESTORS)}")

    # --- Step 1: Batch import to CRM ---
    print(f"\n{'='*60}")
    print(f"STEP 1: Adding {len(MEGA_INVESTORS)} investors to CRM")
    print(f"{'='*60}")

    if internal_key:
        try:
            resp = requests.post(
                f"{API_BASE}/platform/investors/batch-import",
                headers={"X-Internal-Key": internal_key, "Content-Type": "application/json"},
                json=MEGA_INVESTORS,
                timeout=30,
            )
            if resp.status_code in (200, 201):
                result = resp.json()
                print(f"  Batch import: {result.get('added', '?')} added, {result.get('skipped', '?')} skipped")
            else:
                print(f"  Batch import returned {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            print(f"  Batch import error: {e}")
    else:
        print("  CRON_SECRET not set — skipping CRM import")

    # --- Step 2: Send emails ---
    print(f"\n{'='*60}")
    print(f"STEP 2: Sending outreach emails to {len(MEGA_INVESTORS)} investors")
    print(f"{'='*60}")

    sent_count = 0
    fail_count = 0

    for i, inv in enumerate(MEGA_INVESTORS):
        email_addr = inv.get("contact_email", "")
        fund = inv["fund_name"]

        if not email_addr:
            print(f"  SKIP: {fund} — no email")
            continue

        subject, html, text = build_investor_email(
            fund,
            inv.get("contact_name", ""),
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
            print(f"  SENT [{i+1}/{len(MEGA_INVESTORS)}]: {fund} -> {email_addr} (resend_id={eid})")
            sent_count += 1
        except Exception as e:
            print(f"  FAIL [{i+1}/{len(MEGA_INVESTORS)}]: {fund} -> {email_addr}: {e}")
            fail_count += 1
            time.sleep(2.0)

    print(f"\n{'='*60}")
    print(f"DONE: {sent_count} emails sent, {fail_count} failed")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
