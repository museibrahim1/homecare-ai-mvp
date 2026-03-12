# Claude Skills & Instructions

**Always check this file when starting a new task.**

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Key Project Facts](#key-project-facts)
3. [Skills & APIs](#skills--apis)
4. [Session Log](#session-log)
5. [Upcoming Tasks](#upcoming-tasks)

---

## Quick Reference

| Task | Tool/API | Model |
|------|----------|-------|
| Create video | Remotion (`/videos/`) | Code-based |
| Generate voiceover | WaveSpeed | ElevenLabs v3 |
| Generate image | WaveSpeed | Nano Banana 2 |
| Quick TTS (dev) | OpenAI | tts-1-hd |
| Transcription | Deepgram | Nova-3 |
| Transcription fallback | OpenAI | Whisper-1 |
| AI Analysis | Anthropic | Claude Sonnet 4 |
| Email sending | Resend | `onboarding@resend.dev` (palmtai.com NOT verified) |
| Demo booking | `/demos/book` API | Google Calendar + Meet auto-scheduling |

---

## Key Project Facts

| Item | Value |
|------|-------|
| Product | PalmCare AI — voice-to-contract for home care |
| Founder | Muse Ibrahim, President & CEO |
| Company | Palm Technologies, INC. |
| Website | palmcareai.com |
| Email (workspace) | palmtai.com (Google Workspace) |
| Email (transactional) | `sales@send.palmtai.com` — **send.palmtai.com VERIFIED in Resend** (palmtai.com failed, use send.palmtai.com) |
| Reply-to | sales@palmtai.com |
| AI Agent email | ai@palmcareai.com (Cloudflare Worker → local daemon) |
| Dashboard | http://localhost:5050 (Flask, launchd) |
| Production API | https://api-production-a0a2.up.railway.app |
| Hosting | Railway (API), Vercel/Railway (Web) |
| Fundraising | $450K SAFE, $2.25M post-money valuation |
| ARR | $92K |
| Brand color | Teal (#0d9488) |
| Tagline | "Where care meets intelligence" / "PALM IT" |
| CMS Leads | 163 agencies with emails across 48 states |
| Investors | 60+ seeded with emails |
| Tech stack | Next.js (web), SwiftUI (iOS), FastAPI (API), Celery (worker), Deepgram (ASR), Claude (AI) |
| Cost per assessment | CONFIDENTIAL — do not include in any outgoing emails or marketing |
| API Keys | Anthropic, OpenAI, Deepgram, Resend, WaveSpeed, Nano Banana, Google Calendar |
| Google OAuth | Client ID `668945369325-lrmdd9q1d6m7ggojiqvporj8frqso31j.apps.googleusercontent.com` — set on Railway |
| Google Calendar | Connected on production — auto-schedules demos with Meet links |

---

## Skills & APIs

### Video Creation (Remotion)
- Location: `/videos/` — `src/`, `public/segments/`, `public/screenshots/`
- Commands: `cd videos && npm run dev` (preview), `npx remotion render CompositionId output.mp4`
- Best practices: `interpolate()` for linear, `spring()` for bouncy, `<Sequence>` for timing, `staticFile()` for assets
- Voices (OpenAI TTS): nova (recommended), onyx, alloy, fable, shimmer

### Voiceover (WaveSpeed + ElevenLabs v3)
- Endpoint: `POST https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3`
- Poll: `GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result`
- Recommended voice: Alice (female, clear, professional)
- Other voices: Aria, Sarah, Laura, Charlotte, Jessica, Lily, Roger, George, Charlie, Callum, Liam, Will, Eric, Chris, Brian, Daniel, Bill

### Image Generation (WaveSpeed + Nano Banana 2)
- Endpoint: `POST https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image`
- Resolutions: `0.5k`, `1k` (default), `2k`, `4k`
- Aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `21:9`, `9:21`, `5:4`, `4:5`, `16:10`, `10:16` — **`3:1` NOT supported, use `21:9`**
- **iPhone mockups**: ALWAYS use Nano Banana text-to-image, NEVER Pillow/PIL
- Prompt template: "Photorealistic iPhone 15 Pro in Space Black, [angle], [background]. Screen shows [PalmCare AI UI: teal #0d9488, stat cards, tab bar]."

### Transcription (Deepgram Nova-3)
- Endpoint: `https://api.deepgram.com/v1/listen`
- Features: Smart formatting, speaker diarization, sub-300ms latency, 36+ languages
- Batch: `apps/worker/libs/deepgram_asr.py` | Live: `POST /live/transcribe` | Fallback: Whisper

### Email Sending (Resend)
- `send.palmtai.com` is **VERIFIED** in Resend (verified March 10, 2026). Use `sales@send.palmtai.com` as sender.
- `palmtai.com` root domain verification failed — only use `send.palmtai.com` subdomain addresses.
- Always set `reply_to="sales@palmtai.com"` so replies go to the right place.
- Railway production `RESEND_API_KEY` may need refresh — check via Railway dashboard if sends fail.

### Demo Booking System
- Frontend: 4-step form on landing page (`apps/web/src/app/page.tsx` → `BookDemoSection`)
  - Step 1: Contact info | Step 2: Agency info | Step 3: Client count + software | Step 4: Date/time picker
- Backend: `apps/api/app/routers/demos.py`
  - `GET /demos/slots` — returns next 14 weekdays with 30-min time slots (9 AM–4:30 PM ET)
  - `POST /demos/book` — books demo, creates Google Calendar event with Meet link, sends emails
- Emails (Zoom-style clean design):
  - Prospect gets: confirmation with date, time, Meet link, "Join Demo" button
  - Admin gets: notification at sales@palmtai.com with all prospect details + "Start Meeting" button
- Google Calendar: Connected on production. Tokens stored in DB, auto-refresh. Works when user is signed out.
- Diagnostic: `GET /calendar/oauth-configured` — checks if Google OAuth env vars are set

### Google Calendar OAuth
- Config: `apps/api/app/core/config.py` → `google_client_id`, `google_client_secret`
- Connect flow: `/schedule` page → `handleConnectGoogle` → Google OAuth → `POST /calendar/connect` exchanges code
- Token storage: `User` model fields: `google_calendar_connected`, `google_calendar_access_token`, `google_calendar_refresh_token`, `google_calendar_token_expiry`
- Auto-refresh: `_refresh_token_if_needed()` in demos.py and `get_valid_access_token()` in calendar.py
- Redirect URI must be registered in Google Cloud Console: `https://palmcareai.com/schedule`

---

## Session Log

### Feb 25 (A) — Major Feature Sprint
Sales Leads CRM (190+ agencies), 5-email cold outreach, campaign analytics, churn analytics, HIPAA hardening, 50-state knowledge base, pipeline UI, Twilio removal (~2K lines), voiceprint disabled, EIN optional, privacy policy, marketing research.

### Feb 25 (B) — Testing & Performance
UI/CSS fixes, nav accessibility, 76+ tests passing, Pydantic v2 migration, k6 load tests (POST /clients bottleneck), pyannote removal, landing chat → Claude Haiku, internal cost model.

### Mar 1 (AM-A) — Architecture & Email Setup
ARCHITECTURE.md, MX/TXT records on send.palmcareai.com, Cloudflare Email Routing.

### Mar 1 (AM-B) — Email Marketing Redesign
5-email outreach rebuilt with PALM IT branding (teal), Apple-style layout, QR code footers.

### Mar 1 (PM) — Features + CMS + Dark Mode
Certification tracking, notes system (SmartNote/Task/Reminder), follow-up alerts, reminder poller, brand messaging, nav fixes, mobile app page, dark theme, investor CRM (60+ investors), CMS import all states (163 agencies).

### Mar 1 (Eve) — Marketing Video
Remotion video v1–v4, final: real Xcode screenshots, 39s 1080p. OpenAI TTS (nova).

### Mar 2 (PM) — Fundraising Profiles
WeFunder (live), AngelList Stack, Gust (financials, funding round, 9 sections).

### Mar 2 (Eve) — Investor Outreach Copy
AngelList pitch script (~450 chars, founder voice), use-of-funds breakdown.

### Mar 4 — AI Email Agent + Subagent Dashboard
AI email task system (Cloudflare Worker → local daemon → Claude API), 4 subagents (Marketing, Sales, Outreach, Reporting), Flask dashboard at localhost:5050, enhanced email reports with full file contents.

### Mar 5 — Agent Stability + New Agents + iOS Screenshots
Fixed JSON parsing (balanced-brace parser), PROJECT_ROOT detection, duplicate logging, broken symlinks, file task processing. Added Social Media Manager + Email Agent. 6 fresh iOS screenshots. 9 marketing graphics rebuilt.

### Mar 6 (AM) — Nano Banana AI Marketing
13 new AI-generated marketing graphics via Nano Banana 2. Agency/investor emails updated. Old pitch decks deleted. Pillow/PIL banned for mockups.

### Mar 6–7 — Web/Mobile Feature Sprint + Demo Booking
iOS: Removed TasksView from WorkspaceView, calendar sync to API, removed language picker, API_BASE_URL in Info.plist.
Web: CSV client import, removed automations modal, localStorage notification prefs, 2FA/MFA wired up, CSV export on /reports.
API: POST /clients optimized (index + flush), CSV export endpoints, admin email → sales@palmtai.com, demo booking system.
Demo booking: 4-step form, GET /demos/slots (14 days × 14 slots), POST /demos/book (Calendar + Meet + emails), fixed OAuth invalid_client on Railway, Zoom-style emails, switched sender to onboarding@resend.dev.

### Feb 22 — Marketing Pages, Nav Fixes, UI Polish
**Marketing website updates:**
- Features page (`/features`): removed 5 outdated cards (OCR Template Engine, Custom Forms, Custom Reporting, 2× Security), renamed sections (Caregiver Tools→Mobile App, Billing & Reports→Billing & Analytics), updated descriptions, mapped real CRM/iOS screenshots
- Mobile-app page (`/mobile-app`): replaced all React mock UI components with `PhoneFrame` component displaying actual iOS screenshots, added CSS for phone mockup frames with responsive styles
- Screenshots: 21 fresh CRM + iOS screenshots copied to `apps/web/public/screenshots/` and `ios/` subfolder

**Nav & contact fixes:**
- Removed "Help Center" link from Resources dropdown on landing page + features page (was redirecting to authenticated `/help` page)
- "Contact Us" now first item in Resources dropdown
- Removed fake phone number `(800) 555-1234` from contact page sidebar
- Removed `/help` from public sitemap (authenticated page)

**iOS app UI fixes (prior sessions carried forward):**
- Emergency contact card redesigned in ClientDetailView (new `emergencyContactCard` function with structured layout)
- Visit Overview tab now eagerly loads all pipeline data concurrently (`loadAllTabData`)
- Contract view formatted properly (was showing raw syntax)
- Billables view: removed timestamps, added accept/deny buttons
- Contract style gallery with 3 previewable visual styles
- Full app flow marketing video recorded (client → assessment → contract, 41s)

### Mar 11 — Phone Outreach, CRM Updates, Auto-Sequencing
**Outreach:**
- 17 phone calls logged and marked as completed in CRM (FL, NY, CT, DE agencies matched by phone number)
- 5 new agency contacts added from calls: McAngel Nurses (Lordina/Angela Berko), Doctors Preferred Healthcare (Sebrina Houston), Paradis HS Home Health (Ms Donaldson), Empower/Healthy Home Primary (Courtney Crane), Lucent Healthcare (Ivad)
- All 5 contacts emailed with warm_open template via verified `send.palmtai.com` domain
- 100 agencies from last 2 days enrolled in 5-email drip sequence

**Auto-sequencing feature:**
- Every email send now auto-starts the 5-email drip sequence for the lead (send_lead_email, approve_draft, campaign send, internal endpoints)
- New internal endpoints: `POST /leads/internal/add-and-email` (add leads + send + sequence), `POST /leads/internal/start-recent-sequences` (retroactive sequence start)
- Expanded STATE_NAMES to all 50 states + DC (was only NE/IA)

**Domain fix:**
- Discovered `send.palmtai.com` is already VERIFIED in Resend (since Mar 10)
- Fixed sender address from `onboarding@resend.dev` to `sales@send.palmtai.com`
- Railway production RESEND_API_KEY needs refresh (returning "API key is invalid")

---

## Upcoming Tasks

### IMMEDIATE
1. **Refresh RESEND_API_KEY on Railway** — Production key returns "invalid", update in Railway dashboard
2. **Marketing email launch** — 5-email cold outreach to 163+ agencies
3. **Investor outreach** — Email 60+ investors with v4 pitch deck
4. **Apple Developer enrollment** — business account museibrahim@palmtai.com
5. **Social media agents** — LinkedIn re-auth, Facebook Page token, Instagram business conversion

### BACKLOG
- Dark mode refinement (hardcoded light colors)
- BAAs and Resend replacement for full HIPAA compliance
- Gust Executive Summary completion

---

*Last updated: March 11, 2026*
