# Homecare AI - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│                           Next.js 14 (React)                                 │
│                          Deployed on Railway                                 │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ Dashboard  │ │  Clients   │ │   Visits   │ │  Pipeline  │ │  Reports  │ │
│  │   /        │ │  /clients  │ │  /visits   │ │ /pipeline  │ │ /reports  │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │  Settings  │ │  Pricing   │ │   Login    │ │   Signup   │ │ Contracts │ │
│  │ /settings  │ │  /pricing  │ │  /login    │ │  /signup   │ │/contracts │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│                                                                              │
│  Tech Stack:                                                                 │
│  • React 18 + TypeScript                                                     │
│  • Tailwind CSS                                                              │
│  • Zustand (state management)                                                │
│  • Lucide Icons                                                              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTPS / REST API
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               BACKEND                                        │
│                              FastAPI                                         │
│                          Deployed on Railway                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           API ROUTERS                                │   │
│  │                                                                      │   │
│  │  /auth      - Login, signup, JWT tokens                             │   │
│  │  /clients   - CRUD operations for clients                           │   │
│  │  /visits    - Assessment visits, restart                            │   │
│  │  /contracts - Contract generation, email                            │   │
│  │  /notes     - SOAP notes retrieval                                  │   │
│  │  /voiceprint- Voice ID creation, status                             │   │
│  │  /calendar  - Google Calendar integration                           │   │
│  │  /reports   - Analytics and statistics                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Tech Stack:                                                                 │
│  • FastAPI + Pydantic                                                        │
│  • SQLAlchemy ORM                                                            │
│  • Alembic (migrations)                                                      │
│  • JWT Authentication                                                        │
│  • Celery (task queue)                                                       │
└───────────┬─────────────────────────┬─────────────────────────┬─────────────┘
            │                         │                         │
            ▼                         ▼                         ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────────┐
│    PostgreSQL     │   │       Redis       │   │     Celery Workers        │
│    (Railway)      │   │     (Railway)     │   │      (Railway)            │
│                   │   │                   │   │                           │
│  Tables:          │   │  • Task queue     │   │  Tasks:                   │
│  • users          │   │  • Result backend │   │  • transcribe_visit       │
│  • clients        │   │  • Session cache  │   │  • diarize_visit          │
│  • visits         │   │                   │   │  • extract_billables      │
│  • transcript_    │   │                   │   │  • generate_note          │
│    segments       │   │                   │   │  • generate_contract      │
│  • billable_items │   │                   │   │                           │
│  • notes          │   │                   │   │                           │
│  • contracts      │   │                   │   │                           │
└───────────────────┘   └───────────────────┘   └─────────────┬─────────────┘
                                                              │
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
│                         ASSESSMENT PIPELINE FLOW                             │
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


## Database Schema

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐       ┌──────────────────┐
  │      users       │       │     clients      │
  ├──────────────────┤       ├──────────────────┤
  │ id (UUID) PK     │       │ id (UUID) PK     │
  │ email            │       │ full_name        │
  │ hashed_password  │       │ email            │
  │ full_name        │       │ phone            │
  │ company_name     │───┐   │ address          │
  │ is_active        │   │   │ care_needs       │
  │ voiceprint       │   │   │ status           │
  │ voiceprint_      │   │   │ user_id FK ──────┼───┐
  │   created_at     │   │   │ created_at       │   │
  └──────────────────┘   │   └──────────────────┘   │
                         │            │              │
                         │            │ 1:N          │
                         │            ▼              │
                         │   ┌──────────────────┐   │
                         │   │      visits      │   │
                         │   ├──────────────────┤   │
                         │   │ id (UUID) PK     │   │
                         │   │ client_id FK ────┼───┘
                         │   │ user_id FK ──────┼───┐
                         │   │ visit_date       │   │
                         │   │ audio_url        │   │
                         │   │ transcript       │   │
                         │   │ status           │   │
                         │   │ pipeline_status  │   │
                         │   └──────────────────┘   │
                         │            │              │
                         │            │ 1:N          │
                         │            ▼              │
                         │   ┌──────────────────┐   │
                         │   │transcript_segments│  │
                         │   ├──────────────────┤   │
                         │   │ id (UUID) PK     │   │
                         │   │ visit_id FK      │   │
                         │   │ speaker_label    │   │
                         │   │ text             │   │
                         │   │ start_ms         │   │
                         │   │ end_ms           │   │
                         │   └──────────────────┘   │
                         │                          │
                         │   ┌──────────────────┐   │
                         │   │  billable_items  │   │
                         │   ├──────────────────┤   │
                         │   │ id (UUID) PK     │   │
                         │   │ visit_id FK      │   │
                         │   │ service_code     │   │
                         │   │ description      │   │
                         │   │ quantity         │   │
                         │   │ unit_price       │   │
                         │   │ total            │   │
                         │   └──────────────────┘   │
                         │                          │
                         │   ┌──────────────────┐   │
                         │   │      notes       │   │
                         │   ├──────────────────┤   │
                         │   │ id (UUID) PK     │   │
                         │   │ visit_id FK      │   │
                         │   │ structured_data  │   │
                         │   │ narrative        │   │
                         │   │ created_at       │   │
                         │   └──────────────────┘   │
                         │                          │
                         │   ┌──────────────────┐   │
                         │   │    contracts     │   │
                         │   ├──────────────────┤   │
                         │   │ id (UUID) PK     │   │
                         │   │ visit_id FK      │   │
                         │   │ client_id FK     │   │
                         └───│ user_id FK       │───┘
                             │ content          │
                             │ pdf_url          │
                             │ status           │
                             │ created_at       │
                             └──────────────────┘


## Deployment Architecture (Railway)

┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAILWAY PROJECT                                 │
│                     https://railway.app/project/xxx                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           SERVICES                                       │
  │                                                                          │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
  │  │      web        │  │       api       │  │     worker      │         │
  │  │  (Next.js)      │  │   (FastAPI)     │  │   (Celery)      │         │
  │  │                 │  │                 │  │                 │         │
  │  │ Port: 3000      │  │ Port: 8000      │  │ Background      │         │
  │  │ Domain:         │  │ Domain:         │  │ tasks           │         │
  │  │ web-xxx.up.     │  │ api-xxx.up.     │  │                 │         │
  │  │ railway.app     │  │ railway.app     │  │                 │         │
  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
  │                                                                          │
  │  ┌─────────────────┐  ┌─────────────────┐                               │
  │  │   PostgreSQL    │  │      Redis      │                               │
  │  │                 │  │                 │                               │
  │  │ DATABASE_URL    │  │ REDIS_URL       │                               │
  │  │ Auto-managed    │  │ Auto-managed    │                               │
  │  └─────────────────┘  └─────────────────┘                               │
  │                                                                          │
  └─────────────────────────────────────────────────────────────────────────┘

  Environment Variables (Shared):
  ├── DATABASE_URL          (auto from Railway PostgreSQL)
  ├── REDIS_URL             (auto from Railway Redis)
  ├── JWT_SECRET            (generated secret)
  ├── OPENAI_API_KEY        (for Whisper)
  ├── ANTHROPIC_API_KEY     (for Claude)
  ├── PYANNOTE_API_KEY      (for diarization)
  ├── RESEND_API_KEY        (for emails)
  ├── MINIO_ENDPOINT        (S3-compatible storage)
  ├── MINIO_ACCESS_KEY
  └── MINIO_SECRET_KEY


## Security Architecture

┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  1. AUTHENTICATION
     ├── JWT tokens (access + refresh)
     ├── Password hashing (bcrypt)
     └── Token expiration (24h access, 7d refresh)

  2. AUTHORIZATION
     ├── User-scoped data (users can only see their clients)
     ├── API route protection (Depends(get_current_user))
     └── Frontend route guards (useAuth hook)

  3. DATA PROTECTION
     ├── HTTPS only (Railway provides SSL)
     ├── Environment variables for secrets
     └── No PII in logs

  4. API SECURITY
     ├── CORS configuration (allowed origins)
     ├── Rate limiting (planned)
     └── Input validation (Pydantic models)


## Cost Estimates (Per Assessment)

┌─────────────────────────────────────────────────────────────────────────────┐
│                    COST PER ASSESSMENT (~30 min audio)                       │
└─────────────────────────────────────────────────────────────────────────────┘

  Service              │ Cost
  ─────────────────────┼────────
  Whisper (30 min)     │ $0.18
  Pyannote (30 min)    │ $3.00
  Claude (analysis)    │ $0.05
  Claude (notes)       │ $0.02
  Claude (contract)    │ $0.02
  ─────────────────────┼────────
  TOTAL                │ ~$3.27

  Monthly Infrastructure (Railway):
  ├── Web service:     ~$5-10/month
  ├── API service:     ~$5-10/month
  ├── Worker service:  ~$5-10/month
  ├── PostgreSQL:      ~$5/month
  ├── Redis:           ~$5/month
  └── TOTAL:           ~$25-40/month base
