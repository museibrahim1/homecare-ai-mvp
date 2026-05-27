# PalmCare AI

> **AI-powered care assessment for in-home healthcare agencies.**
> Turn intake / visit conversations into proposal-ready service contracts in minutes.

Founded by **Palm Technologies, INC.** — [palmcareai.com](https://palmcareai.com)

---

## What it does

A caregiver records a visit on the iOS app (or uploads a transcript on the web). Behind the scenes the pipeline runs:

```
audio → transcribe → speaker-segment → extract billables → generate notes → draft contract
```

The final output is a state-specific, proposal-ready service contract that the agency can review, edit, and send.

---

## Tech stack (production)

| Layer | Tech |
|---|---|
| iOS app | SwiftUI native (App Store) |
| Web admin | Next.js 16 + React 19 + Tailwind 4 (Railway) |
| API | FastAPI + Pydantic v2 + SQLAlchemy 2 (Railway) |
| Worker | Celery + Redis 6 |
| Database | PostgreSQL 16 |
| Object storage | S3 (MinIO in dev, AWS S3 / SSE in prod) |
| ASR | **Deepgram Nova-3** (speaker diarization built-in, ~300 ms latency); OpenAI Whisper fallback |
| LLM | **Anthropic Claude Sonnet 4** for contract / notes generation; Claude Haiku for landing chat |
| Auth | JWT (RS256) + bcrypt (direct, no passlib) + optional Google OAuth |
| Email | Resend (`sales@send.palmtai.com`) |
| Payments | Stripe + Apple In-App Purchase |
| Calendar | Google Calendar OAuth (demo booking with auto-Meet links) |

A full diagram + per-route walkthrough lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Repo layout

```
.
├── apps/
│   ├── api/                 FastAPI backend (routers, services, schemas, models, core)
│   ├── web/                 Next.js 16 admin + marketing site
│   └── worker/              Celery worker for long-running pipeline jobs
├── ios-app/                 SwiftUI iOS app (App Store target)
├── mobile/                  Expo prototype (legacy — kept for reference)
├── android/                 Kotlin app (on hold)
├── videos/                  Remotion marketing videos
├── data/                    Seed / CRM JSON (investors, agencies, leads)
├── docs/                    Architecture, app-store plans, investor memo, etc.
├── scripts/                 Operational scripts (data import, email ops, marketing)
│   └── dev-tools/           Browser/stress-test HTML + JS helpers
├── tests/                   pytest suite (api, pipeline, fixtures, performance)
├── infra/                   Local infra configs (Postgres init, MinIO buckets)
├── templates/               Contract + note templates
├── compliance/              BAAs and HIPAA artifacts
└── .github/workflows/       GitHub Actions CI (lint, api tests, frontend build, docker)
```

---

## Quickstart (local development)

```bash
cp .env.example .env                              # fill in API keys
docker compose up --build                         # api + worker + db + redis + minio
docker compose exec api python scripts/seed.py    # seed minimal data
```

Then open:

| Service | URL |
|---|---|
| Web admin | http://localhost:3000 |
| API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| MinIO console | http://localhost:9001 |

---

## API workflow (programmatic)

1. `POST /auth/business/register` → returns `access_token` immediately (no separate login round-trip)
2. `POST /clients` with `{full_name, email, ...}`
3. `POST /visits` to create a visit shell
4. `POST /uploads/audio` with the WAV / MP3 / WebM recording
5. Run the pipeline:
   ```
   POST /pipeline/visits/{id}/transcribe
   POST /pipeline/visits/{id}/diarize
   POST /pipeline/visits/{id}/align
   POST /pipeline/visits/{id}/bill
   POST /pipeline/visits/{id}/note
   POST /pipeline/visits/{id}/contract
   ```
6. `GET /contracts/{id}` to review, then `POST /contracts/{id}/export?format=pdf` to download.

For a caregiver-driven mobile workflow, the iOS app exercises the same endpoints in the background while the user records.

---

## Production

| Environment | URL |
|---|---|
| Web (marketing + admin) | https://palmcareai.com |
| API | https://api-production-a0a2.up.railway.app |
| Status | https://palmcareai.com/status |

Hosting: Railway (api, web). Database: Railway-managed PostgreSQL. Object storage: AWS S3 with SSE.

Required production env vars (set via Railway dashboard):

- `JWT_SECRET`, `INTERNAL_API_KEY`, `CRON_SECRET`
- `DATABASE_URL`, `REDIS_URL`
- `FIELD_ENCRYPTION_KEY` (Fernet, encrypts Google OAuth tokens at rest)
- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`
- `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (+ optional `S3_KMS_KEY_ID`)

See `.env.example` for the full list with comments.

---

## Development

```bash
# API tests (Postgres + Redis required — easiest via docker compose)
pytest tests/api/

# Pipeline tests (no infra needed)
pytest tests/pipeline/

# Web typecheck + build
cd apps/web && npm run build

# iOS build
cd ios-app && xcodebuild -project PalmCareAI.xcodeproj -scheme PalmCareAI -destination 'generic/platform=iOS'
```

Dependency updates land via [Renovate](renovate.json5) — one grouped PR per ecosystem, every Monday morning Central.

---

## License

Proprietary — © Palm Technologies, INC. All rights reserved.
