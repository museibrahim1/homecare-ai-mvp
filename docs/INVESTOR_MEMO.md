# PalmCare AI — Investor Memo

**Palm Technologies, Inc.**
**March 2026 | Confidential**

---

## The One-Liner

PalmCare AI turns a 30-minute home care conversation into a signed service contract — automatically — saving agencies 20+ hours of admin work every week.

---

## The Problem: A $150B Industry Running on Paper and Guesswork

In-home healthcare is one of the fastest-growing sectors in the U.S., projected to reach **$225B by 2030**. Yet the 30,000+ agencies that deliver this care still rely on manual, error-prone processes to onboard clients and generate contracts.

Here's what a typical intake looks like today:

1. A care coordinator visits a client's home and takes handwritten notes
2. Back at the office, they spend **2–4 hours** manually typing up an assessment
3. An admin re-enters the data into billing software
4. Someone else drafts a contract in Word, triple-checking rates and service codes
5. The contract is emailed, printed, signed, scanned, and filed

**The result:** It takes **5–10 business days** to go from first visit to signed contract. Agencies lose clients to faster competitors. Caregivers sit idle waiting for assignments. Revenue leaks through the cracks.

This isn't a niche pain point — it's the central bottleneck of every home care agency in America.

---

## The Solution: "Palm It"

PalmCare AI collapses the entire intake-to-contract workflow into a single action: **record the conversation**.

A care coordinator taps one button on their phone, conducts the assessment naturally, and PalmCare AI handles everything else:

- **Transcribes** the conversation in real-time using Deepgram Nova-3
- **Extracts** care needs, service hours, and billable rates using Claude Sonnet 4
- **Generates** a complete, agency-branded service contract
- **Exports** to PDF or DOCX, ready for signature

**30 minutes of conversation → signed contract. Same day.**

No typing. No re-entry. No back-and-forth. The AI understands medical terminology, state-specific billing codes, and agency-specific pricing — because it learns from every contract the agency has ever written.

---

## Why Now

Three forces are converging to make this the perfect moment:

1. **AI maturity** — Large language models (Claude, GPT-4) can now reliably extract structured medical and financial data from unstructured conversation. This was impossible 18 months ago.

2. **Regulatory tailwinds** — CMS mandates for Electronic Visit Verification (EVV) and interoperability are forcing agencies to digitize. They need software, and they're buying for the first time.

3. **Demographic tsunami** — 10,000 Americans turn 65 every day. The home care workforce shortage means agencies must do more with fewer admin staff. Automation isn't optional — it's survival.

---

## Product

PalmCare AI is a full-stack operating system for home care agencies, not just a point solution.

### Core AI Pipeline
| Step | What Happens | Technology |
|------|-------------|------------|
| Record | Coordinator taps "Palm It" on mobile | iOS (Swift) + Expo (React Native) |
| Transcribe | Real-time speech-to-text with speaker diarization | Deepgram Nova-3 |
| Extract | AI identifies services, hours, rates, care needs | Anthropic Claude Sonnet 4 |
| Generate | SOAP notes + branded contract created automatically | AI + DOCX templates |
| Deliver | PDF exported, ready for e-signature | One-click export |

### Full Platform
- **Client CRM** — Pipeline from lead → intake → active care
- **Contract Management** — Create, version, track, and e-sign agreements
- **Scheduling** — Google Calendar integration with caregiver assignments
- **Caregiver Mobile App** — Clock in/out, ADL logging, visit documentation
- **Billing & Analytics** — Revenue tracking, custom reporting, financial dashboards
- **HIPAA Compliance** — 256-bit encryption, audit trails, role-based access, MFA

### What Sets Us Apart
We're not building another EHR or scheduling tool. We're building the **AI brain** that sits on top of the entire agency workflow. Competitors like AxisCare, WellSky, and ClearCare digitize manual processes. **We eliminate them.**

---

## Business Model

### SaaS Subscription (Monthly/Annual)

| Plan | Price | Users | Clients | AI Contracts/mo |
|------|-------|-------|---------|-----------------|
| **Starter** | $299/mo | 1 | 50 | 5 |
| **Growth** | $599/mo | 10 | 200 | 25 |
| **Pro** | $1,299/mo | Unlimited | 1,000 | Unlimited |
| **Enterprise** | Custom | Custom | Custom | Custom |

- **14-day free trial**, no credit card required
- Annual plans save ~15%
- Average expected ACV: **$7,200–$15,600**

### Unit Economics

| Metric | Value |
|--------|-------|
| AI cost per assessment (~30 min audio) | **$0.37** |
| Revenue per assessment (Starter plan) | **$59.80** |
| **Gross margin per assessment** | **~99.4%** |
| Infrastructure cost (Railway) | **~$35/mo** |
| Typical client value to agency | **$2,000–$2,800/mo** |

The AI cost structure is our moat. At $0.37 per assessment, we can profitably serve the smallest agencies while maintaining 95%+ gross margins at scale.

---

## Market Opportunity

### Total Addressable Market (TAM)
- **30,000+** licensed home care agencies in the U.S.
- Average agency revenue: **$2M–$10M**
- Software spend: **3–5%** of revenue
- **TAM: $4.5B–$15B** (U.S. home care software)

### Serviceable Addressable Market (SAM)
- **12,000** agencies with $1M–$50M revenue (our sweet spot)
- At $7,200 ACV: **$86M SAM**
- At $15,600 ACV: **$187M SAM**

### Beachhead
- Small-to-mid agencies (10–200 clients) underserved by enterprise tools
- Agencies in growth mode acquiring new clients monthly
- States with aggressive EVV mandates driving digital adoption

---

## Traction & Milestones

| Milestone | Status |
|-----------|--------|
| Full-stack platform built (58+ routes, complete AI pipeline) | Done |
| Native iOS app (Swift/SwiftUI) | Done |
| Cross-platform mobile app (Expo/React Native) | Done |
| Deepgram Nova-3 integration (real-time transcription) | Done |
| Claude Sonnet 4 contract generation pipeline | Done |
| HIPAA compliance architecture (~89% coverage) | Done |
| Stripe billing integration | Done |
| Google Calendar/Drive/Gmail integrations | Done |
| OCR template engine (agencies upload existing templates) | Done |
| App Store submission preparation | In Progress |
| First paying customers | Next milestone |

**We've built the product.** The entire platform — backend, frontend, mobile apps, AI pipeline, billing, compliance — is live and functional. We're at the inflection point between product and distribution.

---

## Go-to-Market Strategy

### Phase 1: Founder-Led Sales (Now → Q3 2026)
- Direct outreach to agencies via cold email + LinkedIn
- Target: agencies with $5M–$50M revenue showing growth signals
- Demo-first sales motion (14-day free trial → onboarding call → conversion)
- Goal: **25 paying agencies**

### Phase 2: Channel Partnerships (Q3 2026 → Q1 2027)
- Partner with home care consultants and franchise networks
- Integration partnerships with EVV providers
- State association sponsorships and conference presence
- Goal: **100 agencies, $1M ARR**

### Phase 3: Product-Led Growth (2027+)
- Self-serve onboarding for Starter plan
- App Store organic acquisition
- Referral program (agencies refer agencies)
- Expand to adjacent verticals (hospice, behavioral health, skilled nursing)
- Goal: **500+ agencies, $5M+ ARR**

---

## Competitive Landscape

| Company | What They Do | Weakness |
|---------|-------------|----------|
| **AxisCare** | Scheduling + billing | No AI, no contract generation |
| **WellSky (ClearCare)** | Enterprise home care platform | Expensive, slow to innovate |
| **CareTime** | Scheduling + EVV | No AI, limited to operations |
| **Axxess** | Home health + hospice EHR | Clinical focus, not contract workflow |
| **HHAeXchange** | Medicaid-focused EVV | Narrow market, no AI |

**Our advantage:** No competitor offers AI-powered voice-to-contract. They digitize paperwork. We eliminate it. By the time incumbents build AI capabilities, we'll own the workflow and the data.

---

## Team

### Muse Ibrahim — Founder & CEO
- Full-stack engineer who built the entire PalmCare AI platform solo
- Deep domain expertise in home care operations and compliance
- Technical founder with the rare ability to ship product fast — 58+ routes, native iOS app, AI pipeline, and HIPAA architecture built and running

**We're hiring:** Seeking a Head of Sales and a Senior ML Engineer to accelerate go-to-market and deepen AI capabilities.

---

## The Vision

Home care is just the beginning.

Every service industry that relies on in-person assessments — insurance adjusters, real estate inspectors, social workers, veterinary visits — faces the same problem: **conversations happen in the field, but contracts are created at a desk.**

PalmCare AI is building the universal **voice-to-contract** engine. Home care is our beachhead because the pain is acute, the market is large, and the regulatory environment creates natural switching costs.

In five years, we see PalmCare AI as the standard operating system for in-home services — the platform agencies can't operate without, powered by an AI that gets smarter with every conversation it processes.

---

## The Ask

**Raising: Pre-Seed / Seed Round**

Use of funds:
- **40% — Sales & Marketing** — Hire Head of Sales, fund outbound campaigns, attend industry conferences
- **30% — Engineering** — Hire Senior ML Engineer, scale infrastructure, deepen AI capabilities
- **20% — Operations** — HIPAA certification (SOC 2 Type II), legal, insurance
- **10% — Reserve** — Runway buffer

### What Investors Get
- A **fully built product** with 99%+ gross margins — not a prototype, not a pitch deck
- A **massive, growing market** with clear regulatory tailwinds
- A **technical founder** who ships — the entire platform was built by one person
- A **defensible AI moat** — every contract processed makes the system smarter
- **First-mover advantage** in AI-powered home care contract automation

---

## Contact

**Muse Ibrahim**
Founder & CEO, Palm Technologies, Inc.

Email: museibrahim@palmtai.com
Phone: (213) 569-7693
Web: palmcareai.com

---

*This document is confidential and intended solely for the recipient. It does not constitute an offer to sell securities.*
