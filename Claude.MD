# Claude Skills & Instructions

This document contains instructions for tools, APIs, and skills that Claude should use when asked to perform specific tasks. **Always check this file when starting a new task.**

---

## Table of Contents
1. [Video Creation (Remotion)](#video-creation-remotion)
2. [Voiceover Generation (WaveSpeed + ElevenLabs)](#voiceover-generation-wavespeed--elevenlabs)
3. [Image Generation (WaveSpeed + Nano Banana 2)](#image-generation-wavespeed--nano-banana-2)
4. [Transcription (Deepgram Nova-3)](#transcription-deepgram-nova-3)
5. [Project Memory (Session Log)](#project-memory-session-log)
6. [Upcoming Tasks & Priorities](#upcoming-tasks--priorities)
7. [Key Project Facts](#key-project-facts-quick-reference)

---

## Video Creation (Remotion)

### When to Use
When the user asks to create, edit, or render videos, animations, or motion graphics.

### Setup Location
```
/videos/                    # Remotion project root
├── src/
│   ├── index.ts           # Entry point
│   ├── Root.tsx           # Composition registration
│   └── compositions/      # Video components
├── public/
│   ├── segments/          # Audio narration files
│   └── screenshots/       # App screenshots for demos
├── scripts/
│   └── generate_narration.py  # TTS generation script
└── package.json
```

### Key Commands
```bash
# Start preview studio
cd videos && npm run dev

# Render video
cd videos && npx remotion render CompositionId output.mp4

# Generate narration (OpenAI TTS)
cd videos && python3 scripts/generate_narration.py --voice nova --segments
```

### Remotion Best Practices
- Use `interpolate()` for linear animations
- Use `spring()` for bouncy, natural motion
- Use `<Sequence>` to time multiple scenes
- Always add buffer time (0.5-1s) after audio in each scene
- Use `staticFile()` for assets in /public folder

### Available Voices (OpenAI TTS)
| Voice | Style |
|-------|-------|
| nova | Female, warm, professional (recommended) |
| onyx | Male, deep, authoritative |
| alloy | Neutral, balanced |
| fable | British, expressive |
| shimmer | Female, soft, gentle |

---

## Voiceover Generation (WaveSpeed + ElevenLabs)

### When to Use
When the user asks to generate voiceovers, narration, speech, or audio from text.

### API Configuration
```
Provider: WaveSpeed AI
Model: ElevenLabs Eleven V3
API Key: Set WAVESPEED_API_KEY in .env
```

### API Endpoints
```
# Submit task
POST https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3
Authorization: Bearer $WAVESPEED_API_KEY

# Get result (poll until status=completed)
GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
```

### Request Format (Submit Task)
```json
{
  "text": "Your text to convert to speech",
  "voice_id": "Alice",
  "similarity": 1.0,
  "stability": 0.5,
  "use_speaker_boost": true
}
```

### Available ElevenLabs Voices
- Alice (female, clear, professional) - RECOMMENDED
- Aria (female, expressive)
- Sarah (female, soft)
- Laura (female, warm)
- Charlotte (female, elegant)
- Jessica (female, friendly)
- Lily (female, gentle)
- Roger (male, authoritative)
- George (male, deep)
- Charlie (male, casual)
- Callum (male, Scottish)
- Liam (male, young)
- Will (male, confident)
- Eric (male, clear)
- Chris (male, warm)
- Brian (male, newscast)
- Daniel (male, British)
- Bill (male, mature)

### Usage Instructions
1. Use ElevenLabs v3 via WaveSpeed for high-quality voiceovers
2. For video narration, generate audio then place in `/videos/public/segments/`
3. Prefer ElevenLabs over OpenAI TTS for final production audio

---

## Image Generation (WaveSpeed + Nano Banana 2)

### When to Use
When the user asks to generate images, pictures, illustrations, or graphics.

### API Configuration
```
Provider: WaveSpeed AI
Model: Nano Banana 2 (google/nano-banana-2/text-to-image)
API Key: Set WAVESPEED_API_KEY in .env
```

### Text-to-Image Endpoint
```
# Submit task
POST https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image
Authorization: Bearer $WAVESPEED_API_KEY

# Get result (poll until status=completed)
GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
```

### Text-to-Image Request Format
```json
{
  "prompt": "Your image description",
  "resolution": "1k",
  "aspect_ratio": "16:9",
  "enable_web_search": false,
  "output_format": "png"
}
```

### Image Editing Endpoint
```
# Submit edit task
POST https://api.wavespeed.ai/api/v3/google/nano-banana-2/edit-image
Authorization: Bearer $WAVESPEED_API_KEY

# Get result (poll until status=completed)
GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
```

### Image Editing Request Format
```json
{
  "prompt": "Describe the edit you want",
  "image_url": "https://example.com/source-image.png",
  "resolution": "1k",
  "output_format": "png"
}
```

### Resolution Options
- `0.5k` — Fast, low-res previews
- `1k` — Standard quality (recommended default)
- `2k` — High quality
- `4k` — Maximum quality (slower)

### Aspect Ratio Options
- `1:1` — Square
- `16:9` — Widescreen landscape (recommended for video thumbnails)
- `9:16` — Vertical/portrait (stories, reels)
- `4:3` — Standard landscape
- `3:4` — Standard portrait
- `3:2` — Photo landscape
- `2:3` — Photo portrait
- `21:9` — Ultra-wide
- `9:21` — Ultra-tall
- `5:4` — Slight landscape
- `4:5` — Slight portrait (Instagram)
- `16:10` — Wide display
- `10:16` — Tall display
- `3:1` — Panoramic banner

### Key Upgrades over Nano Banana Pro
- Up to 4K resolution
- Multi-character consistency (up to 5 characters)
- Better text rendering in images
- Web search grounding for real-time accuracy (`enable_web_search: true`)
- 14 flexible aspect ratios
- Image editing support (modify existing images with text prompts)

### Usage Instructions
1. Use Nano Banana 2 for high-quality image generation with flexible sizing
2. Use `1k` resolution for most tasks, `4k` for final production assets
3. Use `16:9` aspect ratio for video thumbnails
4. Use `1:1` for social media posts
5. Enable `enable_web_search` when the prompt references real-world entities or current events
6. Use the edit endpoint to modify existing images instead of regenerating from scratch

---

## Transcription (Deepgram Nova-3)

### When to Use
When processing audio recordings for transcription, either batch (pipeline) or live (real-time preview).

### API Configuration
```
Provider: Deepgram
Model: Nova-3
API Key: Set DEEPGRAM_API_KEY in .env
Endpoint: https://api.deepgram.com/v1/listen
```

### Features
- Smart formatting (currency, phone numbers, medical terms)
- Built-in speaker diarization (no separate pyannote step)
- Sub-300ms latency for live transcription
- 36+ languages

### Backend Integration
- **Batch (pipeline):** `apps/worker/libs/deepgram_asr.py` - auto-selected when DEEPGRAM_API_KEY is set
- **Live (real-time):** `POST /live/transcribe` - sends audio chunk, returns instant transcript
- **Fallback:** OpenAI Whisper when Deepgram key not configured

### Pricing
- Pay-as-you-go: ~$0.0077/minute
- Cheaper than Whisper ($0.006/min) for batch, slightly more for streaming

---

## Quick Reference

| Task | Tool/API | Model |
|------|----------|-------|
| Create video | Remotion | N/A (code-based) |
| Generate voiceover | WaveSpeed | ElevenLabs v3 |
| Generate image | WaveSpeed | Nano Banana 2 |
| Quick TTS (dev) | OpenAI | tts-1-hd |
| Transcription (primary) | Deepgram | Nova-3 |
| Transcription (fallback) | OpenAI | Whisper-1 |
| AI Analysis | Anthropic | Claude Sonnet 4 |

---

## Adding New Skills

When learning a new tool or API:
1. Add a new section to this document
2. Include: When to Use, API Config, Request Format, Best Practices
3. Update the Table of Contents
4. Commit changes with message "Update Claude.MD with [skill name]"

---

## Project Memory (Session Log)

This section tracks what has been done across sessions so Claude can pick up context without re-reading full transcripts. Update this section at the end of every session.

---

### Session: February 25, 2026 (Session A) — Major Feature Sprint

**What was done:**
- **Sales Leads CRM**: Built from scratch — CMS API import (190+ agencies from NE/IA), `SalesLead` model, admin-only router, `/admin/sales-leads` page with filters, email tracking, activity timeline
- **Contact research**: 6 parallel subagents found websites/emails for 190 agencies; 70 more added; 4 agents removed 58 government/hospital duplicates. Final: 201 leads, 73 with email
- **Email campaigns**: 5-email cold outreach sequence (Warm Open, Pattern Interrupt, Aspiration, Proof Point, Graceful Exit), Resend webhook for open tracking, bulk send, campaign launcher modal
- **Campaign analytics**: Sequence automation, per-template stats, funnel view, `email_campaign_events` table
- **Churn analytics**: `/admin/analytics` page; provider "My Activity" widget; engagement scores
- **HIPAA**: Log sanitization; voiceprint encryption, MFA, password history
- **50-state knowledge base**: `docs/state-assessment-requirements.md` for all 50 states
- **Pipeline UI**: Drag-and-drop, step progress, animations
- **Twilio removal**: ~2,000 lines removed; Call model and related code deleted
- **Voiceprint disabled**: Router disabled; pipeline step skipped; settings UI removed
- **EIN**: Made optional in registration
- **Privacy policy**: Updated with consent and recording disclosures
- **Marketing research**: `docs/marketing-research.md` from 10 brands; plain-text email templates; Muse Ibrahim signature; product image; QR code

**Key decisions:**
- Plain-text emails preferred over HTML for cold outreach
- Signature: Muse Ibrahim, President & CEO, Palm Technologies, INC.; send from `sales@palmtai.com`
- Government/hospital agencies excluded from sales leads
- Mobile app as companion app in `/mobile/` in same monorepo

---

### Session: February 25, 2026 (Session B) — Testing, Performance & Code Quality

**What was done:**
- **UI fixes**: Static Tailwind classes for chat bubbles; deterministic waveform bars; FAQ `aria-expanded`; mobile menu fix
- **CSS cleanup**: Removed global `.text-white` override; scoped `bg-black`; gradient exceptions only
- **Nav accessibility**: `aria-haspopup`, `aria-expanded`, keyboard handling (Enter/Space/ArrowDown/Escape), focus/blur
- **Tests**: 76+ pipeline tests passing; API pipeline tests fixed; 22 passed with Python 3.11 + Postgres
- **Pydantic v2 migration**: `class Config` → `ConfigDict` in schemas; warnings reduced from 29 to 4
- **Performance testing**: k6 load tests; baseline (5 VUs) and spike (50 VUs); `POST /clients` identified as bottleneck
- **Pyannote removal**: Diarization consolidated into Deepgram Nova-3; pyannote step skipped
- **Landing chat**: Switched from OpenAI to Claude Haiku
- **Cost model**: `docs/API_COST_MODEL.md` (~$0.37 per 30-min assessment); `ARCHITECTURE.md` updated

**Key decisions:**
- Deepgram Nova-3 for both transcription and diarization (no pyannote)
- Cost target: ~$0.37 per assessment; ~5,400x–7,500x ROI per client
- Docker/Postgres required for API pipeline tests

---

### Session: March 1, 2026 (Morning A) — Architecture & Email Setup

**What was done:**
- Created/updated `docs/ARCHITECTURE.md` with all 5 apps (Web, Expo, iOS, FastAPI, Celery)
- Added MX and TXT records on `send.palmcareai.com` via Cloudflare API (Resend SPF)
- Left root MX for `palmcareai.com` pointing to Gmail
- User manually enabled Cloudflare Email Routing for forwarding

**Key decisions:**
- Use `send` subdomain for Resend (MX + TXT), not root domain, to avoid overriding Google Workspace MX
- Use Cloudflare Email Routing for forwarding instead of Resend receiving

---

### Session: March 1, 2026 (Morning B) — Email Marketing Redesign

**What was done:**
- Rebuilt 5-email cold outreach sequence and mobile app launch email
- Switched to PALM IT branding: teal (#0d9488), "Palm It" CTAs, "Where care meets intelligence"
- Applied Apple-style layout: sectioned content, stat blocks, gradient CTAs
- Updated subject lines and copy to match Brand Guidelines
- Added QR code to all email footers
- Updated `apps/api/app/routers/sales_leads.py`, `apps/web/public/email-preview.html`, `apps/web/src/emails/mobile-app-launch.html`

**Key decisions:**
- Teal instead of indigo for brand color
- "Palm It" as the main CTA
- Apple One email as the layout reference
- QR code in footer of every email

---

### Session: March 1, 2026 (Afternoon) — Major Feature Sprint + CMS + Dark Mode

**What was done:**
- **Certification tracking**: `certification_expiry_dates` JSONB on caregivers, `GET /caregivers/expiring`, frontend badges and compliance alerts
- **Notes backend**: SmartNote, Task, Reminder models, migration 024, CRUD API, Claude-based AI extraction
- **Notes frontend**: `/notes` page with split view, task list, reminder badges, AI Extract button
- **Follow-up alerts**: `nextFollowUp` on care tracker, overdue badges in timeline/board views
- **Reminder system**: `ReminderPoller` (60s polling), email notifications via Resend
- **Brand messaging**: Landing, auth, dashboard, marketing pages updated with "PALM IT" and brand voice
- **Nav fixes**: Dropdown hover gap fixed, mobile menu closes on link click
- **Mobile app page**: Restructured to hero + stats + features grid + app showcase (3 phones)
- **Dark theme**: `.landing-dark` added to marketing pages; body, theme defaults, and Sidebar updated for dark mode
- **API providers**: Backend prefers Claude over OpenAI; privacy page mentions Deepgram + Anthropic
- **Investor CRM**: New Investor model, API, frontend page, bulk email, seed from vcsheet.com and other sources
- **CMS import all states**: Import all US states, exclude government agencies, "Remove No-Email" cleanup, bulk import with emails
- **Agencies**: 163 agencies with verified emails across 48 states; seed endpoint for sales leads
- **Investor seed**: Clear-and-reseed endpoint; 60+ investors with emails

**Key decisions:**
- One migration (024) for certification and notes tables
- Rename `getNote`/`updateNote` to `getSmartNote`/`updateSmartNote` to avoid conflicts
- `.landing-dark` to fix inverted `dark-*` variables in default light theme
- Default app theme to dark
- Investor CRM kept separate from agencies list
- CMS import excludes government agencies by default

---

### Session: March 1, 2026 (Evening) — Marketing Video

**What was done:**
- Built PalmCare AI marketing video using Remotion (4 iterations)
- V1: Branded intro, Scene 1 (assessment) and Scene 2 (contract) with animated captions
- V2: Real PalmCare logo, orb intro, mobile screenshots, 9-segment OpenAI TTS voiceover (nova), QR code
- V3: Intro rebuilt from Expo/mobile code (rejected by user)
- V4 (final): Real Xcode simulator screenshots: landing page with organic blob orb and record screen
- Final output: `videos/output/palmcare-ad-v4.mp4` (39s, 1080p, 22 MB)

**Key decisions:**
- Used OpenAI TTS (tts-1-hd) because no WaveSpeed API key was available
- iOS/Xcode app is the source of truth, not the Expo `/mobile/` folder
- Real screenshots in the video instead of recreating UI in code

---

### Session: March 2, 2026 (Afternoon) — Fundraising Platform Profiles

**What was done:**
- **WeFunder**: Elevator pitch, website, 4 investor highlights, team bio — published live
- **AngelList Stack**: Company description, contact email (museibrahim@palmtai.com), website — completed
- **Gust**: Company basics, financials (ARR $92K, burn rate, year-by-year 2024-2028), funding round ($450K SAFE, $2.25M post-money), all 9 Business Details sections, Company Summary — mostly completed

**Key decisions:**
- All Gust sections kept under 450 characters
- Financials derived from user's Excel model (quarterly rollup)
- Expenditure = COGS + OpEx per quarter

**Status:** Gust Executive Summary may still need to be filled in

---

### Session: March 2, 2026 (Evening) — Investor Outreach Copy

**What was done:**
- Multiple iterations of AngelList pitch script (final: ~450 chars, founder voice)
- Final script: "I tap record. I talk. A contract appears. That's it..."
- Use-of-funds breakdown: 40% Sales & Marketing, 30% Engineering, 20% Operations, 10% Reserve

**Key decisions:**
- In-chat responses only, no new files for investor copy
- Original founder-style copy, not pitch-deck language
- 450 character max for AngelList script

---

### Session: March 4, 2026 — AI Email Agent + Subagent Dashboard + API Keys

**What was done:**
- **AI Email Task System**: Built end-to-end asynchronous AI agent that receives tasks via email and executes them autonomously
  - Cloudflare Email Worker (`workers/email-receiver/`) intercepts emails to `ai@palmcareai.com`, stores in KV
  - Local daemon (`scripts/ai_task_daemon.py`) polls CF Worker for tasks, executes via Claude API, emails results back
  - File-based task queue (`~/.palmcare/tasks/`) as local fallback + `aitask` CLI helper
  - macOS LaunchAgent (`com.palmcare.ai-tasks.plist`) keeps daemon running 24/7
- **4 Specialized Subagents** (`scripts/ai_subagents.py`):
  - Marketing Agent — campaigns, content, branding, image/voiceover generation
  - Sales Agent — lead management, CRM, outreach, pitch visuals
  - Outreach Agent — email sending scripts, bulk campaigns, personalization
  - Reporting Agent — analytics, dashboards, status reports, infographics
  - Auto-routing based on email subject tags (`[MARKETING]`, `[SALES]`, etc.) or keyword detection
- **Subagent Dashboard** (`scripts/dashboard.py`): Flask app on `http://localhost:5050`
  - Real-time daemon status, task counts, subagent cards with task history
  - Clickable task rows expand to show full summary, notes, files changed, commit hash
  - Live color-coded log viewer, auto-refresh every 5s
  - macOS LaunchAgent (`com.palmcare.dashboard.plist`) keeps it running
- **Email Reports Enhanced**: Task results now include full file contents in email (not just filenames)
  - Styled code blocks with dark headers, syntax-appropriate fonts
  - Agent name badge with color, HTML escaping, duration display
  - Results also saved as `.result.json` in `~/.palmcare/completed/` for dashboard
- **Marketing Agent Output**: Created `marketing/social-media-copy.md` (full copy bank: LinkedIn, Instagram, Twitter, Facebook, Stories, hashtag strategy, content calendar, CTAs) and `marketing/social-media-graphics.md` (5 graphic specs with brand guidelines)
- **API Keys Configured**:
  - `WAVESPEED_API_KEY` — ElevenLabs v3 voiceovers (was missing, now set)
  - `NANO_BANANA_API_KEY` — Nano Banana Pro image generation (separate from WaveSpeed)
  - All subagent prompts updated with correct key references

**Key files created/modified:**
- `scripts/ai_task_daemon.py` — Main daemon with CF Worker polling, result saving, enhanced email reports
- `scripts/ai_task_executor.py` — Claude-powered task executor
- `scripts/ai_subagents.py` — 4 subagent definitions with WaveSpeed/Nano Banana capabilities
- `scripts/dashboard.py` — Flask dashboard UI
- `workers/email-receiver/src/index.ts` — Cloudflare Email Worker
- `workers/email-receiver/wrangler.toml` — Worker config with KV binding
- `marketing/social-media-copy.md` — Social media copy bank (marketing agent output)
- `marketing/social-media-graphics.md` — Graphics spec sheet (marketing agent output)

**Key decisions:**
- Cloudflare Email Worker + KV for email intake (Gmail IMAP blocked by Google Workspace, Resend receiving unreliable)
- All daemon files deployed to `~/.palmcare/` to avoid macOS Desktop sandbox restrictions
- `WAVESPEED_API_KEY` and `NANO_BANANA_API_KEY` are separate keys (user clarified)
- Email reports include full file contents so user can see results without opening repo
- Dashboard runs on localhost:5050 via launchd

**Architecture:**
```
Email to ai@palmcareai.com
  → Cloudflare Email Routing
  → CF Worker (stores in KV)
  → Local daemon polls /tasks endpoint every 30s
  → Routes to appropriate subagent
  → Claude API executes task
  → Results emailed to support@palmtai.com
  → Results saved to ~/.palmcare/completed/*.result.json
  → Dashboard at localhost:5050 shows everything
```

---

## Upcoming Tasks & Priorities

### IMMEDIATE (March 5, 2026)
1. **Investor Outreach** — Start reaching out to investors from the seeded investor list (60+ investors with emails)
2. **Marketing Emails** — Launch the 5-email cold outreach sequence to 163+ agencies
3. **Gust Executive Summary** — May still need to be completed
4. **Test subagent tasks via email** — Send real marketing/sales tasks to ai@palmcareai.com

### IN PROGRESS
- Dark mode refinement — checking dashboard and app pages for hardcoded light colors
- AI email agent system is live and running

### BACKLOG
- `POST /clients` performance optimization (identified as bottleneck in k6 tests)
- BAAs and Resend replacement for full HIPAA compliance
- Mobile companion app development (in `/mobile/`)

---

## Key Project Facts (Quick Reference)

| Item | Value |
|------|-------|
| Product | PalmCare AI — voice-to-contract for home care |
| Founder | Muse Ibrahim, President & CEO |
| Company | Palm Technologies, INC. |
| Website | palmcareai.com |
| Email domain | palmtai.com (Google Workspace), send.palmcareai.com (Resend) |
| AI Agent email | ai@palmcareai.com (Cloudflare Worker → local daemon) |
| Dashboard | http://localhost:5050 (Flask, launchd) |
| Fundraising | $450K SAFE, $2.25M post-money valuation |
| ARR | $92K |
| Brand color | Teal (#0d9488) |
| Tagline | "Where care meets intelligence" / "PALM IT" |
| CMS Leads | 163 agencies with emails across 48 states |
| Investors | 60+ seeded with emails |
| Tech stack | Next.js (web), SwiftUI (iOS), FastAPI (API), Celery (worker), Deepgram (ASR), Claude (AI) |
| Cost per assessment | ~$0.37 |
| API Keys | Anthropic, OpenAI, Deepgram, Resend, WaveSpeed, Nano Banana Pro, Google Calendar |

---

*Last updated: March 4, 2026*
