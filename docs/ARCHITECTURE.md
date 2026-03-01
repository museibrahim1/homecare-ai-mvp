# PalmCare AI — Full Project Architecture

*Last updated: March 1, 2026*

---

## 1. Top-Level Structure

```
AI Voice Contracter/
├── apps/                    # Core application services
│   ├── api/                 # FastAPI backend (Python 3.11)
│   ├── worker/              # Celery background worker (Python 3.11)
│   └── web/                 # Next.js 14 admin frontend (TypeScript)
├── mobile/                  # Expo 55 / React Native mobile app
├── ios-app/                 # Native Swift iOS app (PalmCareAI)
├── videos/                  # Remotion 4 video generation
├── scripts/                 # Utility & seed scripts
├── infra/                   # Infrastructure configs (Postgres, MinIO)
├── templates/               # Document templates (contracts, notes)
├── tests/                   # Test suite (pipeline, API, performance)
├── compliance/              # HIPAA compliance docs & BAAs
├── docs/                    # Documentation
├── .github/                 # CI/CD workflows (GitHub Actions)
├── docker-compose.yml       # Local development stack
├── .env.example             # Environment variable template
└── CLAUDE.md                # AI assistant skills reference
```

---

## 2. Tech Stack by Component

| Component | Language | Framework | Key Libraries |
|-----------|----------|-----------|---------------|
| **API** | Python 3.11 | FastAPI, SQLAlchemy, Alembic | JWT, bcrypt, boto3, Resend, Stripe |
| **Worker** | Python 3.11 | Celery | OpenAI, Anthropic, Deepgram, pyannote, pydub |
| **Web** | TypeScript | Next.js 14, React 18 | Tailwind CSS, Zustand, lucide-react |
| **Mobile** | TypeScript | Expo 55, React Native 0.83 | NativeWind, expo-audio, expo-secure-store |
| **iOS** | Swift | SwiftUI | AVFoundation, native HTTP |
| **Videos** | TypeScript | Remotion 4 | React 18 |
| **Database** | SQL | PostgreSQL 16 | pgcrypto (UUID) |
| **Cache/Broker** | — | Redis | Celery broker + result backend |
| **Object Storage** | — | MinIO (S3-compatible) | Audio files, documents |

---

## 3. Service Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Docker Compose Stack                             │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │   Web    │───▶│   API    │───▶│ Postgres │    │  Redis   │           │
│  │  :3000   │    │  :8000   │    │  :5432   │    │  :6379   │           │
│  └──────────┘    └────┬─────┘    └─────▲────┘    └────┬─────┘           │
│                       │                │               │                 │
│                       ▼                │               ▼                 │
│                  ┌──────────┐          │         ┌──────────┐           │
│                  │  MinIO   │          └─────────│  Worker  │           │
│                  │  :9000   │◀──────────────────│  Celery  │           │
│                  └──────────┘                    └──────────┘           │
│                                                                          │
│  ┌───────────────┐                                                       │
│  │ Stirling-PDF  │  (OCR for contract templates)                         │
│  │    :8080      │                                                       │
│  └───────────────┘                                                       │
└──────────────────────────────────────────────────────────────────────────┘

   Mobile App (Expo) ──┐
                       ├──▶ API (:8000)
   iOS App (Swift) ────┘
```

### External API Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| **ASR (primary)** | Deepgram Nova-3 | Speech-to-text transcription |
| **ASR (fallback)** | OpenAI Whisper | Fallback transcription |
| **LLM (primary)** | Anthropic Claude Sonnet 4 | Visit notes, contracts, analysis |
| **LLM (secondary)** | OpenAI GPT | Supplementary AI tasks |
| **Diarization** | pyannote | Speaker identification |
| **Email** | Resend | Transactional email |
| **Payments** | Stripe | Subscription billing |
| **Storage** | MinIO (S3) | Audio files, documents |
| **OCR** | Stirling-PDF | Contract template processing |
| **Voiceover** | WaveSpeed + ElevenLabs v3 | Marketing audio |
| **Image Gen** | WaveSpeed + Nano Banana Pro | Marketing images |
| **OAuth** | Google | SSO authentication |

---

## 4. Audio Processing Pipeline

```
1. Upload Audio  →  API stores in MinIO (S3)
2. Transcribe    →  Worker: Deepgram Nova-3 (or Whisper fallback)
3. Diarize       →  Worker: pyannote speaker diarization
4. Align         →  Worker: Align diarization with transcript
5. Bill          →  Worker: Rules-based billable block detection
6. Note          →  Worker: AI visit notes (Claude Sonnet 4)
7. Contract      →  Worker: AI contract generation (Claude Sonnet 4)
8. Export        →  Stirling-PDF (OCR) + python-docx (DOCX templates)
```

---

## 5. Web Application (Next.js 14) — Detailed Breakdown

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Icons:** lucide-react
- **Charts:** Custom chart components (Bar, Donut, Area, Sparkline)
- **API Client:** Custom `ApiClient` class with retry + timeout logic

### Page Structure (58 pages)

#### Public Pages (Marketing / Auth)
| Route | Purpose |
|-------|---------|
| `/` | Landing page (features, pricing, testimonials, FAQ, contact form) |
| `/about` | About page |
| `/features` | Features showcase |
| `/pricing` | Pricing plans |
| `/contact` | Contact form |
| `/login` | Login |
| `/register` | Agency registration |
| `/register/status` | Registration status |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/status` | System status page |
| `/mobile-app` | Mobile app download page |
| `/sitemap.ts` | Dynamic sitemap |
| `/robots.ts` | Robots.txt |
| `/opengraph-image.tsx` | OG image generation |

#### Agency Dashboard (Authenticated)
| Route | Purpose |
|-------|---------|
| `/dashboard` | Main dashboard with metrics |
| `/pipeline` | Deals pipeline (CRM) |
| `/leads` | Lead management |
| `/schedule` | Calendar / scheduling |
| `/clients` | Client list |
| `/clients/[clientId]` | Client detail |
| `/visits` | Assessment list |
| `/visits/new` | New assessment (audio upload + recording) |
| `/visits/[visitId]` | Visit detail (transcript, notes, billables) |
| `/care-tracker` | Care tracking |
| `/adl-logging` | ADL (Activities of Daily Living) logging |
| `/policies` | Policies & renewals |
| `/team-chat` | Internal team messaging |
| `/messages` | Messages |
| `/notes` | Notes & tasks |
| `/proposals` | Proposal management |
| `/contracts/new` | Contract creation (AI-generated) |
| `/templates` | OCR template management |
| `/documents` | Document library |
| `/reports` | Analytics & reports |
| `/caregivers` | Team member management |
| `/billing` | Billing & subscription |
| `/billing/success` | Payment success |
| `/activity` | Activity monitor / audit trail |
| `/integrations` | Third-party integrations |
| `/settings` | Agency settings |
| `/help` | Help & support |
| `/welcome` | Onboarding welcome |

#### Platform Admin (Super Admin)
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard |
| `/admin/quick-setup` | Quick agency setup wizard |
| `/admin/approvals` | Business approval queue |
| `/admin/businesses` | All businesses |
| `/admin/businesses/[businessId]` | Business detail |
| `/admin/subscriptions` | Subscription management |
| `/admin/billing` | Stripe configuration |
| `/admin/compliance` | Compliance dashboard |
| `/admin/support` | Support tickets |
| `/admin/audit` | Platform audit logs |
| `/admin/users` | Platform user management |
| `/admin/system` | System health monitoring |
| `/admin/incidents` | Status page management |
| `/admin/analytics` | Platform analytics |
| `/admin/sales-leads` | Sales lead tracking |

#### API Routes (Server-Side)
| Route | Purpose |
|-------|---------|
| `/api/auth/google/callback` | Google OAuth callback |
| `/api/calendar/sync` | Calendar sync endpoint |

### Shared Components
| Component | Purpose |
|-----------|---------|
| `Sidebar` | Collapsible nav with role-based sections (Sales, Clients, Communication, Resources, Agency Admin, Platform Admin) |
| `TopBar` | Header with search, notifications, user menu |
| `ChatWidget` | AI chat assistant widget |
| `AudioPlayer` | Audio playback for recordings |
| `AudioUploader` | Audio file upload with drag-and-drop |
| `TranscriptTimeline` | Visual transcript with speaker diarization |
| `TranscriptImporter` | Import transcripts from external sources |
| `ContractPreview` | Live contract preview |
| `NotePreview` | Visit note preview |
| `BillablesEditor` | Edit billable items |
| `ClientModal` | Client create/edit modal |
| `CaregiverModal` | Caregiver create/edit modal |
| `UpgradeModal` | Subscription upgrade prompt |
| `OnboardingChecklist` | New user onboarding steps |
| `WalkthroughGuide` | Interactive feature walkthrough |
| `ReminderPoller` | Background reminder polling |
| `Charts (Bar, Donut, Area, Sparkline)` | Dashboard analytics |

### Sidebar Navigation Structure
```
Sales & Pipeline
  ├── Dashboard
  ├── Deals Pipeline
  ├── Leads
  └── My Schedule

Clients & Care
  ├── All Clients
  ├── Assessments
  ├── Care Tracker
  ├── ADL Logging
  └── Policies & Renewals

Communication
  ├── Team Chat
  └── Notes & Tasks

Resources
  ├── Proposals
  ├── Create Contract
  ├── OCR Templates
  ├── Documents
  ├── Reports
  └── Help & Support

Agency Admin
  ├── Team Members
  ├── Billing
  ├── Activity Monitor
  ├── Integrations
  └── Settings

Platform Admin (super admins only)
  ├── Dashboard
  ├── Quick Setup
  ├── Approvals
  ├── Subscriptions
  ├── Stripe Config
  ├── Compliance
  ├── Support
  ├── Audit Logs
  ├── Platform Users
  ├── System Health
  ├── Status Page
  └── Sales Leads
```

### Lib / Utilities
| File | Purpose |
|------|---------|
| `api.ts` | `ApiClient` class — typed HTTP client with retry, timeout, auth |
| `auth.ts` | Auth context, token management, role checks |
| `theme.tsx` | Dark/light theme provider |
| `types.ts` | Shared TypeScript interfaces |
| `notifications.tsx` | Toast notification system |
| `walkthrough.tsx` | Walkthrough/tour logic |
| `formatText.ts` | Text formatting utilities |

---

## 6. FastAPI Backend — Detailed Breakdown

### Structure
```
apps/api/
├── app/
│   ├── main.py              # FastAPI app, routers, middleware, CORS
│   ├── core/                # Config, security, logging
│   ├── db/                  # Database session, Alembic migrations
│   ├── models/              # SQLAlchemy models
│   ├── routers/             # API route handlers
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic (storage, docs, email)
│   └── middleware/          # Audit logging, security
├── templates/contracts/     # Contract template metadata
├── pyproject.toml           # Python dependencies
├── alembic.ini              # Migration config
├── Dockerfile               # Production container
└── railway.json             # Railway deployment config
```

### Key Models
- User, Business, Client, Visit, Contract, Template
- Caregiver, Schedule, Lead, Pipeline/Deal
- Billing, Subscription, Invoice
- AuditLog, Notification

### Key Routers
- `/auth/*` — Login, register, MFA, Google OAuth, password reset
- `/clients/*` — CRUD, search, import
- `/visits/*` — CRUD, audio upload, pipeline trigger
- `/pipeline/*` — Trigger full processing pipeline
- `/contracts/*` — Generate, preview, export
- `/templates/*` — OCR template upload and management
- `/billing/*` — Stripe subscriptions, invoices
- `/admin/*` — Platform admin endpoints
- `/live/*` — WebSocket live transcription (Deepgram streaming)

---

## 7. Celery Worker — Detailed Breakdown

### Structure
```
apps/worker/
├── worker.py                # Celery app configuration
├── config.py                # Settings
├── tasks/                   # Task definitions
│   ├── transcribe.py        # Deepgram / Whisper transcription
│   ├── diarize.py           # pyannote speaker diarization
│   ├── align.py             # Align diarization with transcript
│   ├── bill.py              # Billable block detection
│   ├── generate_note.py     # AI visit note generation
│   ├── generate_contract.py # AI contract generation
│   └── full_pipeline.py     # Orchestrates all steps
├── libs/                    # Shared libraries
│   ├── deepgram_asr.py      # Deepgram API client
│   ├── billing.py           # Billing rules engine
│   ├── transcript_analysis.py # Transcript parsing
│   ├── note_gen.py          # Note generation logic
│   ├── merge.py             # Merge utilities
│   └── llm_rules.py         # LLM prompt templates
├── services/
│   └── email.py             # Email service
├── requirements.txt         # Python dependencies
├── Dockerfile               # Production container
└── railway.json             # Railway deployment config
```

---

## 8. Mobile Apps

### Expo / React Native (`mobile/`)
- **Framework:** Expo 55, React Native 0.83, React 19
- **Routing:** expo-router (file-based)
- **Styling:** NativeWind (Tailwind for RN)
- **State:** Zustand
- **Features:** Auth, voice recording (expo-audio), live transcription (WebSocket), push notifications, secure storage
- **Structure:** `app/` (routes), `components/`, `lib/` (auth, store, streamTranscribe)

### Native iOS (`ios-app/`)
- **Framework:** Swift, SwiftUI
- **Structure:**
  - `Models/Models.swift` — Data models
  - `Services/APIService.swift` — API client
  - `Services/AudioRecorderService.swift` — Audio recording
  - `Views/Auth/` — Landing, Login, Register
  - `Views/Home/`, `Views/Clients/`, `Views/Record/`
  - `Views/MainTabView.swift` — Tab navigation
  - `Theme/PalmCareTheme.swift` — Design system

---

## 9. Deployment & Infrastructure

### Docker Compose (Local Development)
| Service | Image | Port |
|---------|-------|------|
| postgres | postgres:16 | 5432 |
| redis | redis:7 | 6379 |
| minio | minio/minio | 9000, 9001 |
| api | apps/api/Dockerfile | 8000 |
| worker | apps/worker/Dockerfile | — |
| stirling-pdf | stirling-pdf | 8080 |
| web | apps/web/Dockerfile | 3000 |

### Railway (Production)
- `apps/api/railway.json` — API service
- `apps/web/railway.json` — Web frontend
- `apps/worker/railway.json` — Background worker
- Managed Postgres + Redis on Railway

### CI/CD (GitHub Actions)
| Job | What it does |
|-----|-------------|
| pipeline-tests | pytest on `tests/pipeline/` |
| api-tests | pytest with Postgres service on `tests/api/` |
| frontend-build | `npm run build` for `apps/web` |
| lint | Ruff + Black on `apps/api/` |
| docker-build | Builds api, worker, web images (no push) |

---

## 10. HIPAA Compliance

- Risk assessment documentation
- Privacy & security policies
- Breach notification procedures
- BAA (Business Associate Agreement) templates + signed BAAs
- Audit logging middleware on all API endpoints
- Field-level encryption (cryptography library)
- Vendor compliance tracker

---

## 11. Key Environment Variables

| Category | Variables |
|----------|-----------|
| **Database** | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` |
| **Redis** | `REDIS_URL` |
| **S3/MinIO** | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` |
| **Auth** | `JWT_SECRET`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **AI/ASR** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `PYANNOTE_API_KEY`, `HF_TOKEN` |
| **Billing** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |
| **Email** | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` |
| **Frontend** | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| **Media** | `WAVESPEED_API_KEY` |

---

## 12. Videos / Marketing (`videos/`)

- **Framework:** Remotion 4 (React-based video generation)
- **Compositions:** HelloWorld, DemoVideo, DemoVideoV2/V3, SalesDemo, QuickDemo, AdVideo
- **Assets:** App screenshots in `public/screenshots/`, audio segments in `public/segments/`
- **Output:** Rendered MP4s in `out/`

---

## 13. Scripts

| Script | Purpose |
|--------|---------|
| `seed.py` | Database seeding with sample data |
| `wavespeed_voiceover.py` | Generate voiceovers via WaveSpeed API |
| `wavespeed_image.py` | Generate images via WaveSpeed API |
| `generate_test_audio.py` | Create test audio files |
| `import_sample_audio.py` | Import sample audio into system |
| `take_screenshots.py` | Automated app screenshots |
| `pull_cms_agencies.py` | Import agencies from CMS |
| `import_new_leads.py` | Import sales leads |
| `forward_resend_inbound.py` | Email forwarding setup |
| `generate_templates.py` | Generate contract templates |
| `auto_commit.sh` | Git auto-commit utility |

---

*This document is intended to be shared with AI assistants (Claude, etc.) to provide full context about the PalmCare AI project.*
