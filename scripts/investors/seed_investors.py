#!/usr/bin/env python3
"""
Seed investors into the database. Self-contained — no API imports required.
Creates the investors table if missing, then inserts all investors.

Usage:
    DATABASE_URL="postgresql+psycopg://..." python3 scripts/seed_investors.py
"""

import os
import sys
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from sqlalchemy import (
    create_engine, Column, String, Text, Integer, DateTime, JSON,
    MetaData, Table, inspect, text
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import sessionmaker, declarative_base

database_url = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://homecare:homecare@localhost:5432/homecare"
)
print(f"Connecting to: {database_url.split('@')[1] if '@' in database_url else 'local'}")

engine = create_engine(database_url, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
Base = declarative_base()


class Investor(Base):
    __tablename__ = "investors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fund_name = Column(String(500), nullable=False, index=True)
    investor_type = Column(String(50), default="vc_fund")
    website = Column(String(500))
    description = Column(Text)
    focus_sectors = Column(JSON, default=list)
    focus_stages = Column(JSON, default=list)
    check_size_min = Column(String(50))
    check_size_max = Column(String(50))
    check_size_display = Column(String(100))
    location = Column(String(255))
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_title = Column(String(255))
    contact_linkedin = Column(String(500))
    contact_twitter = Column(String(255))
    relevance_reason = Column(Text)
    portfolio_companies = Column(JSON, default=list)
    source = Column(String(100), default="vcsheet.com")
    status = Column(String(50), default="new", nullable=False, index=True)
    priority = Column(String(20), default="medium", nullable=False)
    notes = Column(Text)
    last_email_sent_at = Column(DateTime(timezone=True))
    last_email_subject = Column(String(500))
    email_send_count = Column(Integer, default=0)
    email_open_count = Column(Integer, default=0)
    last_email_opened_at = Column(DateTime(timezone=True))
    last_response_at = Column(DateTime(timezone=True))
    resend_email_id = Column(String(255))
    campaign_tag = Column(String(100), index=True)
    activity_log = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


INVESTORS = [
    # ── Tier 1: Direct Home Care / Health AI Investors ──
    {
        "fund_name": "Cortado Ventures",
        "investor_type": "vc_fund",
        "website": "https://cortado.ventures",
        "description": "Oklahoma City VC investing in Heartland tech. Already backed Apricot Health AI (home health nurse documentation AI).",
        "focus_sectors": ["AI", "HealthTech", "Enterprise SaaS"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K", "check_size_max": "$2M", "check_size_display": "$250K - $2M",
        "location": "Oklahoma City, OK",
        "contact_name": "Nathan Dutzmann", "contact_email": "investors@cortado.ventures", "contact_title": "Managing Partner",
        "relevance_reason": "Already invested in Apricot Health AI (home health documentation AI). Midwest-based, exact market fit for PalmCare.",
        "portfolio_companies": ["Apricot Health AI", "Canopy Weather", "Pumpjack Dataworks"],
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Boomerang Ventures",
        "investor_type": "vc_fund",
        "website": "https://boomerang.vc",
        "description": "Indianapolis VC focused on at-home care, connected health, and AI/ML. Led Lizzy Care seed round (AI home care).",
        "focus_sectors": ["HealthTech", "AI", "Home Care", "Connected Health"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "Indianapolis, IN",
        "contact_name": "Mike Langellier", "contact_email": "info@boomerang.vc", "contact_title": "Managing Partner",
        "relevance_reason": "Led Lizzy Care seed (AI at-home care). Invested in GeoH (home care software). Exact market match for PalmCare.",
        "portfolio_companies": ["Lizzy Care", "GeoH", "Careswitch"],
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "InVitro Capital",
        "investor_type": "vc_fund",
        "website": "https://invitrocapital.com",
        "description": "VC building and investing in AI-native healthcare companies. Portfolio includes Curenta (AI EMR for home health/hospice).",
        "focus_sectors": ["AI", "HealthTech", "Home Health", "Digital Health"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "San Francisco, CA",
        "contact_email": "info@invitrocapital.com",
        "relevance_reason": "Invested in Curenta (AI-native EMR for home health/hospice). Nearly identical model to PalmCare.",
        "portfolio_companies": ["Curenta", "DocVA"],
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Health Frontier Ventures",
        "investor_type": "vc_fund",
        "website": "https://healthfrontier.vc",
        "description": "Digital health + generative AI focused seed fund. $400K typical check size matches PalmCare's raise.",
        "focus_sectors": ["Digital Health", "AI", "HealthTech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$200K", "check_size_max": "$500K", "check_size_display": "$200K - $500K",
        "location": "New York, NY",
        "relevance_reason": "Digital health + generative AI focus. $400K sweet spot matches PalmCare's $450K raise perfectly.",
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Invest Nebraska",
        "investor_type": "vc_fund",
        "website": "https://investnebraska.com",
        "description": "THE local investor for Nebraska startups. Active in healthcare software, recent Microsoft AI partnership.",
        "focus_sectors": ["AI", "HealthTech", "Enterprise", "AgTech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$50K", "check_size_max": "$500K", "check_size_display": "$50K - $500K",
        "location": "Omaha, NE",
        "contact_name": "Hannah Gille", "contact_email": "hannah@investnebraska.com", "contact_title": "Investment Director",
        "relevance_reason": "Nebraska's primary startup investor. PalmCare is HQ'd in Nebraska — local geographic advantage.",
        "portfolio_companies": ["Bulu", "Opendorse", "Novacoast"],
        "source": "gust.com", "priority": "high",
    },
    {
        "fund_name": "MOVE Venture Capital",
        "investor_type": "vc_fund",
        "website": "https://movevc.com",
        "description": "Only pre-seed/seed VC in Nebraska. 100% of investments are Nebraska-based startups.",
        "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$25K", "check_size_max": "$250K", "check_size_display": "$25K - $250K",
        "location": "Omaha, NE",
        "relevance_reason": "Only pre-seed/seed VC in Nebraska with 100% local investment mandate.",
        "source": "gust.com", "priority": "high",
    },
    {
        "fund_name": "Intelligence Ventures",
        "investor_type": "vc_fund",
        "website": "https://intelligencevc.com",
        "description": "Exclusively invests in AI + healthcare at pre-seed/seed.",
        "focus_sectors": ["AI", "HealthTech", "Digital Health"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "San Francisco, CA",
        "contact_email": "info@intelligencevc.com",
        "relevance_reason": "Exclusively AI + healthcare at pre-seed/seed — PalmCare is exactly their thesis.",
        "source": "signal.nfx.com", "priority": "high",
    },
    {
        "fund_name": "DHVP (Digital Health Venture Partners)",
        "investor_type": "vc_fund",
        "website": "https://dhvp.io",
        "description": "Focuses on AI workflow optimization in healthcare.",
        "focus_sectors": ["Digital Health", "AI", "HealthTech", "Workflow Automation"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "San Francisco, CA",
        "contact_name": "Arvin Khamseh", "contact_email": "arvin@dhvp.io", "contact_title": "General Partner",
        "relevance_reason": "AI workflow optimization in healthcare — direct alignment with PalmCare's documentation pipeline.",
        "source": "signal.nfx.com", "priority": "high",
    },
    # ── Tier 2: Strong AI + HealthTech Investors ──
    {
        "fund_name": "Rock Health Capital",
        "investor_type": "vc_fund",
        "website": "https://rockhealth.com",
        "description": "Digital health-focused VC with proprietary digital-health data and enterprise advisory.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_display": "$500K - $3M",
        "location": "San Francisco, CA",
        "contact_name": "Bill Evans", "contact_email": "bill.evans@rockhealthcapital.com", "contact_title": "Managing Director",
        "relevance_reason": "Pure-play digital health investor with proprietary market data.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "AIX Ventures",
        "investor_type": "vc_fund",
        "website": "https://aixventures.com",
        "description": "AI-focused seed fund investing exclusively in AI/ML companies across verticals.",
        "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "San Francisco, CA",
        "relevance_reason": "Pure AI seed fund. PalmCare's voice AI pipeline is core AI technology.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Zetta Venture Partners",
        "investor_type": "vc_fund",
        "website": "https://zettavp.com",
        "description": "AI-focused VC investing in companies building intelligent systems.",
        "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise AI"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "San Francisco, CA",
        "contact_name": "Mark Gorenberg", "contact_email": "mark@zettavp.com", "contact_title": "Managing Partner",
        "relevance_reason": "AI-first investment thesis with healthcare portfolio.",
        "portfolio_companies": ["Viz.ai", "Clarifai"],
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Fusion Fund",
        "investor_type": "vc_fund",
        "website": "https://fusionfund.com",
        "description": "AI and deep tech seed fund led by Lu Zhang. $500M+ AUM across four funds.",
        "focus_sectors": ["AI", "Deep Tech", "HealthTech", "Enterprise"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$100K", "check_size_max": "$3M", "check_size_display": "$100K - $3M",
        "location": "Palo Alto, CA",
        "contact_name": "Lu Zhang", "contact_email": "pitch@fusionfund.com", "contact_title": "Founding Partner",
        "relevance_reason": "AI/deep tech fund with healthcare focus. Founder sold a medical device company.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "2048 Ventures",
        "investor_type": "vc_fund",
        "website": "https://2048.vc",
        "description": "Pre-seed fund investing $250K-$500K in AI-native companies. Pre-Seed Fast Track: 10-day funding.",
        "focus_sectors": ["AI", "Enterprise", "HealthTech", "FinTech"],
        "focus_stages": ["Pre-Seed"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "New York, NY",
        "contact_name": "Alex Iskold", "contact_email": "alex@2048.vc", "contact_title": "Founder & Partner",
        "relevance_reason": "Vertical AI thesis + healthcare vertical. Pre-Seed Fast Track with 10-day funding decision.",
        "source": "openvc.app", "priority": "high",
    },
    # ── New Tier: AI + Tech Investors (March 2026 Research) ──
    {
        "fund_name": "Tau Ventures",
        "investor_type": "vc_fund",
        "website": "https://tauventures.com",
        "description": "AI-first early-stage fund with $20M+ AUM. Partners include former Samsung NEXT, HealthIQ co-founder.",
        "focus_sectors": ["AI", "HealthTech", "Enterprise", "Automation"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "Palo Alto, CA",
        "contact_name": "Amit Garg", "contact_email": "amit@tauventures.com", "contact_title": "Partner",
        "contact_linkedin": "https://linkedin.com/in/amitgarg",
        "relevance_reason": "AI-first fund with dedicated healthcare partner (Sharon Huang, ex-Novartis/Chan Zuckerberg). Digital health + automation thesis matches PalmCare.",
        "source": "tauventures.com", "priority": "high",
    },
    {
        "fund_name": "Exponential Capital",
        "investor_type": "vc_fund",
        "website": "https://www.exponentialcap.com",
        "description": "Investment partnership focused on healthcare AI and bioscience. $100M+ deployed across 10+ companies.",
        "focus_sectors": ["AI", "HealthTech", "Precision Medicine", "Healthcare Data"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "United States",
        "contact_linkedin": "https://linkedin.com/company/exponential-capital-management",
        "relevance_reason": "Backs AI-native workflow replacements for legacy clinical/operational systems — PalmCare replaces paper assessments with AI.",
        "source": "exponentialcap.com", "priority": "high",
    },
    {
        "fund_name": "Radical Ventures",
        "investor_type": "vc_fund",
        "website": "https://radical.vc",
        "description": "AI-focused VC with ties to Geoffrey Hinton, Vector Institute. Offers up to $250K in GPU credits.",
        "focus_sectors": ["AI", "HealthTech", "Cybersecurity", "FinTech", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$1M", "check_size_max": "$25M", "check_size_display": "$1M - $25M",
        "location": "Toronto, Canada / San Francisco, CA",
        "contact_email": "hello@radical.vc",
        "relevance_reason": "Pure AI fund with deep research ties and GPU credits. PalmCare's production AI pipeline demonstrates technical depth.",
        "portfolio_companies": ["Cohere", "Waabi"],
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "General Catalyst (Health Assurance)",
        "investor_type": "vc_fund",
        "website": "https://www.generalcatalyst.com/health-assurance",
        "description": "$8B fund with $750M Health Assurance Fund. 23 global health system partners covering 15% of US healthcare.",
        "focus_sectors": ["HealthTech", "AI", "Digital Health", "Care Delivery"],
        "focus_stages": ["Seed", "Series A", "Series B+"],
        "check_size_min": "$500K", "check_size_max": "$50M", "check_size_display": "$500K - $50M",
        "location": "Cambridge, MA / San Francisco, CA",
        "contact_name": "Hemant Taneja", "contact_title": "CEO & Managing Director",
        "relevance_reason": "Health Assurance thesis: AI transforming healthcare with HIPAA compliance from day one. PalmCare embodies this vision.",
        "portfolio_companies": ["Devoted Health", "Ro", "Ease Health"],
        "source": "generalcatalyst.com", "priority": "high",
    },
    {
        "fund_name": "Lux Capital",
        "investor_type": "vc_fund",
        "website": "https://www.luxcapital.com",
        "description": "Deep tech VC with dedicated health and bio team. Backs 'the new and the not-yet-imagined.'",
        "focus_sectors": ["AI", "Deep Tech", "HealthTech", "BioTech"],
        "focus_stages": ["Seed", "Series A", "Series B"],
        "check_size_min": "$2M", "check_size_max": "$20M", "check_size_display": "$2M - $20M",
        "location": "New York, NY / Menlo Park, CA",
        "contact_name": "Deena Shakir", "contact_email": "info@luxcapital.com", "contact_title": "Partner, Digital Health",
        "contact_linkedin": "https://linkedin.com/in/deenashakir",
        "relevance_reason": "Partner Deena Shakir leads digital health investing. Deep tech AI thesis aligns with PalmCare's technical moat.",
        "portfolio_companies": ["Benchling", "Elektra Labs"],
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "Floodgate",
        "investor_type": "vc_fund",
        "website": "https://www.floodgate.com",
        "description": "$750M fund specializing in pre-seed/seed. Led SmarterDX ($1B+ exit in 2025) and Counsel Health.",
        "focus_sectors": ["AI", "HealthTech", "Enterprise", "Consumer"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "Menlo Park, CA",
        "contact_name": "Ann Miura-Ko", "contact_email": "ann@floodgate.com", "contact_title": "Co-Founding Partner",
        "contact_linkedin": "https://linkedin.com/in/annmiurako",
        "relevance_reason": "Software-first healthcare thesis led to $1B+ SmarterDX exit. PalmCare is software-first disruption of home care.",
        "portfolio_companies": ["SmarterDX", "Counsel Health", "Hebbia", "Lyft", "Twitch"],
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Initialized Capital",
        "investor_type": "vc_fund",
        "website": "https://initialized.com",
        "description": "Seed-stage fund founded by Garry Tan (now YC CEO) and Alexis Ohanian. $160M+ AUM.",
        "focus_sectors": ["AI", "Enterprise SaaS", "HealthTech", "FinTech"],
        "focus_stages": ["Seed"],
        "check_size_min": "$1M", "check_size_max": "$5M", "check_size_display": "$1M - $5M",
        "location": "San Francisco, CA",
        "relevance_reason": "Early investors in Coinbase, Instacart, Cruise, Flexport. Strong network for follow-on fundraising.",
        "portfolio_companies": ["Coinbase", "Instacart", "Cruise", "Flexport", "Rippling"],
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "SeedtoB Capital",
        "investor_type": "vc_fund",
        "website": "https://seedtob.com",
        "description": "Atlanta-based fund focused on healthcare AI. Founded by Jvion executives (9-figure exit 2019).",
        "focus_sectors": ["AI", "HealthTech", "Digital Health", "Clinical AI"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$2M", "check_size_display": "$500K - $2M",
        "location": "Atlanta, GA",
        "contact_name": "Ritesh Sharma", "contact_email": "info@seedtob.com", "contact_title": "Co-Founder & Managing Partner",
        "relevance_reason": "Founded by healthcare AI exit veterans (Jvion). Deep health system sales experience for PalmCare scale.",
        "portfolio_companies": ["OncoLens", "GritWell", "Feel Therapeutics", "Shimmer"],
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Beta Boom",
        "investor_type": "vc_fund",
        "website": "https://www.betaboom.com",
        "description": "Pre-seed/seed healthcare VC. No warm intro required. 6-week decision timeline.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Telehealth"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K", "check_size_max": "$500K", "check_size_display": "$250K - $500K",
        "location": "United States",
        "contact_name": "Sergio Paluch", "contact_title": "Managing Partner",
        "relevance_reason": "No warm intro required, healthcare pre-seed/seed specialist. Diverse founder focus. 6-week decisions.",
        "source": "betaboom.com", "priority": "high",
    },
    {
        "fund_name": "Healthworx Ventures",
        "investor_type": "vc_fund",
        "website": "https://healthworxventures.com",
        "description": "Baltimore-based healthcare innovation ecosystem backed by CareFirst BCBS.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Healthcare Services"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$250K", "check_size_max": "$2M", "check_size_display": "$250K - $2M",
        "location": "Baltimore, MD",
        "relevance_reason": "CareFirst BCBS-backed. Payer connections for home care agency distribution.",
        "portfolio_companies": ["ShiftMed", "Safe Ride Health", "Better Health"],
        "source": "healthworxventures.com", "priority": "medium",
    },
    {
        "fund_name": "Davidovs Venture Collective (DVC)",
        "investor_type": "syndicate",
        "website": "https://dvc.ai",
        "description": "Community-driven AI VC with 170+ LP engineers/founders and 240+ portfolio founders.",
        "focus_sectors": ["AI", "Machine Learning", "Enterprise AI", "Developer Tools"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$300K", "check_size_display": "$100K - $300K",
        "location": "Global",
        "relevance_reason": "170+ AI engineers/founders as LPs provides massive network effect and technical validation.",
        "source": "dvc.ai", "priority": "medium",
    },
    {
        "fund_name": "Gelt Venture Capital",
        "investor_type": "vc_fund",
        "website": "https://gelt.vc",
        "description": "Sector-agnostic seed fund writing first checks across US, UK, Canada, Brazil, Australia.",
        "focus_sectors": ["AI", "SaaS", "Enterprise", "HealthTech"],
        "focus_stages": ["Seed"],
        "check_size_min": "$250K", "check_size_max": "$1M", "check_size_display": "$250K - $1M",
        "location": "Global (US, UK, Canada, Brazil, Australia)",
        "relevance_reason": "Seed fund that stays involved from prototype through scale. AI portfolio includes Hypereal AI.",
        "portfolio_companies": ["Hypereal AI", "Zenn.CEO"],
        "source": "gelt.vc", "priority": "medium",
    },
    {
        "fund_name": "Beta Fund (Beta Capital)",
        "investor_type": "vc_fund",
        "website": "https://www.beta.capital",
        "description": "Backs AI founders at inception stage. Agentic AI, AI-native systems, vertical AI SaaS.",
        "focus_sectors": ["AI", "Agentic AI", "Vertical SaaS", "Enterprise AI"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "United States",
        "relevance_reason": "AI-native vertical SaaS thesis — PalmCare is exactly that. 900+ founder network and 300+ mentors.",
        "source": "beta.capital", "priority": "high",
    },
    {
        "fund_name": "Tran.vc",
        "investor_type": "vc_fund",
        "website": "https://www.tran.vc",
        "description": "Pre-seed fund investing $50K in AI, software, robotics. Focus on seed-strapping.",
        "focus_sectors": ["AI", "Software", "Robotics", "Digital Health"],
        "focus_stages": ["Pre-Seed"],
        "check_size_display": "$50K",
        "location": "United States",
        "relevance_reason": "Healthcare AI in portfolio (Maculus, ObeSolve). IP strategy help adds value beyond capital.",
        "portfolio_companies": ["Maculus", "ObeSolve"],
        "source": "tran.vc", "priority": "medium",
    },
    {
        "fund_name": "Backstage Capital",
        "investor_type": "vc_fund",
        "website": "https://backstagecapital.com",
        "description": "Arlan Hamilton's fund for underrepresented founders. 170+ portfolio companies.",
        "focus_sectors": ["AI", "SaaS", "Consumer", "HealthTech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$25K", "check_size_max": "$100K", "check_size_display": "$25K - $100K",
        "location": "Los Angeles, CA",
        "contact_name": "Arlan Hamilton", "contact_title": "Founder & Managing Partner",
        "relevance_reason": "Minimizes funding disparities for underrepresented founders. 170+ portfolio network.",
        "source": "backstagecapital.com", "priority": "medium",
    },
    {
        "fund_name": "Sequoia Capital (Scout/Seed)",
        "investor_type": "vc_fund",
        "website": "https://www.sequoiacap.com",
        "description": "$85B+ AUM. Backed OpenAI, Hugging Face, DeepMind. AI portfolio raised $30B+ collectively.",
        "focus_sectors": ["AI", "Enterprise", "HealthTech", "FinTech"],
        "focus_stages": ["Seed", "Series A", "Series B+"],
        "check_size_min": "$1M", "check_size_max": "$8M", "check_size_display": "$1M - $8M",
        "location": "Menlo Park, CA",
        "relevance_reason": "World's top AI investor. Portfolio companies collectively raised $30B+. Highest-tier credibility signal.",
        "portfolio_companies": ["OpenAI", "Hugging Face", "DeepMind", "Harvey", "Stripe"],
        "source": "aifundingtracker.com", "priority": "high",
    },
    {
        "fund_name": "Frist Cressey Ventures",
        "investor_type": "vc_fund",
        "website": "https://fristcressey.com",
        "description": "Healthcare-dedicated VC founded by former HCA Chairman. Nashville healthcare capital connections.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Healthcare Services"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "Nashville, TN",
        "relevance_reason": "HCA family connections. Nashville is healthcare capital — networks into home health and post-acute care.",
        "portfolio_companies": ["Qualified Health"],
        "source": "fristcressey.com", "priority": "high",
    },
    {
        "fund_name": "Town Hall Ventures",
        "investor_type": "vc_fund",
        "website": "https://townhallventures.com",
        "description": "Healthcare VC investing in care delivery, health equity, and workforce challenges.",
        "focus_sectors": ["HealthTech", "Digital Health", "Healthcare Workforce", "AI"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "San Francisco, CA",
        "relevance_reason": "Healthcare workforce thesis — PalmCare addresses caregiver shortage through AI documentation automation.",
        "portfolio_companies": ["Qualified Health"],
        "source": "townhallventures.com", "priority": "high",
    },
    {
        "fund_name": "Flare Capital Partners",
        "investor_type": "vc_fund",
        "website": "https://flarecapital.com",
        "description": "Health tech VC with deep payer and provider network. Active in AI healthcare deals.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Health IT"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "Boston, MA",
        "relevance_reason": "Health tech specialist with payer/provider relationships. Co-invested with SignalFire in Qualified Health.",
        "portfolio_companies": ["Qualified Health"],
        "source": "flarecapital.com", "priority": "high",
    },
    {
        "fund_name": "Conductive Ventures",
        "investor_type": "vc_fund",
        "website": "https://conductiveventures.com",
        "description": "Enterprise-focused seed fund investing in healthcare IT, AI, and B2B SaaS.",
        "focus_sectors": ["Enterprise SaaS", "HealthTech", "AI", "B2B"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "San Francisco, CA",
        "relevance_reason": "Enterprise healthcare IT investor. PalmCare's B2B model fits their thesis.",
        "portfolio_companies": ["evolvedMD"],
        "source": "conductiveventures.com", "priority": "medium",
    },
    {
        "fund_name": "Munch.VC",
        "investor_type": "syndicate",
        "website": "https://www.munch.vc",
        "description": "Led by Mohammad Musa (former Google head of product strategy). AI, robotics, autonomous systems.",
        "focus_sectors": ["AI", "Robotics", "Autonomous Systems", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$50K", "check_size_max": "$250K", "check_size_display": "$50K - $250K",
        "location": "San Francisco, CA",
        "contact_name": "Mohammad Musa", "contact_title": "Lead",
        "relevance_reason": "Google product strategy background. Focus on immediate revenue — PalmCare's $92K ARR shows traction.",
        "source": "munch.vc", "priority": "medium",
    },
    # ── Angel Investors ──
    {
        "fund_name": "Daniel Gross (Angel)",
        "investor_type": "angel",
        "website": "https://dcgross.com",
        "description": "Former Apple AI director, Pioneer co-founder. Early generative AI believer.",
        "focus_sectors": ["AI", "Autonomous Systems", "Deep Tech", "Developer Tools"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$50K", "check_size_max": "$500K", "check_size_display": "$50K - $500K",
        "location": "San Francisco, CA",
        "contact_name": "Daniel Gross", "contact_linkedin": "https://linkedin.com/in/dangross",
        "relevance_reason": "Former Apple AI lead. Backed AI-native companies before the current wave. Strong signal for AI investors.",
        "source": "turbofund.io", "priority": "high",
    },
    {
        "fund_name": "Guillermo Rauch (Angel)",
        "investor_type": "angel",
        "website": "https://rauchg.com",
        "description": "Vercel CEO. 100+ angel investments in AI and developer tools.",
        "focus_sectors": ["AI", "Developer Tools", "SaaS", "Infrastructure"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$25K", "check_size_max": "$250K", "check_size_display": "$25K - $250K",
        "location": "San Francisco, CA",
        "contact_name": "Guillermo Rauch", "contact_linkedin": "https://linkedin.com/in/rauchg",
        "relevance_reason": "100+ investments. PalmCare's Next.js web app runs on Vercel — natural alignment.",
        "source": "turbofund.io", "priority": "medium",
    },
    {
        "fund_name": "Kevin Weil (Angel)",
        "investor_type": "angel",
        "website": "https://linkedin.com/in/kevinweil",
        "description": "OpenAI CPO. Previously VP Product at Twitter, Instagram, Meta.",
        "focus_sectors": ["AI", "Consumer AI", "Enterprise AI", "Product-Led"],
        "focus_stages": ["Seed"],
        "check_size_min": "$50K", "check_size_max": "$250K", "check_size_display": "$50K - $250K",
        "location": "San Francisco, CA",
        "contact_name": "Kevin Weil", "contact_linkedin": "https://linkedin.com/in/kevinweil",
        "relevance_reason": "OpenAI CPO. PalmCare uses OpenAI — investment signals product-market validation from inside OpenAI.",
        "source": "turbofund.io", "priority": "high",
    },
    {
        "fund_name": "Jeff Dean (Angel)",
        "investor_type": "angel",
        "website": "https://linkedin.com/in/jeffdean",
        "description": "Google DeepMind Chief Scientist. Selective investments in frontier ML.",
        "focus_sectors": ["AI", "Machine Learning", "BioTech", "Scientific Computing"],
        "focus_stages": ["Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "Mountain View, CA",
        "contact_name": "Jeff Dean", "contact_linkedin": "https://linkedin.com/in/jeffdean",
        "relevance_reason": "Google DeepMind Chief Scientist. Investment signals highest-tier AI technical validation.",
        "source": "turbofund.io", "priority": "medium",
    },
    {
        "fund_name": "Adrian Aoun (Forward Health)",
        "investor_type": "angel",
        "website": "https://goforward.com",
        "description": "Founder/CEO of Forward (AI-powered primary care). Former Google special projects.",
        "focus_sectors": ["AI", "HealthTech", "Biotech", "Consumer AI"],
        "focus_stages": ["Seed"],
        "check_size_min": "$50K", "check_size_max": "$250K", "check_size_display": "$50K - $250K",
        "location": "San Francisco, CA",
        "contact_name": "Adrian Aoun",
        "relevance_reason": "Builds AI healthcare company (Forward). Understands voice AI in care settings.",
        "source": "turbofund.io", "priority": "high",
    },
    {
        "fund_name": "Dharmesh Shah (HubSpot)",
        "investor_type": "angel",
        "website": "https://dharmesh.com",
        "description": "Co-founder/CTO of HubSpot. 80+ angel investments in B2B SaaS and AI.",
        "focus_sectors": ["AI", "SaaS", "Marketing Tech", "Developer Tools"],
        "focus_stages": ["Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "Boston, MA",
        "contact_name": "Dharmesh Shah",
        "relevance_reason": "SaaS + AI expert. Built the CRM playbook — would understand PalmCare's vertical CRM approach.",
        "source": "turbofund.io", "priority": "medium",
    },
    # ── Remaining VCs from existing seed function ──
    {
        "fund_name": "Santé Ventures",
        "investor_type": "vc_fund",
        "website": "https://santeventures.com",
        "description": "Health technology focused VC in Austin. ~$900M across five funds.",
        "focus_sectors": ["HealthTech", "Digital Health", "MedTech", "AI"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$1M", "check_size_max": "$10M", "check_size_display": "$1M - $10M",
        "location": "Austin, TX",
        "relevance_reason": "Major healthcare VC with AI expertise and healthcare service portfolio.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Dreamit HealthTech",
        "investor_type": "accelerator",
        "website": "https://dreamit.com",
        "description": "Health tech accelerator with 70+ healthcare system partners.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$50K", "check_size_max": "$500K", "check_size_display": "$50K - $500K",
        "location": "Philadelphia, PA",
        "relevance_reason": "70+ healthcare system connections for distribution.",
        "source": "openvc.app", "priority": "medium",
    },
    {
        "fund_name": "StartUp Health",
        "investor_type": "accelerator",
        "website": "https://startuphealth.com",
        "description": "Global health innovation company with 400+ portfolio companies across 27 countries.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Wellness"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$25K", "check_size_max": "$250K", "check_size_display": "$25K - $250K",
        "location": "New York, NY",
        "contact_name": "Steven Krein", "contact_email": "steven@startuphealth.com", "contact_title": "Co-Founder & CEO",
        "relevance_reason": "World's largest digital health portfolio. Health Moonshot Access to Care aligns with PalmCare.",
        "source": "openvc.app", "priority": "medium",
    },
    {
        "fund_name": "Fifty Years",
        "investor_type": "vc_fund",
        "website": "https://fifty.vc",
        "description": "Impact VC solving civilization-scale problems. Backed by 46 founders of $1B-$100B companies.",
        "focus_sectors": ["AI", "HealthTech", "Climate", "Education"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K", "check_size_max": "$2M", "check_size_display": "$250K - $2M",
        "location": "San Francisco, CA",
        "contact_name": "Seth Bannon", "contact_email": "seth@fifty.vc", "contact_title": "Managing Partner",
        "relevance_reason": "Impact + AI investing. Home care AI addresses critical caregiver shortage.",
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "Healthy Ventures",
        "investor_type": "vc_fund",
        "website": "https://healthy.vc",
        "description": "Digital health seed fund. Healthcare infrastructure software.",
        "focus_sectors": ["Digital Health", "HealthTech", "AI"],
        "focus_stages": ["Seed"],
        "check_size_min": "$1M", "check_size_max": "$2M", "check_size_display": "$1M - $2M",
        "location": "San Francisco, CA",
        "contact_email": "pitch@healthy.vc",
        "relevance_reason": "Healthcare infrastructure software specialist. PalmCare is infrastructure for home care.",
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Nina Capital",
        "investor_type": "vc_fund",
        "website": "https://nina.capital",
        "description": "Digital health VC investing in seed-stage across US and Europe.",
        "focus_sectors": ["Digital Health", "HealthTech", "AI", "Biotech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$200K", "check_size_max": "$1.5M", "check_size_display": "$200K - $1.5M",
        "location": "Barcelona / Palo Alto, CA",
        "contact_email": "dealflow@nina.capital",
        "relevance_reason": "Health-tech-only fund with US presence.",
        "source": "openvc.app", "priority": "medium",
    },
    {
        "fund_name": "Seed Healthcare",
        "investor_type": "vc_fund",
        "website": "https://seedhealthcare.com",
        "description": "Healthcare-exclusive venture fund.",
        "focus_sectors": ["Digital Health", "HealthTech", "MedTech"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "United States",
        "contact_name": "Todd Perman", "contact_email": "todd@seedhealthcare.com", "contact_title": "President & CEO",
        "relevance_reason": "Healthcare-only seed fund with post-acute care relationships.",
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Headwater Ventures",
        "investor_type": "vc_fund",
        "website": "https://headwater.vc",
        "description": "Midwest health IT investor improving access, quality, and cost.",
        "focus_sectors": ["HealthTech", "AI", "Health IT"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$500K", "check_size_display": "$100K - $500K",
        "location": "Minneapolis, MN",
        "contact_name": "Matt Miller", "contact_email": "matt@headwater.vc", "contact_title": "Founder & GP",
        "relevance_reason": "Midwest health IT specialist. Geographic alignment with PalmCare's Nebraska base.",
        "source": "signal.nfx.com", "priority": "high",
    },
    {
        "fund_name": "Wireframe Ventures",
        "investor_type": "vc_fund",
        "website": "https://wireframevc.com",
        "description": "AI, enterprise SaaS, and health seed fund. Unicorn portfolio (Enveda Biosciences).",
        "focus_sectors": ["AI", "Enterprise SaaS", "Health", "Climate"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "San Francisco, CA",
        "relevance_reason": "Health + enterprise AI/SaaS intersection.",
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "Bee Partners",
        "investor_type": "vc_fund",
        "website": "https://beepartners.vc",
        "description": "Pre-seed/seed fund. Human-machine convergence: AI, deep tech, enterprise. Pledges to answer every email.",
        "focus_sectors": ["AI", "Enterprise", "SaaS", "HealthTech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K", "check_size_max": "$3M", "check_size_display": "$250K - $3M",
        "location": "San Francisco, CA",
        "contact_name": "Michael Berolzheimer", "contact_email": "michael@beepartners.vc", "contact_title": "Founding Partner",
        "relevance_reason": "Pledges to answer every founder email. Human-machine convergence thesis fits PalmCare's voice AI.",
        "source": "signal.nfx.com", "priority": "medium",
    },
    {
        "fund_name": "Precursor Ventures",
        "investor_type": "vc_fund",
        "website": "https://precursorvc.com",
        "description": "Pre-seed specialist. $200M+ raised, 400+ companies backed. Focus on diverse founders.",
        "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$250K", "check_size_max": "$1M", "check_size_display": "$250K - $1M",
        "location": "San Francisco, CA",
        "contact_name": "Charles Hudson", "contact_title": "Founder & Managing Partner",
        "relevance_reason": "Pre-seed specialist backing diverse founders with hands-on support.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Hustle Fund",
        "investor_type": "vc_fund",
        "website": "https://hustlefund.vc",
        "description": "Pre-seed micro-fund. Sweet spot $75K. Fast decisions.",
        "focus_sectors": ["AI", "SaaS", "HealthTech"],
        "focus_stages": ["Pre-Seed"],
        "check_size_min": "$50K", "check_size_max": "$100K", "check_size_display": "$50K - $100K",
        "location": "San Francisco, CA",
        "contact_name": "Eric Bahn", "contact_email": "eric@hustlefund.vc", "contact_title": "General Partner",
        "relevance_reason": "Fast decisions. Good for round momentum.",
        "source": "signal.nfx.com", "priority": "medium",
    },
    {
        "fund_name": "NFX",
        "investor_type": "vc_fund",
        "website": "https://nfx.com",
        "description": "Network effects-focused VC. 500+ AI investments. Dedicated Bio team with Omri Drory.",
        "focus_sectors": ["AI", "Marketplaces", "HealthTech", "FinTech", "BioTech"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "San Francisco, CA / Palo Alto, CA",
        "contact_email": "qed@nfx.com",
        "relevance_reason": "500+ AI investments. Network effects thesis — PalmCare creates network effects as agencies adopt.",
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "SignalFire",
        "investor_type": "vc_fund",
        "website": "https://signalfire.com",
        "description": "$1.8B AUM. $50M AI Lab for seed funding + mentorship. Healthcare portfolio includes Qualified Health.",
        "focus_sectors": ["AI", "HealthTech", "SaaS", "Enterprise"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K", "check_size_max": "$30M", "check_size_display": "$250K - $30M",
        "location": "San Francisco, CA",
        "contact_email": "ailab@signalfire.com",
        "relevance_reason": "$50M AI Lab specifically for seed-stage AI founders. Healthcare partner Sooah Cho leads health investments.",
        "portfolio_companies": ["Qualified Health", "Solace", "All.Health"],
        "source": "openvc.app", "priority": "high",
    },
    {
        "fund_name": "Obvious Ventures",
        "investor_type": "vc_fund",
        "website": "https://obvious.com",
        "description": "$360M Fund V (2026). World positive: planetary, human, economic health. 10 investments/year.",
        "focus_sectors": ["HealthTech", "AI", "Climate", "Social Impact"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K", "check_size_max": "$12M", "check_size_display": "$250K - $12M",
        "location": "San Francisco, CA",
        "contact_name": "James Joaquin", "contact_email": "jj@obviousventures.com", "contact_title": "Co-Founder, MD",
        "relevance_reason": "Uses LLMs to reduce admin burden in healthcare. PalmCare does exactly this for home care.",
        "portfolio_companies": ["Recursion Pharmaceuticals", "Inceptive", "Beyond Meat", "Livongo"],
        "source": "openvc.app", "priority": "medium",
    },
    {
        "fund_name": "Khosla Ventures",
        "investor_type": "vc_fund",
        "website": "https://khosla.com",
        "description": "$16B fund. Cleveland Clinic partnership for clinical validation. Healthcare AI thesis.",
        "focus_sectors": ["AI", "HealthTech", "Deep Tech", "Climate"],
        "focus_stages": ["Seed", "Series A", "Series B+"],
        "check_size_min": "$100K", "check_size_max": "$50M", "check_size_display": "$100K - $50M",
        "location": "Menlo Park, CA",
        "contact_email": "kv@khoslaventures.com",
        "relevance_reason": "AI healthcare thesis + Cleveland Clinic partnership for clinical validation of portfolio companies.",
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Andreessen Horowitz (a16z)",
        "investor_type": "vc_fund",
        "website": "https://a16z.com",
        "description": "Mega-fund with dedicated Bio+Health fund. Invested in Ease Health ($41M), Hippocratic AI, Ambience Healthcare.",
        "focus_sectors": ["AI", "HealthTech", "SaaS", "Enterprise"],
        "focus_stages": ["Seed", "Series A", "Series B+"],
        "check_size_min": "$500K", "check_size_max": "$10M", "check_size_display": "$500K - $10M",
        "location": "Menlo Park, CA",
        "contact_name": "Vineeta Agarwala", "contact_title": "General Partner, Bio+Health",
        "relevance_reason": "Dedicated Bio+Health fund. Led Ease Health ($41M). Hippocratic AI and Ambience Healthcare in portfolio.",
        "portfolio_companies": ["Ease Health", "Hippocratic AI", "Ambience Healthcare"],
        "source": "vcsheet.com", "priority": "high",
    },
    {
        "fund_name": "Y Combinator",
        "investor_type": "accelerator",
        "website": "https://ycombinator.com",
        "description": "World's top accelerator. $500K standard deal. ~40% of recent batches AI-focused.",
        "focus_sectors": ["AI", "SaaS", "HealthTech", "Enterprise"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_display": "$500K",
        "location": "San Francisco, CA",
        "relevance_reason": "Gold standard. YC healthcare vertical has produced major companies.",
        "source": "turbofund.io", "priority": "high",
    },
    {
        "fund_name": "Gaingels",
        "investor_type": "syndicate",
        "website": "https://gaingels.com",
        "description": "Community syndicate with 4,000+ members and hands-on portfolio support.",
        "focus_sectors": ["Digital Health", "FinTech", "AI"],
        "focus_stages": ["Pre-Seed", "Seed", "Series A"],
        "check_size_min": "$200K", "check_size_max": "$500K", "check_size_display": "$200K - $500K",
        "location": "New York, NY",
        "relevance_reason": "Active healthcare syndicate with community support and follow-on.",
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "Heal Ventures",
        "investor_type": "vc_fund",
        "website": "https://heal.vc",
        "description": "New York-based healthcare VC. Health IT, Health Tech, AI at pre-seed/seed.",
        "focus_sectors": ["HealthTech", "Health IT", "AI"],
        "focus_stages": ["Pre-Seed", "Seed"],
        "check_size_min": "$100K", "check_size_max": "$1M", "check_size_display": "$100K - $1M",
        "location": "New York, NY",
        "contact_name": "Sahil Arora", "contact_email": "sahil@heal.vc", "contact_title": "Partner",
        "relevance_reason": "Healthcare seed fund with clinical psychology background partner.",
        "source": "signal.nfx.com", "priority": "medium",
    },
    {
        "fund_name": "SteelSky Ventures",
        "investor_type": "vc_fund",
        "website": "https://steelskyventures.com",
        "description": "Female-led AI-powered healthcare fund. Portfolio valued over $5.5B.",
        "focus_sectors": ["HealthTech", "Digital Health", "AI", "Women's Health"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$250K", "check_size_max": "$2M", "check_size_display": "$250K - $2M",
        "location": "New York, NY / Atlanta, GA",
        "contact_name": "Maria Velissaris", "contact_email": "maria@steelskyventures.com", "contact_title": "Founding & Managing Partner",
        "relevance_reason": "AI-powered healthcare fund with $5.5B portfolio. Improving access and outcomes aligns with PalmCare.",
        "portfolio_companies": ["Commons Clinic", "Lark Health", "23andMe"],
        "source": "steelskyventures.com", "priority": "medium",
    },
    {
        "fund_name": "City Light Capital",
        "investor_type": "vc_fund",
        "website": "https://citylight.vc",
        "description": "Impact investing VC since 2004. Safety & Care thesis.",
        "focus_sectors": ["Health", "Impact", "Education", "Safety & Care"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$3M", "check_size_display": "$500K - $3M",
        "location": "New York, NY",
        "contact_name": "Josh Cohen", "contact_email": "info@citylight.vc", "contact_title": "Partner",
        "relevance_reason": "Safety & Care thesis — invested in Headspace Health. PalmCare addresses nurse burnout and patient care.",
        "portfolio_companies": ["2U", "Headspace Health"],
        "source": "vcsheet.com", "priority": "medium",
    },
    {
        "fund_name": "AI Fund (Andrew Ng)",
        "investor_type": "vc_fund",
        "website": "https://aifund.ai",
        "description": "$176M venture studio by Andrew Ng. Builds and invests in AI companies across verticals.",
        "focus_sectors": ["AI", "Machine Learning", "HealthTech", "Enterprise"],
        "focus_stages": ["Seed", "Series A"],
        "check_size_min": "$500K", "check_size_max": "$5M", "check_size_display": "$500K - $5M",
        "location": "Palo Alto, CA",
        "relevance_reason": "Andrew Ng's AI studio. PalmCare's production AI pipeline is exactly the type of applied AI they champion.",
        "portfolio_companies": ["Landing AI", "Woebot Health", "Bearing AI"],
        "source": "turbofund.io", "priority": "high",
    },
]


def main():
    Base.metadata.create_all(bind=engine, tables=[Investor.__table__], checkfirst=True)
    db = Session()
    try:
        existing_count = db.query(Investor).count()
        print(f"Total investors in seed list: {len(INVESTORS)}")
        print(f"Existing investors in database: {existing_count}")

        added = 0
        skipped = 0
        updated = 0

        for data in INVESTORS:
            existing = db.query(Investor).filter(
                Investor.fund_name == data["fund_name"]
            ).first()

            if existing:
                if not existing.contact_email and data.get("contact_email"):
                    existing.contact_email = data["contact_email"]
                    existing.contact_name = data.get("contact_name", existing.contact_name)
                    existing.website = data.get("website", existing.website)
                    updated += 1
                skipped += 1
                continue

            inv = Investor(**data)
            db.add(inv)
            added += 1

        db.commit()

        final_count = db.query(Investor).count()
        print(f"\nResults:")
        print(f"  Added:   {added} new investors")
        print(f"  Skipped: {skipped} (already existed)")
        print(f"  Updated: {updated} (added missing contact info)")
        print(f"  Total in database: {final_count}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
