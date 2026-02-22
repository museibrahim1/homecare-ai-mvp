# PalmCare AI — Technical Architecture

**Last Updated:** February 22, 2026

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                       │
│                           Next.js 14 (React)                                │
│                          Deployed on Railway                                │
│                                                                             │
│  PUBLIC PAGES:                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │   Home   │ │ Features │ │ Pricing  │ │  About   │ │ Contact  │         │
│  │    /     │ │/features │ │/pricing  │ │ /about   │ │/contact  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                             │
│  AUTH:                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌────────────────┐ ┌───────────────┐           │
│  │  Login   │ │ Register │ │ Forgot Password│ │Reset Password │           │
│  │ /login   │ │/register │ │/forgot-password│ │/reset-password│           │
│  └──────────┘ └──────────┘ └────────────────┘ └───────────────┘           │
│                                                                             │
│  APP (Authenticated):                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │ Pipeline │ │  Leads   │ │ Schedule │ │ Clients  │        │
│  │/dashboard│ │/pipeline │ │ /leads   │ │/schedule │ │/clients  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Visits  │ │Care Track│ │ADL Log   │ │Caregivers│ │Proposals │        │
│  │ /visits  │ │/care-    │ │/adl-     │ │/care-    │ │/proposals│        │
│  │          │ │ tracker  │ │ logging  │ │ givers   │ │          │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Contracts │ │Templates │ │Documents │ │ Reports  │ │ Billing  │        │
│  │/contracts│ │/templates│ │/documents│ │/reports  │ │/billing  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │Team Chat │ │Integrate │ │ Activity │ │ Messages │                     │
│  │/team-chat│ │/integra- │ │/activity │ │/messages │                     │
│  │          │ │ tions    │ │          │ │          │                     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                     │
│                                                                             │
│  ADMIN (/admin):                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │Approvals │ │Subscript.│ │ Billing  │ │Compliance│        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Support  │ │  Audit   │ │  Users   │ │Businesses│ │ System   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐                                                              │
│  │Incidents │                                                              │
│  └──────────┘                                                              │
│                                                                             │
│  Tech: React 18, TypeScript, Tailwind CSS, Zustand, Lucide Icons           │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTPS / REST API
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND                                       │
│                          FastAPI (Python)                                    │
│                          Deployed on Railway                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API ROUTERS (31)                              │   │
│  │                                                                      │   │
│  │  CORE:                                                               │   │
│  │  /auth           - Login, signup, JWT, password reset                │   │
│  │  /business-auth  - Business registration, verification              │   │
│  │  /users          - User management, profiles                        │   │
│  │  /clients        - Client CRUD                                      │   │
│  │  /visits         - Assessment visits                                │   │
│  │  /caregivers     - Caregiver profiles & management                  │   │
│  │  /agency         - Agency settings                                  │   │
│  │                                                                      │   │
│  │  PIPELINE:                                                           │   │
│  │  /pipeline       - Orchestrate transcribe → bill → contract         │   │
│  │  /uploads        - Audio file uploads to S3                         │   │
│  │  /transcript     - Transcript endpoints                             │   │
│  │  /diarization    - Speaker diarization                              │   │
│  │  /voiceprint     - Voice ID creation & matching                     │   │
│  │  /billing        - Billable item extraction                         │   │
│  │  /notes          - SOAP notes generation                            │   │
│  │                                                                      │   │
│  │  DOCUMENTS:                                                          │   │
│  │  /contracts      - Contract generation & management                 │   │
│  │  /contract-templates - Template CRUD                                │   │
│  │  /template-parser    - OCR template parsing (Stirling-PDF)          │   │
│  │  /documents      - Document management                              │   │
│  │  /exports        - PDF/CSV data exports                             │   │
│  │                                                                      │   │
│  │  INTEGRATIONS:                                                       │   │
│  │  /calendar       - Google Calendar sync                             │   │
│  │  /drive          - Google Drive storage                             │   │
│  │  /gmail          - Gmail integration                                │   │
│  │  /integrations   - Integration settings                             │   │
│  │  /stripe-billing - Stripe subscription management                   │   │
│  │                                                                      │   │
│  │  ADMIN & PLATFORM:                                                   │   │
│  │  /admin          - Admin operations                                 │   │
│  │  /admin-platform - Platform-level admin                             │   │
│  │  /reports        - Analytics & statistics                           │   │
│  │  /demos          - Demo booking                                     │   │
│  │  /status         - Health checks                                    │   │
│  │  /calls          - Voice calls (disabled, Twilio removed)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Tech: FastAPI, Pydantic, SQLAlchemy, Alembic, JWT, Celery                 │
│  Middleware: HIPAA Audit Logging, CORS, Auth                               │
└───────────┬─────────────────────────┬─────────────────────────┬─────────────┘
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────────┐
│    PostgreSQL     │   │       Redis       │   │     Celery Workers        │
│    (Railway)      │   │     (Railway)     │   │      (Railway)            │
│                   │   │                   │   │                           │
│  19 Models:       │   │  • Task queue     │   │  Tasks:                   │
│  • users          │   │  • Result backend │   │  • transcribe_visit       │
│  • businesses     │   │  • Session cache  │   │  • diarize_visit          │
│  • agency_settings│   │                   │   │  • extract_billables      │
│  • clients        │   │                   │   │  • generate_note          │
│  • caregivers     │   │                   │   │  • generate_contract      │
│  • visits         │   │                   │   │                           │
│  • calls          │   │                   │   │  Libs:                    │
│  • audio_assets   │   │                   │   │  • LLM (Claude)           │
│  • transcript_    │   │                   │   │  • ASR (Whisper)          │
│  •   segments     │   │                   │   │  • Diarization (Pyannote) │
│  • diarization_   │   │                   │   │  • Template engine        │
│  •   turns        │   │                   │   │                           │
│  • billable_items │   │                   │   │                           │
│  • notes          │   │                   │   │                           │
│  • contracts      │   │                   │   │                           │
│  • contract_      │   │                   │   │                           │
│  •   templates    │   │                   │   │                           │
│  • subscriptions  │   │                   │   │                           │
│  • support_tickets│   │                   │   │                           │
│  • incidents      │   │                   │   │                           │
│  • audit_logs     │   │                   │   │                           │
└───────────────────┘   └───────────────────┘   └─────────────┬─────────────┘
                                                              │
                        ┌─────────────────────────────────────┼─────────────┐
                        │            EXTERNAL AI SERVICES     │             │
                        │                                     ▼             │
                        │  ┌─────────────────────────────────────────────┐ │
                        │  │              AI PIPELINE                     │ │
                        │  │                                              │ │
                        │  │  ┌───────────────┐                          │ │
                        │  │  │ 1. TRANSCRIBE │  OpenAI Whisper API      │ │
                        │  │  │    Audio      │  whisper-1 model         │ │
                        │  │  │    → Text     │  ~$0.006/minute          │ │
                        │  │  └───────┬───────┘                          │ │
                        │  │          │                                   │ │
                        │  │          ▼                                   │ │
                        │  │  ┌───────────────┐                          │ │
                        │  │  │ 2. DIARIZE    │  Pyannote.ai API         │ │
                        │  │  │    Who spoke  │  Speaker separation      │ │
                        │  │  │    when?      │  ~$0.10/minute           │ │
                        │  │  └───────┬───────┘                          │ │
                        │  │          │                                   │ │
                        │  │          ▼                                   │ │
                        │  │  ┌───────────────┐                          │ │
                        │  │  │ 3. IDENTIFY   │  Pyannote.ai Voiceprints │ │
                        │  │  │    Staff by   │  Match against stored    │ │
                        │  │  │    voice      │  voiceprints             │ │
                        │  │  └───────┬───────┘                          │ │
                        │  │          │                                   │ │
                        │  │          ▼                                   │ │
                        │  │  ┌───────────────┐                          │ │
                        │  │  │ 4. ANALYZE    │  Anthropic Claude        │ │
                        │  │  │    Extract:   │  claude-3-haiku          │ │
                        │  │  │    - Services │  ~$0.25/1M tokens        │ │
                        │  │  │    - Billables│                          │ │
                        │  │  │    - Clinical │                          │ │
                        │  │  └───────┬───────┘                          │ │
                        │  │          │                                   │ │
                        │  │          ▼                                   │ │
                        │  │  ┌───────────────┐                          │ │
                        │  │  │ 5. GENERATE   │  Claude + python-docx    │ │
                        │  │  │    - SOAP Note│  Template rendering      │ │
                        │  │  │    - Contract │                          │ │
                        │  │  └───────────────┘                          │ │
                        │  │                                              │ │
                        │  └──────────────────────────────────────────────┘ │
                        └───────────────────────────────────────────────────┘


## Data Flow: Assessment Pipeline

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ASSESSMENT PIPELINE FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

  User uploads audio file
           │
           ▼
  ┌─────────────────┐
  │   API receives  │
  │   audio file    │
  │   Stores in S3  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Celery Task:   │      │  OpenAI Whisper API                     │
  │  transcribe_    │─────►│  POST /v1/audio/transcriptions          │
  │  visit          │      │  Returns: { "text": "..." }             │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Transcript saved to DB
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Celery Task:   │      │  Pyannote.ai API                        │
  │  diarize_       │─────►│  POST /v1/diarize                       │
  │  visit          │      │  Returns: speaker segments with times   │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Segments aligned with transcript
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Voiceprint     │      │  Pyannote.ai API                        │
  │  Identification │─────►│  POST /v1/identify                      │
  │  (if available) │      │  Returns: speaker → name mapping        │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Staff identified by voice
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Celery Task:   │      │  Anthropic Claude API                   │
  │  extract_       │─────►│  POST /v1/messages                      │
  │  billables      │      │  Prompt: Extract services & billables   │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Billable items saved to DB
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Celery Task:   │      │  Anthropic Claude API                   │
  │  generate_      │─────►│  POST /v1/messages                      │
  │  note           │      │  Prompt: Generate SOAP note             │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Note saved to DB
           ▼
  ┌─────────────────┐      ┌─────────────────────────────────────────┐
  │  Celery Task:   │      │  python-docx + Claude                   │
  │  generate_      │─────►│  Fill DOCX template with data           │
  │  contract       │      │  Generate PDF, store in S3              │
  └────────┬────────┘      └─────────────────────────────────────────┘
           │
           │ Contract saved, client status → "proposal"
           ▼
  ┌─────────────────┐
  │  Pipeline       │
  │  Complete!      │
  │  User can       │
  │  review & send  │
  └─────────────────┘


## Database Schema (19 Models)

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  CORE ENTITIES:

  ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │      users       │       │   businesses     │       │ agency_settings  │
  ├──────────────────┤       ├──────────────────┤       ├──────────────────┤
  │ id (UUID) PK     │───┐   │ id (UUID) PK     │       │ id (UUID) PK     │
  │ email            │   │   │ name             │       │ business_id FK   │
  │ hashed_password  │   │   │ ein              │       │ settings (JSON)  │
  │ full_name        │   │   │ verification_    │       └──────────────────┘
  │ role             │   │   │   status         │
  │ business_id FK   │   │   │ stripe_customer  │
  │ is_active        │   │   └──────────────────┘
  │ voiceprint       │   │
  │ voiceprint_      │   │
  │   created_at     │   │
  │ mfa_secret       │   │
  └──────────────────┘   │
                         │
  ┌──────────────────┐   │   ┌──────────────────┐
  │     clients      │   │   │    caregivers    │
  ├──────────────────┤   │   ├──────────────────┤
  │ id (UUID) PK     │   │   │ id (UUID) PK     │
  │ full_name        │   │   │ full_name        │
  │ email            │   │   │ user_id FK       │
  │ phone            │   │   │ business_id FK   │
  │ address          │   │   │ certifications   │
  │ care_needs       │   │   └──────────────────┘
  │ status           │   │
  │ user_id FK ──────┼───┘
  │ created_at       │
  └──────────────────┘
           │
           │ 1:N
           ▼
  VISIT & PIPELINE ENTITIES:

  ┌──────────────────┐
  │      visits      │
  ├──────────────────┤       ┌──────────────────┐
  │ id (UUID) PK     │       │  audio_assets    │
  │ client_id FK     │       ├──────────────────┤
  │ user_id FK       │       │ id (UUID) PK     │
  │ visit_date       │       │ visit_id FK      │
  │ audio_url        │       │ s3_key           │
  │ transcript       │       │ duration_ms      │
  │ status           │       │ file_size        │
  │ pipeline_status  │       └──────────────────┘
  └──────────────────┘
           │
           │ 1:N
           ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │transcript_       │  │ diarization_     │  │  billable_items  │
  │  segments        │  │   turns          │  ├──────────────────┤
  ├──────────────────┤  ├──────────────────┤  │ id (UUID) PK     │
  │ id (UUID) PK     │  │ id (UUID) PK     │  │ visit_id FK      │
  │ visit_id FK      │  │ visit_id FK      │  │ service_code     │
  │ speaker_label    │  │ speaker_label    │  │ description      │
  │ text             │  │ start_ms         │  │ quantity         │
  │ start_ms         │  │ end_ms           │  │ unit_price       │
  │ end_ms           │  │ speaker_name     │  │ total            │
  └──────────────────┘  └──────────────────┘  └──────────────────┘

  ┌──────────────────┐  ┌──────────────────┐
  │      notes       │  │    contracts     │
  ├──────────────────┤  ├──────────────────┤
  │ id (UUID) PK     │  │ id (UUID) PK     │
  │ visit_id FK      │  │ visit_id FK      │
  │ structured_data  │  │ client_id FK     │
  │ narrative        │  │ user_id FK       │
  │ created_at       │  │ content          │
  └──────────────────┘  │ pdf_url          │
                        │ status           │
                        │ created_at       │
                        └──────────────────┘

  PLATFORM & ADMIN ENTITIES:

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ contract_        │  │  subscriptions   │  │  support_tickets │
  │   templates      │  ├──────────────────┤  ├──────────────────┤
  ├──────────────────┤  │ id (UUID) PK     │  │ id (UUID) PK     │
  │ id (UUID) PK     │  │ business_id FK   │  │ user_id FK       │
  │ name             │  │ plan             │  │ subject          │
  │ content          │  │ stripe_sub_id    │  │ status           │
  │ business_id FK   │  │ status           │  └──────────────────┘
  └──────────────────┘  └──────────────────┘

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │   audit_logs     │  │   incidents      │  │     calls        │
  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤
  │ id (UUID) PK     │  │ id (UUID) PK     │  │ id (UUID) PK     │
  │ user_id          │  │ title            │  │ visit_id FK      │
  │ action           │  │ severity         │  │ recording_url    │
  │ resource_type    │  │ status           │  │ status           │
  │ resource_id      │  │ updates (JSON)   │  │ (disabled)       │
  │ ip_address       │  └──────────────────┘  └──────────────────┘
  │ timestamp        │
  └──────────────────┘


## Deployment Architecture

### Production (Railway)

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAILWAY PROJECT                                │
│                     palmcareai.com / palmtai.com                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           SERVICES                                      │
  │                                                                         │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
  │  │      web        │  │       api       │  │     worker      │        │
  │  │  (Next.js)      │  │   (FastAPI)     │  │   (Celery)      │        │
  │  │                 │  │                 │  │                 │        │
  │  │ Port: 3000      │  │ Port: 8000      │  │ Background      │        │
  │  │ palmcareai.com  │  │ api.palmtai.com │  │ tasks           │        │
  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
  │                                                                         │
  │  ┌─────────────────┐  ┌─────────────────┐                              │
  │  │   PostgreSQL    │  │      Redis      │                              │
  │  │                 │  │                 │                              │
  │  │ SSL enforced    │  │ REDIS_URL       │                              │
  │  │ Encrypted at    │  │ Auto-managed    │                              │
  │  │ rest (Railway)  │  │                 │                              │
  │  └─────────────────┘  └─────────────────┘                              │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

### Local Development (Docker Compose — 7 services)

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
  │  │ postgres │ │  redis   │ │  minio   │ │ stirling │                  │
  │  │  :5432   │ │  :6379   │ │ :9000/01 │ │  :8080   │                  │
  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                               │
  │  │   api    │ │  worker  │ │   web    │                               │
  │  │  :8000   │ │ (bg)     │ │  :3000   │                               │
  │  └──────────┘ └──────────┘ └──────────┘                               │
  └─────────────────────────────────────────────────────────────────────────┘

### Environment Variables

  REQUIRED:
  ├── DATABASE_URL              (Railway auto / local postgres)
  ├── REDIS_URL                 (Railway auto / local redis)
  ├── JWT_SECRET                (openssl rand -hex 32)
  ├── OPENAI_API_KEY            (Whisper transcription)
  ├── ANTHROPIC_API_KEY         (Claude analysis & generation)
  ├── PYANNOTE_API_KEY          (speaker diarization)
  ├── HF_TOKEN                  (HuggingFace, diarization models)
  ├── RESEND_API_KEY            (transactional email — no PHI)
  ├── S3_ENDPOINT_URL           (MinIO local / S3 production)
  ├── S3_BUCKET                 (audio & document storage)
  ├── STRIPE_SECRET_KEY         (subscription billing)
  ├── STRIPE_PUBLISHABLE_KEY
  ├── STRIPE_WEBHOOK_SECRET
  ├── GOOGLE_CLIENT_ID          (Calendar, Drive, Gmail)
  └── GOOGLE_CLIENT_SECRET

  OPTIONAL:
  ├── STIRLING_PDF_URL          (OCR service, default localhost:8080)
  ├── ADMIN_PASSWORD            (platform admin bootstrap)
  ├── DEBUG                     (true/false)
  ├── LOG_LEVEL                 (INFO/DEBUG/WARNING)
  ├── ASR_MODEL_SIZE            (Whisper model size)
  ├── USE_OPENAI_WHISPER        (true = API, false = local)
  └── SKIP_DIARIZATION          (skip speaker ID step)


## Security Architecture

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY & HIPAA COMPLIANCE (89%)                        │
└─────────────────────────────────────────────────────────────────────────────┘

  1. AUTHENTICATION
     ├── JWT tokens with 1-hour expiration
     ├── Password hashing (bcrypt, cost factor 12)
     ├── Password complexity (8+ chars, mixed case, numbers)
     ├── Account lockout (5 failed attempts → 15-min lockout)
     ├── TOTP-based MFA available (Google Authenticator / Authy)
     └── Frontend inactivity timeout (15 minutes)

  2. AUTHORIZATION
     ├── Role-based access: admin, owner, manager, staff, caregiver
     ├── Multi-tenant data isolation (business_id scoping)
     ├── User-scoped data (users see only their clients)
     ├── API route protection (Depends(get_current_user))
     └── Frontend route guards (useRequireAuth hook)

  3. DATA PROTECTION
     ├── HTTPS/TLS everywhere (Railway enforces SSL)
     ├── Database SSL enforced (sslmode=require)
     ├── Encryption at rest (Railway volume-level)
     ├── No PHI in application logs (sanitized)
     ├── Environment variables for all secrets
     └── Emergency access procedure documented

  4. AUDIT & MONITORING
     ├── HIPAA audit logging middleware on all PHI endpoints
     ├── Audit log: user, action, resource, timestamp, IP
     ├── Login attempt tracking (success + failure)
     ├── Monthly CEO review, quarterly access review, annual analysis
     └── Audit logs retained 6 years

  5. API SECURITY
     ├── CORS configuration (allowed origins only)
     ├── Input validation (Pydantic schemas on all endpoints)
     ├── SQL injection prevention (SQLAlchemy ORM)
     ├── Forced logout capability for compromised accounts
     └── Rate limiting (planned)

  6. REMAINING TO 100%
     ├── Field-level encryption for voiceprints (~2 hrs)
     ├── Enforce MFA for admin accounts (~1-2 hrs)
     └── Password history — prevent reuse of last 5 (~1-2 hrs)


## Vendor & BAA Status

  ┌────────────────────────────────────────────────────────────────────┐
  │  Vendor          │ PHI?  │ BAA Status      │ Notes               │
  ├──────────────────┼───────┼─────────────────┼─────────────────────┤
  │  Railway         │ Yes   │ Pending         │ SOC 2 Type II       │
  │  OpenAI          │ Yes   │ Email drafted   │ baa@openai.com      │
  │  Anthropic       │ Yes   │ Email drafted   │ Contact sales       │
  │  Pyannote.ai     │ Yes   │ Pending         │ Voice recordings    │
  │  Resend          │ No    │ Not needed      │ No PHI in emails    │
  │  Stripe          │ No    │ Not needed      │ No PHI              │
  │  Stirling-PDF    │ N/A   │ Not needed      │ Self-hosted         │
  │  Google          │ Low   │ Pending         │ Calendar/Drive      │
  └────────────────────────────────────────────────────────────────────┘


## Sidebar Navigation Structure

  MAIN APP:
  ├── Dashboard
  ├── Deals Pipeline
  ├── Leads
  ├── My Schedule
  ├── ─────────────────
  ├── All Clients
  ├── Assessments
  ├── Care Tracker
  ├── ADL Logging
  ├── Policies & Renewals
  ├── ─────────────────
  ├── Team Chat
  ├── ─────────────────
  ├── Proposals
  ├── Create Contract
  ├── OCR Templates
  ├── Documents
  ├── ─────────────────
  ├── Reports
  ├── Help & Support
  ├── Team Members
  ├── Billing
  ├── ─────────────────
  ├── Activity Monitor
  ├── Integrations
  └── Settings

  ADMIN SECTION:
  ├── Dashboard
  ├── Approvals
  ├── Subscriptions
  ├── Stripe Config
  ├── Compliance
  ├── Support
  ├── Audit Logs
  ├── Platform Users
  ├── System Health
  └── Status Page


## Project Structure

```
AI Voice Contracter/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py         # App entry point
│   │   │   ├── routers/        # 31 API routers
│   │   │   ├── models/         # 19 SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic request/response schemas
│   │   │   ├── services/       # Business logic
│   │   │   ├── core/           # Config, security, auth
│   │   │   ├── db/             # Database session, migrations
│   │   │   └── middleware/     # Audit logging, CORS
│   │   └── Dockerfile
│   ├── web/                    # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/            # 62+ pages (App Router)
│   │   │   ├── components/     # React components
│   │   │   └── lib/            # Utilities, auth, API client
│   │   └── package.json
│   └── worker/                 # Celery background worker
│       ├── tasks/              # Task definitions
│       ├── libs/               # LLM, ASR, diarization libs
│       ├── services/           # Worker services
│       └── worker.py           # Celery app init
├── compliance/                 # 8 HIPAA compliance documents
├── templates/                  # Contract & note DOCX templates
│   ├── contracts/
│   └── notes/
├── videos/                     # Remotion video project
├── infra/                      # Infrastructure configs
├── scripts/                    # Utility scripts
├── docker-compose.yml          # 7 services for local dev
├── .env.example                # Environment variable template
├── ARCHITECTURE.md             # ← You are here
├── DEPLOYMENT.md               # Deployment guide
└── README.md                   # Project overview
```


## Cost Estimates

### Per Assessment (~30 min audio)

  Service              │ Cost
  ─────────────────────┼────────
  Whisper (30 min)     │ $0.18
  Pyannote (30 min)    │ $3.00
  Claude (analysis)    │ $0.05
  Claude (notes)       │ $0.02
  Claude (contract)    │ $0.02
  ─────────────────────┼────────
  TOTAL                │ ~$3.27

### Monthly Infrastructure (Railway)

  ├── Web service:     ~$5-10/month
  ├── API service:     ~$5-10/month
  ├── Worker service:  ~$5-10/month
  ├── PostgreSQL:      ~$5/month
  ├── Redis:           ~$5/month
  └── TOTAL:           ~$25-40/month base
