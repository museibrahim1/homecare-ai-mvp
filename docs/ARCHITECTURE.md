# PalmCare AI — Complete Project Architecture

*Last updated: March 1, 2026*

---

## 1. Top-Level Structure

```
AI Voice Contracter/
├── apps/                    # Core application services
│   ├── api/                 # FastAPI backend (Python 3.11)
│   ├── worker/              # Celery background worker (Python 3.11)
│   └── web/                 # Next.js 14 admin frontend (TypeScript)
├── mobile/                  # Expo 55 / React Native mobile app (TypeScript)
├── ios-app/                 # Native Swift iOS app (PalmCareAI)
├── videos/                  # Remotion 4 video generation (TypeScript)
├── scripts/                 # Utility & seed scripts (Python/Bash)
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

## 2. Tech Stack Summary

| Component | Language | Framework | Key Libraries |
|-----------|----------|-----------|---------------|
| **API** | Python 3.11 | FastAPI ≥0.109, SQLAlchemy ≥2.0, Alembic ≥1.13 | JWT (python-jose), bcrypt 4.0.1, boto3, Resend, Stripe ≥7.0, pyotp, cryptography ≥42, websockets ≥12 |
| **Worker** | Python 3.11 | Celery[redis] | OpenAI, Anthropic, Deepgram, pyannote, pydub, python-docx |
| **Web** | TypeScript | Next.js 14.1.0, React 18.2.0 | Tailwind CSS 3.4.1, Zustand 4.5.0, lucide-react 0.312, date-fns 3.2.0, sharp |
| **Mobile (Expo)** | TypeScript | Expo 55.0.2, React Native 0.83.2, React 19.2.0 | NativeWind 4.2.2, expo-audio, expo-secure-store, expo-notifications, Zustand 5.0.11, react-native-reanimated 4.2.1 |
| **iOS (Native)** | Swift 5.9 | SwiftUI, iOS 16.0+ | AVFoundation |
| **Videos** | TypeScript | Remotion 4 | React 18 |
| **Database** | SQL | PostgreSQL 16 | pgcrypto (UUID) |
| **Cache/Broker** | — | Redis 7 | Celery broker + result backend |
| **Object Storage** | — | MinIO (S3-compatible) | Audio files, documents |
| **OCR** | — | Stirling-PDF | Contract template processing |

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

   Expo Mobile App ──┐
                     ├──▶ API (:8000 / Railway production)
   iOS Native App ───┘
```

### External API Integrations

| Service | Provider | Purpose |
|---------|----------|---------|
| ASR + Diarization | Deepgram Nova-3 | Speech-to-text with built-in speaker diarization |
| ASR (fallback) | OpenAI Whisper | Fallback transcription (no diarization) |
| LLM (primary) | Anthropic Claude Sonnet 4 | Visit notes, contracts, analysis, landing chat |
| LLM (fallback) | OpenAI GPT | Emergency LLM fallback |
| Email | Resend | Transactional email |
| Payments | Stripe | Subscription billing |
| Storage | MinIO (S3) | Audio files, documents |
| OCR | Stirling-PDF | Contract template processing |
| Voiceover | WaveSpeed + ElevenLabs v3 | Marketing audio (scripts only) |
| Image Gen | WaveSpeed + Nano Banana Pro | Marketing images (scripts only) |
| OAuth | Google | SSO, Calendar, Drive, Gmail |

---

## 4. Audio Processing Pipeline

```
1. Upload Audio  →  API stores in MinIO (S3)
2. Transcribe    →  Worker: Deepgram Nova-3 with diarize=true (transcription + speaker labels in one step)
3. Bill          →  Worker: Rules-based + LLM billable block detection
4. Note          →  Worker: AI visit notes (Claude Sonnet 4)
5. Contract      →  Worker: AI contract generation (Claude Sonnet 4 + DOCX templates)
6. Export        →  Stirling-PDF (OCR) + python-docx (DOCX templates)
```

---

## 5. Web Application — `apps/web/` (Next.js 14)

### 5.1 Tech Stack
- **Framework:** Next.js 14.1.0 (App Router, standalone output)
- **React:** 18.2.0
- **Language:** TypeScript 5.3.3
- **Styling:** Tailwind CSS 3.4.1 with custom dark theme (CSS variables), light/dark mode toggle
- **State:** Zustand 4.5.0 (auth), React Context (theme, notifications, walkthrough)
- **Icons:** lucide-react 0.312.0
- **Dates:** date-fns 3.2.0
- **Images:** sharp 0.34.5
- **CSS Optimization:** critters 0.0.23
- **API Proxy:** `/api/*` rewrites to FastAPI backend via `next.config.js`

### 5.2 Auth System
- JWT stored in localStorage (`palmcare-auth` key via Zustand persist)
- **15-minute session timeout** (HIPAA-compliant)
- Activity tracking: `mousedown`, `keydown`, `touchstart` (throttled)
- Session warning shown when < 2 minutes remain
- `useRequireAuth()` hook redirects unauthenticated users to `/login`
- Google OAuth via `/api/auth/google/callback` (server-side route)

### 5.3 State Management
| Store | Library | Storage Key |
|-------|---------|-------------|
| Auth (token, user, session) | Zustand | `palmcare-auth` |
| Theme (light/dark) | React Context | `palmcare-theme` |
| Notifications | React Context | `palmcare-notifications` |
| Walkthrough | React Context | `palmcare-walkthrough-seen` |
| Tasks | Direct localStorage | `palmcare-tasks` |

### 5.4 API Client (`src/lib/api.ts`)
- Custom `ApiClient` class with typed methods
- Base URL: `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`)
- Bearer token auth on all requests
- 30-second timeout, 1 retry on 5xx errors
- Endpoints: auth, usage, visits, transcript, diarization, billables, notes, contracts, pipeline, clients, contract templates, uploads, caregivers, analytics, churn, sales campaigns, reminders, tasks

### 5.5 Root Layout (`src/app/layout.tsx`)
- **Font:** Inter (Google Fonts)
- **Providers:** ThemeProvider → NotificationProvider → WalkthroughProvider
- **Global components:** WalkthroughGuide, ReminderPoller
- **Theme init:** Inline script reads `localStorage` before paint to prevent flash
- **SEO:** Full metadata, Open Graph, Twitter cards, JSON-LD schema
- **PWA:** Manifest, icons, favicon

### 5.6 All Pages (58 routes)

#### Public / Marketing Pages
| Route | Purpose |
|-------|---------|
| `/` | Landing page (hero, features tabs, pricing, testimonials, FAQ, contact form, chat widget) |
| `/about` | About page |
| `/features` | Features showcase |
| `/pricing` | Pricing plans |
| `/contact` | Contact form |
| `/mobile-app` | Mobile app download page |
| `/status` | System status page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/sitemap.ts` | Dynamic sitemap |
| `/robots.ts` | Robots.txt |
| `/opengraph-image.tsx` | OG image generation |

#### Authentication Pages
| Route | Purpose |
|-------|---------|
| `/login` | Email/password login |
| `/register` | Agency registration (multi-step) |
| `/register/status` | Registration approval status |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |
| `/welcome` | First-time onboarding |
| `/verification-status/[businessId]` | Business verification status |

#### Agency Dashboard (Authenticated)
| Route | Purpose |
|-------|---------|
| `/dashboard` | Main dashboard — metrics, pipeline chart, tasks widget, area/donut/bar/sparkline charts, onboarding checklist |
| `/pipeline` | Deals pipeline — drag-and-drop deal stages (Intake → Assessment → Proposal → Active → Follow-up) |
| `/leads` | Lead management |
| `/schedule` | Calendar / scheduling (Google Calendar integration) |
| `/clients` | Client list — table, pipeline, and forecast view modes |
| `/clients/[clientId]` | Client detail — demographics, emergency contacts, medical info, care plan |
| `/visits` | Assessment list |
| `/visits/new` | New assessment — step wizard: details → source (audio/transcript) → upload/record/import → complete |
| `/visits/[visitId]` | Visit detail — transcript timeline, notes, billables, contract, audio player |
| `/care-tracker` | Care tracking dashboard |
| `/adl-logging` | ADL (Activities of Daily Living) logging |
| `/policies` | Policies & renewals |
| `/team-chat` | Internal team messaging |
| `/messages` | Messages |
| `/notes` | Notes & tasks |
| `/proposals` | Proposal management |
| `/contracts/new` | Contract creation — service lines, schedule, days of week, common services (Personal Care, Companion, Homemaker, Skilled Nursing, etc.) |
| `/templates` | OCR template management — upload, preview, reconcile |
| `/documents` | Document library |
| `/reports` | Analytics & reports |
| `/caregivers` | Team member management |
| `/billing` | Billing & subscription |
| `/billing/success` | Payment success |
| `/activity` | Activity monitor / audit trail |
| `/integrations` | Third-party integrations |
| `/settings` | Agency settings |
| `/help` | Help & support |

#### Platform Admin (Super Admin Only)
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

#### Server-Side API Routes
| Route | Purpose |
|-------|---------|
| `/api/auth/google/callback` | Google OAuth callback — exchanges code for tokens, sets cookies, redirects to `/schedule` |
| `/api/calendar/sync` | Google Calendar CRUD — create, list, update, delete events |

### 5.7 Sidebar Navigation Structure
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

Platform Admin (role === 'admin' only)
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
  ├── Sales Leads
  └── Analytics
```

### 5.8 Shared Components (15)
| Component | Purpose |
|-----------|---------|
| `Sidebar` | Collapsible nav with role-based sections, theme toggle, mobile overlay |
| `TopBar` | Breadcrumbs, ⌘K search (pages/actions/keywords), notification bell, user menu |
| `ChatWidget` | Floating AI chat assistant (talks to `/chat` backend endpoint) |
| `AudioPlayer` | Audio playback for recordings |
| `AudioUploader` | Upload or record audio, triggers pipeline (transcription → diarization → alignment → billing → note → contract) |
| `TranscriptTimeline` | Visual transcript with speaker diarization and timestamps |
| `TranscriptImporter` | Import transcripts from SRT/VTT/text files |
| `ContractPreview` | Live contract preview with data |
| `NotePreview` | Visit note preview (SOAP format) |
| `BillablesEditor` | Edit billable items (approve, flag, adjust) |
| `ClientModal` | Client create/edit modal |
| `CaregiverModal` | Caregiver create/edit modal |
| `UpgradeModal` | Subscription upgrade prompt |
| `OnboardingChecklist` | New user onboarding steps |
| `WalkthroughGuide` | Interactive feature walkthrough |
| `ReminderPoller` | Background reminder polling |
| `Charts (BarChart, DonutChart, AreaChart, Sparkline)` | Dashboard analytics charts |

### 5.9 Theming
- Light and dark mode via `data-theme` attribute
- Custom CSS variables for dark palette (`dark-50` through `dark-950`)
- Primary: teal (`#0d9488`)
- Accent colors: blue, cyan, green, orange, pink, purple
- Custom gradients: `gradient-radial`, `gradient-card`, `gradient-button`
- Custom shadows: `glow`, `glow-lg`, `card`

### 5.10 Middleware
- Redirects duplicate routes: `/visits/visits/*` → `/visits/*`, `/clients/clients/*` → `/clients/*`, `/settings/settings/*` → `/settings/*`
- Auth is NOT enforced in middleware — routes use `useRequireAuth()` hook instead

---

## 6. Expo / React Native Mobile App — `mobile/`

### 6.1 Tech Stack
- **Framework:** Expo 55.0.2, React Native 0.83.2, React 19.2.0
- **Language:** TypeScript 5.9.2
- **Routing:** expo-router 55.0.2 (file-based)
- **Styling:** NativeWind 4.2.2 (Tailwind for RN), Tailwind CSS 3.4.19
- **State:** Zustand 5.0.11
- **Audio:** expo-audio 55.0.8
- **Secure Storage:** expo-secure-store 55.0.8
- **Notifications:** expo-notifications 55.0.10
- **Animations:** react-native-reanimated 4.2.1
- **Navigation:** react-native-screens, react-native-gesture-handler

### 6.2 App Config
- **Name:** PalmCare AI
- **Bundle ID:** `com.palmtechnologies.palmcare` (iOS + Android)
- **Orientation:** Portrait
- **Scheme:** `palmcare`
- **User Interface:** Dark
- **Splash:** Custom icon on `#0a1628` background
- **Permissions:** Microphone (iOS + Android)
- **Plugins:** expo-router, expo-secure-store, expo-audio, expo-splash-screen

### 6.3 Auth Flow
- Token stored in `expo-secure-store` (`palmcare_token`, `palmcare_user`)
- Login: `POST /auth/login` → store token → `fetchUser()`
- MFA: If `requires_mfa`, navigate to MFA screen → `POST /auth/mfa/login` with `mfa_token` + code
- Logout: `POST /auth/logout`, clear secure storage, reset Zustand state
- Root layout checks token on load; invalid token → clear and redirect to login

### 6.4 State Management (`lib/store.ts`)
- **Library:** Zustand
- **State:** `user`, `clients`, `visits`, `contracts`, `isLoading`
- **Actions:** `login`, `completeMfa`, `logout`, `fetchUser`, `fetchClients`, `createClient`, `fetchVisits`, `fetchContracts`
- 401 responses automatically clear token

### 6.5 All Screens / Routes

#### Auth Stack (`(auth)/`)
| Route | Purpose |
|-------|---------|
| `login` | Email/password login |
| `register` | Business registration |
| `mfa` | MFA verification |

#### Tab Navigation (`(tabs)/`)
| Tab | Route | Purpose |
|-----|-------|---------|
| Home | `index` | Dashboard |
| Clients | `clients` | Client list |
| Record | `record` | Record assessment (center tab with gradient) |
| Calendar | `calendar` | Calendar view |
| More | `more` | Settings menu |

#### Detail Screens
| Route | Purpose |
|-------|---------|
| `client/[id]` | Client detail |
| `client/[id]/care-plan` | Care plan |
| `client/[id]/contracts` | Client contracts |
| `contract/[id]` | Contract detail |
| `pipeline/[visitId]` | Pipeline processing status |
| `chat` | Team chat |
| `settings` | Settings |

### 6.6 Recording Flow
1. User selects client from picker on Record tab
2. `AudioRecorder` component uses `expo-audio` with `RecordingPresets.HIGH_QUALITY`
3. On stop: `POST /visits` creates visit (status: in_progress)
4. `streamTranscribe()` streams audio via WebSocket for live transcript
5. `FormData` upload: `POST /uploads/audio` with `visit_id` + `auto_process: true`
6. On success, option to open pipeline status screen

### 6.7 Live Transcription (`lib/streamTranscribe.ts`)
- WebSocket connection to `wss://{API_BASE}/live/stream?token=...&encoding=m4a`
- Reads audio file with `expo-file-system`, sends base64-decoded 32KB chunks
- Receives events: `transcript`, `connected`, `error`
- Accumulates transcript and calls `onTranscript` callback

### 6.8 Components
| Component | Purpose |
|-----------|---------|
| `AudioRecorder` | Recording UI with waveform visualization, timer, start/stop |
| `ClientCard` | Client list item card |
| `ContractCard` | Contract list item card |
| `PipelineTracker` | Pipeline stage progress indicator |
| `CalendarDay` | Calendar day cell |
| `ChatBubble` | Chat message bubble |
| `EmptyState` | Empty state placeholder |
| `LoadingScreen` | Loading spinner |

### 6.9 API Client (`lib/api.ts`)
- Base URL: `https://api-production-a0a2.up.railway.app`
- Bearer token from `expo-secure-store`
- Methods: `get`, `post`, `put`, `delete`, `upload` (FormData)
- 401 responses clear token and throw `ApiError`
- Endpoints: `/auth/*`, `/clients`, `/visits`, `/uploads/audio`, `/pipeline/visits/{id}/*`

---

## 7. Native iOS App — `ios-app/`

### 7.1 Tech Stack
- **Language:** Swift 5.9
- **Framework:** SwiftUI
- **Target:** iOS 16.0+
- **Bundle ID:** `com.palmtechnologies.palmcare`
- **Audio:** AVFoundation (AVAudioRecorder)

### 7.2 File Structure
```
ios-app/
├── PalmCareAI/
│   ├── PalmCareAIApp.swift          # Entry point
│   ├── Info.plist                    # App config
│   ├── Models/Models.swift           # Data models
│   ├── Services/
│   │   ├── APIService.swift          # HTTP API client
│   │   └── AudioRecorderService.swift # Audio recording
│   ├── Theme/PalmCareTheme.swift     # Design system
│   ├── Views/
│   │   ├── MainTabView.swift         # Tab navigation
│   │   ├── Auth/
│   │   │   ├── LandingView.swift     # Onboarding
│   │   │   ├── LoginView.swift       # Login
│   │   │   └── RegisterView.swift    # Registration
│   │   ├── Home/HomeView.swift       # Dashboard
│   │   ├── Clients/ClientsView.swift # Client list
│   │   └── Record/RecordView.swift   # Recording
│   └── Assets.xcassets/
├── project.yml                       # XcodeGen config
└── PalmCareAI.xcodeproj/
```

### 7.3 App Flow
1. `@AppStorage("hasSeenOnboarding")` → LandingView (first launch) or LoginView
2. Login → `api.isAuthenticated` (token in UserDefaults `auth_token`) → MainTabView
3. MainTabView has 5 tabs: Home, Clients, Record (center), Calendar (placeholder), More

### 7.4 Data Models
- **User:** id, email, full_name, role, company_name, phone, is_active
- **Client:** id, full_name, preferred_name, date_of_birth, phone, email, address, city, state, primary_diagnosis, care_level, status, created_at
- **Visit:** id, client_id, status, created_at, client
- **LoginResponse:** access_token, requires_mfa, mfa_token
- **UsageStats:** completed_assessments, total_assessments, plan_name

### 7.5 API Service
- Base URL: `https://api-production-a0a2.up.railway.app`
- Auth: Bearer token in `UserDefaults` (`auth_token`)
- Methods: `login()`, `fetchUser()`, `register()`, `fetchClients()`, `fetchVisits()`, `uploadAudio()`, `logout()`
- Upload: `POST /visits/upload` multipart with `client_id` and `audio` file

### 7.6 Audio Recording
- AVFoundation `AVAudioRecorder`
- Format: M4A AAC, 44.1 kHz, mono, high quality
- Session: `.playAndRecord`, `.defaultToSpeaker`
- State: `isRecording`, `duration`, `recordingURL`

### 7.7 Recording Flow
1. Select client from searchable picker sheet
2. Tap record → `AudioRecorderService.startRecording()` → waveform visualization
3. Tap stop → "Upload Recording" button → `api.uploadAudio(clientId:audioData:filename:)`
4. Uses `/visits/upload` endpoint (different from Expo's `/uploads/audio`)

### 7.8 Theme
- Primary: `#0d9488` (teal)
- Accent: `#0891b2` (cyan)
- Gradients: palmPrimary, palmPrimaryVertical
- Neutrals: palmText, palmSecondary, palmBackground, palmFieldBg, palmBorder

### 7.9 iOS vs Expo Feature Comparison

| Feature | Expo Mobile | Native iOS |
|---------|-------------|------------|
| Auth storage | expo-secure-store | UserDefaults |
| MFA support | Yes | No |
| Recording | expo-audio | AVFoundation |
| Upload endpoint | `/uploads/audio` | `/visits/upload` |
| Live transcription | WebSocket streaming | No |
| Pipeline tracking | Full pipeline screen | No |
| Contracts | Client contracts, care plan | No |
| Calendar | Tab with events | Placeholder |
| Team chat | Yes | No |
| Register endpoint | `/business/register` | `/auth/business/register` |

---

## 8. FastAPI Backend — `apps/api/`

### 8.1 Dependencies
FastAPI ≥0.109, SQLAlchemy ≥2.0, Alembic ≥1.13, psycopg ≥3.1, python-jose (JWT), bcrypt 4.0.1, boto3 ≥1.34, celery[redis] ≥5.3, python-docx ≥1.1, httpx ≥0.26, anthropic ≥0.18, openai ≥1.12, reportlab ≥4.0, resend ≥2.0, stripe ≥7.0, cryptography ≥42, pyotp ≥2.9, websockets ≥12

### 8.2 Structure
```
apps/api/
├── app/
│   ├── main.py              # FastAPI app, all routers, middleware, CORS, health checks
│   ├── core/
│   │   ├── config.py        # Settings (DB, Redis, S3, JWT, HIPAA password rules)
│   │   ├── security.py      # JWT, bcrypt, account lockout, password history
│   │   ├── deps.py          # get_db, get_current_user, get_current_admin_user
│   │   └── encryption.py    # Fernet field-level encryption (EIN, voiceprint)
│   ├── db/                  # Database session, Alembic migrations
│   ├── models/              # SQLAlchemy models (21 model files)
│   ├── routers/             # API route handlers (35+ routers)
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business logic
│   └── middleware/          # Audit logging, security headers
├── templates/contracts/     # Contract template metadata
├── pyproject.toml           # Python dependencies
├── alembic.ini              # Migration config
├── Dockerfile               # python:3.11-slim, ffmpeg, port 8000
└── railway.json             # Railway deployment config
```

### 8.3 All Routers (35+)

| Router | Prefix | Purpose |
|--------|--------|---------|
| auth | `/auth` | Login, logout, forgot/reset password |
| mfa | `/auth/mfa` | MFA setup, verify, enable, disable |
| business_auth | `/auth/business` | Business registration, SOS verification, team management |
| users | `/users` | User CRUD |
| clients | `/clients` | Client CRUD, activate policy |
| visits | `/visits` | Visit CRUD, usage stats, restart |
| uploads | `/uploads` | Audio upload, download |
| live_transcribe | `/live` | POST live transcription |
| live_stream | `/live` | WebSocket live streaming |
| pipeline | `/pipeline` | Trigger pipeline steps (transcribe, diarize, align, bill, note, contract), status |
| transcript | `/visits` | Transcript CRUD, import (SRT/VTT/text/auto) |
| diarization | `/visits` | Diarization data |
| billing | `/visits` | Billable items |
| notes | `/visits` | Visit notes |
| contracts | `/visits` | Visit contracts |
| exports | `/exports` | CSV timesheet, PDF/DOCX note and contract, email contract/note |
| reports | `/reports` | Analytics reports |
| integrations | `/integrations` | Third-party integrations |
| agency | `/agency` | Agency settings |
| template_parser | `/template` | Template parsing |
| caregivers | `/caregivers` | Caregiver CRUD |
| admin | `/admin` | Business management, approve/suspend, documents, stats, quick-setup |
| admin_platform | `/platform` | Platform analytics, subscriptions, compliance, audit logs, users, support, system health, announcements |
| stripe_billing | `/billing` | Plans, subscription, checkout, portal, webhook |
| calendar | `/calendar` | Google Calendar connect/disconnect, events |
| drive | `/drive` | Google Drive integration |
| gmail | `/gmail` | Gmail integration |
| documents | `/documents` | Document management |
| demos | `/demos` | Demo booking |
| status | `/status` | Status page / incidents |
| contract_templates | `/contract-templates` | Upload, list, registry, preview, gallery, reconcile |
| sales_leads | `/platform/sales` | Leads, campaigns, email templates, CMS import, webhooks |
| smart_notes | `/notes` | Smart notes & tasks |
| analytics | `/analytics` | Analytics & churn prediction |
| landing_chat | `/chat` | Landing page AI chat |

### 8.4 Database Models (21)
| Model | Key Fields |
|-------|-----------|
| User | email, full_name, role (UserRole enum), MFA, voiceprint, password history |
| Business | name, verification status, documents |
| BusinessUser | business ↔ user relationship |
| Client | PHI, care info, data isolation via `created_by` |
| Visit | client_id, caregiver_id, pipeline_state, audio_assets, scheduled/actual times |
| AudioAsset | visit_id, S3 key, metadata |
| TranscriptSegment | visit_id, start_ms, end_ms, text, speaker_label, confidence |
| DiarizationTurn | visit_id, speaker, start_ms, end_ms, confidence |
| BillableItem | visit_id, code, category, minutes, evidence, is_approved, is_flagged |
| Note | visit_id, structured_data (SOAP), narrative, is_approved, version |
| Contract | client_id, services, schedule, rates, status, signatures |
| ContractTemplate | uploaded templates for OCR |
| Caregiver | team member info |
| AgencySettings | agency configuration |
| Subscription | Stripe subscription data |
| SmartNote | AI-generated notes |
| Task | task items |
| Reminder | scheduled reminders |
| AuditLog | PHI access logging |
| Incident | status page incidents |
| SupportTicket | support requests |
| SalesLead | sales pipeline leads |

### 8.5 Middleware Stack (order)
1. `AuditLoggingMiddleware` — PHI access logging for `/clients`, `/visits`, `/notes`, `/contracts`
2. `SecurityHeadersMiddleware` — X-Content-Type-Options, X-Frame-Options, etc.
3. `CatchAllMiddleware` — Global exception handling
4. `CORSMiddleware` — localhost:3000/3001, Railway URLs, palmtai.com, palmcareai.com

### 8.6 Services
| Service | Purpose |
|---------|---------|
| `jobs.py` | Celery task enqueueing (`enqueue_task`, `get_task_status`) |
| `storage.py` | S3/MinIO upload/download |
| `audit.py` | `log_action` for audit logs |
| `email.py` | Resend email sending |
| `document_generation.py` | PDF/DOCX generation |
| `contract_generation.py` | AI contract generation |
| `note_generation.py` | AI note generation |
| `billing_rules.py` | Billing rules engine |
| `document_storage.py` | Document storage |
| `ocr_template_scanner.py` | OCR for contract templates |

### 8.7 Health Endpoints
`GET /`, `GET /health`, `GET /health/redis`, `GET /health/celery`, `GET /health/s3`, `GET /health/openai`, `GET /health/google`

---

## 9. Celery Worker — `apps/worker/`

### 9.1 Structure
```
apps/worker/
├── worker.py                # Celery app (palmcare_worker), Redis broker
├── config.py                # Settings (DB, Redis, S3, ASR, LLM)
├── tasks/
│   ├── transcribe.py        # Deepgram / Whisper transcription
│   ├── diarize.py           # pyannote speaker diarization
│   ├── align.py             # Merge transcript + diarization
│   ├── bill.py              # Billable block detection (rules + LLM)
│   ├── generate_note.py     # AI visit note generation (Claude)
│   ├── generate_contract.py # AI contract generation (Claude + template)
│   └── full_pipeline.py     # Orchestrates all steps (parallel where possible)
├── libs/
│   ├── deepgram_asr.py      # Deepgram Nova-3 REST API client
│   ├── whisper_asr.py       # Local faster-whisper or OpenAI Whisper API
│   ├── pyannote_diar.py     # pyannote.ai API or local diarization
│   ├── merge.py             # align_transcript_with_diarization
│   ├── billing.py           # generate_billables_from_transcript (rules + LLM)
│   ├── llm.py               # Claude/GPT for notes, contracts, assessment
│   ├── llm_rules.py         # Rates, categories, contract rules, prompts
│   ├── contract_gen.py      # Contract generation logic
│   ├── contract_template.py # Template filling
│   ├── note_gen.py          # Note generation logic
│   ├── transcript_analysis.py # Speaker names, services extraction
│   └── vad.py               # Voice activity detection
├── services/email.py        # Email service
├── requirements.txt         # Dependencies
├── Dockerfile               # python:3.11-slim, ffmpeg, libsndfile1
└── railway.json             # Railway deployment config
```

### 9.2 Worker Config
- Broker/backend: Redis
- Serialization: JSON
- Timezone: UTC
- Task time limit: 1 hour
- `acks_late: True`, `reject_on_worker_lost: True`
- Concurrency: 2 workers
- LLM: `claude-sonnet-4-20250514`, temperature 0.7
- ASR: Deepgram primary, Whisper fallback
- Diarization: skipped by default (`skip_diarization=True`)
- Pipeline: parallel mode enabled

### 9.3 Pipeline Execution
```
Phase 1 (parallel):  Transcribe + Diarize
Phase 2 (sequential): Align
Phase 3 (sequential): Bill → Note → Contract
```

---

## 10. Deployment & Infrastructure

### 10.1 Docker Compose (Local Development)
| Service | Image | Ports | Volumes |
|---------|-------|-------|---------|
| postgres | postgres:16 | 5432 | pgdata |
| redis | redis:7 | 6379 | — |
| minio | minio/minio | 9000, 9001 | miniodata |
| api | ./apps/api | 8000 | — |
| worker | ./apps/worker | — | model_cache |
| stirling-pdf | stirlingtools/stirling-pdf | 8080 | stirling_data |
| web | ./apps/web | 3000 | — |

All services have health checks configured.

### 10.2 Railway (Production)
- `apps/api/railway.json` — API service (Dockerfile deploy)
- `apps/web/railway.json` — Web frontend (Dockerfile deploy from repo root)
- `apps/worker/railway.json` — Background worker (Dockerfile deploy)
- Managed Postgres + Redis on Railway
- Production API: `https://api-production-a0a2.up.railway.app`

### 10.3 CI/CD (GitHub Actions — `.github/workflows/ci.yml`)
| Job | What it does |
|-----|-------------|
| pipeline-tests | pytest on `tests/pipeline/` (no Docker needed) |
| api-tests | pytest with PostgreSQL service on `tests/api/` |
| frontend-build | `npm run build` for `apps/web` (Node 20) |
| lint | Ruff + Black on `apps/api/app` |
| docker-build | Builds api, worker, web Docker images (no push) |

### 10.4 Infrastructure Files
- `infra/postgres/init.sql` — Enable uuid-ossp extension, grant privileges
- `infra/minio/policy.json` — S3 bucket policy for `palmcare-audio`

---

## 11. HIPAA Compliance

- Risk assessment documentation
- Privacy & security policies
- Breach notification procedures
- BAA templates + signed BAAs (`compliance/baas/`)
- Audit logging middleware on all PHI-accessing endpoints
- Field-level encryption via Fernet (EIN, voiceprint)
- 15-minute session timeout (web app)
- Password history enforcement
- Account lockout after failed attempts
- Vendor compliance tracker
- Technical audit documentation
- Staff training plan

---

## 12. Environment Variables

| Category | Variables |
|----------|-----------|
| **Database** | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` |
| **Redis** | `REDIS_URL` |
| **S3/MinIO** | `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` |
| **Auth** | `JWT_SECRET`, `JWT_ISSUER`, `JWT_ALGORITHM`, `JWT_EXPIRATION_HOURS`, `ADMIN_PASSWORD` |
| **Google OAuth** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **AI/ASR** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `PYANNOTE_API_KEY`, `HF_TOKEN`, `ASR_MODEL_SIZE`, `LLM_MODEL`, `LLM_TEMPERATURE` |
| **Billing** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` |
| **Email** | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` |
| **Frontend** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| **Media** | `WAVESPEED_API_KEY` |

---

## 13. Videos / Marketing — `videos/`

- **Framework:** Remotion 4 (React-based programmatic video generation)
- **Compositions:** HelloWorld, DemoVideo, DemoVideoV2/V3, SalesDemo, QuickDemo, AdVideo
- **Assets:** App screenshots in `public/screenshots/`, audio segments in `public/segments/`
- **Output:** Rendered MP4s in `out/`

---

## 14. Scripts

| Script | Purpose |
|--------|---------|
| `seed.py` | Database seeding with sample data |
| `wavespeed_voiceover.py` | Generate voiceovers via WaveSpeed + ElevenLabs |
| `wavespeed_image.py` | Generate images via WaveSpeed + Nano Banana Pro |
| `generate_test_audio.py` | Create test audio files |
| `import_sample_audio.py` | Import sample audio into system |
| `take_screenshots.py` | Automated app screenshots |
| `pull_cms_agencies.py` | Import agencies from CMS |
| `import_new_leads.py` | Import sales leads |
| `forward_resend_inbound.py` | Email forwarding setup |
| `generate_templates.py` | Generate contract templates |
| `generate_gallery_templates.py` | Generate gallery templates |
| `auto_commit.sh` | Git auto-commit utility |

---

## 15. Templates

### Contract Templates (`templates/contracts/`)
- DOCX contract templates with placeholder variables
- Meta JSON files mapping template fields to database columns
- README with template variable documentation

### Note Templates (`templates/notes/`)
- Visit note templates (SOAP format)
- README with template variable documentation

---

*This document is intended to be shared with AI assistants (Claude, ChatGPT, etc.) to provide full context about the PalmCare AI project.*
