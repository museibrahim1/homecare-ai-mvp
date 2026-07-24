# PalmCare AI — Data Flows, State Machines & Diagrams

ASCII reference for how data moves through PalmCare AI: inputs and outputs, user
flows, processing pipelines, state machines, dependency graphs, decision trees,
and the full error-message catalog.

Sourced from the live code (`apps/api`, `apps/worker`, `apps/web`, `ios-app`) as
of July 2026. Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md).

Contents:

1. [System data flow (inputs and outputs)](#1-system-data-flow-inputs-and-outputs)
2. [Component dependency graph](#2-component-dependency-graph)
3. [The processing pipeline (audio to contract)](#3-the-processing-pipeline-audio-to-contract)
4. [State machines](#4-state-machines)
5. [User flows](#5-user-flows)
6. [Decision trees](#6-decision-trees)
7. [Error message catalog](#7-error-message-catalog)

---

## 1. System data flow (inputs and outputs)

The high-level flow: three clients feed one API, which stores structured data in
Postgres and audio/documents in S3, and hands long jobs to a Celery worker that
calls the AI providers.

```
        INPUTS                          SYSTEM                              OUTPUTS
 ┌───────────────────┐                                             ┌────────────────────┐
 │ iOS app (SwiftUI) │──audio (m4a)──┐                             │ State-specific     │
 │  record a visit   │               │                             │ service contract   │
 └───────────────────┘               │                             │ (DOCX / PDF)       │
                                      │                             └────────────────────┘
 ┌───────────────────┐               ▼          ┌────────────┐     ┌────────────────────┐
 │ Web admin (Next)  │──transcript──▶┌────────────┐          │────▶│ SOAP visit note    │
 │  upload / import  │──form data───▶│  FastAPI   │  Postgres│     │ (DOCX / PDF)       │
 └───────────────────┘   ▲           │   :8000    │◀────────▶│ 16 │ └────────────────────┘
                         │           └─────┬──────┘          └────┘  ┌────────────────────┐
 ┌───────────────────┐    │                 │ enqueue                 │ Billable items /   │
 │ Expo mobile (RN)  │────┘                 ▼ (Redis)                 │ CSV timesheet      │
 │  record + live WS │            ┌──────────────────┐               └────────────────────┘
 └───────────────────┘            │ Celery worker    │               ┌────────────────────┐
                                  │  (pipeline jobs) │──────────────▶│ Transcript w/      │
 ┌───────────────────┐   audio    │                  │               │ speaker labels     │
 │ S3 / MinIO        │◀──files────│                  │               └────────────────────┘
 │ palmcare-audio    │───────────▶│                  │               ┌────────────────────┐
 └───────────────────┘            └───────┬──────────┘               │ Email (Resend):    │
                                          │                          │ contract / note    │
                                          ▼ external calls           │ verification links │
                    ┌─────────────────────────────────────────┐     └────────────────────┘
                    │ Deepgram Nova-3   (ASR + diarize inline) │
                    │ OpenAI Whisper    (ASR fallback)         │
                    │ Anthropic Claude  (notes, contract, chat)│
                    │ OpenAI GPT        (LLM fallback)         │
                    │ Stripe / Apple    (billing)              │
                    │ Google OAuth      (SSO, Calendar, Drive) │
                    │ HaveIBeenPwned    (leaked-password check)│
                    └─────────────────────────────────────────┘
```

### Inputs by source

| Source | Input | Endpoint | Stored as |
|--------|-------|----------|-----------|
| iOS app | Audio (M4A AAC, 44.1 kHz mono) | `POST /visits/upload` | `AudioAsset` + S3 object |
| Expo mobile | Audio + live WS stream | `POST /uploads/audio`, `wss://…/live/stream` | `AudioAsset`, `TranscriptSegment` |
| Web admin | Audio file, or transcript (SRT/VTT/text) | `POST /uploads/audio`, `POST /visits/{id}/import-transcript` | `AudioAsset` / `TranscriptSegment` |
| Web admin | Client PHI, visit metadata, contract lines | `POST /clients`, `POST /visits`, `POST /contracts` | `Client`, `Visit`, `Contract` |
| Web admin | Contract template (DOCX/PDF) | `POST /contract-templates` | `ContractTemplate` + S3 |
| Any client | Credentials, MFA codes | `/auth/*` | JWT (RS/HS256), refresh hash |

### Outputs by consumer

| Consumer | Output | Produced by |
|----------|--------|-------------|
| Agency reviewer | Transcript with speaker labels | Deepgram → `TranscriptSegment` |
| Agency reviewer | Billable items (code, minutes, evidence, flags) | rules engine → `BillableItem` |
| Agency reviewer | SOAP visit note | Claude → `Note` |
| Agency / client | State-specific service contract | Claude + templates → `Contract` |
| Downstream | CSV timesheet, DOCX/PDF exports | `/exports/*` |
| Client / agency | Transactional email | Resend |

---

## 2. Component dependency graph

Arrow means "depends on / calls". Nothing calls back up the tree; the worker is
the only component that talks to the AI providers.

```
                         ┌──────────────────────────────┐
                         │        CLIENTS               │
                         │  iOS · Expo · Web admin      │
                         └───────────────┬──────────────┘
                                         │ HTTPS / WSS (Bearer JWT or palm_session cookie)
                                         ▼
              ┌────────────────────────────────────────────────────┐
              │                  FastAPI  (apps/api)                │
              │  routers → services → models                        │
              │  middleware: Audit → SecurityHeaders → CatchAll →   │
              │              CORS                                   │
              └───┬───────────┬───────────┬───────────┬────────────┘
                  │           │           │           │
        ┌─────────▼──┐  ┌─────▼─────┐ ┌───▼─────┐ ┌───▼──────────┐
        │ Postgres 16│  │ Redis 7   │ │ S3/MinIO│ │ External SaaS│
        │ (SQLAlchemy)│ │ broker +  │ │ audio + │ │ Stripe·Apple │
        │            │  │ ratelimit │ │ docs    │ │ Google·Resend│
        └─────▲──────┘  └─────┬─────┘ └───▲─────┘ │ HaveIBeenPwned│
              │               │           │       └──────────────┘
              │        enqueue│ (jobs.py) │
              │               ▼           │
              │     ┌──────────────────────────────┐
              └─────│      Celery worker           │
             writes │      (apps/worker)           │
                    │  tasks/  ·  libs/            │
                    └───────────────┬──────────────┘
                                    │ calls
                    ┌───────────────▼──────────────────────────┐
                    │  AI providers                             │
                    │  Deepgram Nova-3 · OpenAI Whisper/GPT ·   │
                    │  Anthropic Claude Sonnet 4.6 / Haiku      │
                    └───────────────────────────────────────────┘
```

### Task-name mapping (`apps/api/app/services/jobs.py`)

Friendly name enqueued by the API → Celery task path executed by the worker:

```
"transcribe"       → tasks.transcribe.transcribe_visit
"diarize"          → tasks.diarize.diarize_visit
"bill"             → tasks.bill.generate_billables
"generate_note"    → tasks.generate_note.generate_visit_note
"generate_contract"→ tasks.generate_contract.generate_service_contract
"full_pipeline"    → tasks.full_pipeline.run_full_pipeline
                     (unknown name → ValueError("Unknown task: {name}"))
```

---

## 3. The processing pipeline (audio to contract)

### 3.1 Trigger paths

Two ways the pipeline starts:

```
A) AUTOMATIC (audio upload with auto_process=true)
   POST /uploads/audio ──▶ visit.status = "in_progress"
                       └─▶ enqueue "full_pipeline"
                           pipeline_state = { full_pipeline: queued,
                                              transcription: pending,
                                              diarization: pending,
                                              alignment: pending,   ← seeded but never processed
                                              billing: pending,
                                              note: pending,
                                              contract: pending }

B) MANUAL / per-stage (apps/api/app/routers/pipeline.py)
   POST /visits/{id}/transcribe   → enqueue "transcribe"
   POST /visits/{id}/diarize      → enqueue "diarize"   (opt-in speaker-name ID)
   POST /visits/{id}/bill         → enqueue "bill"
   POST /visits/{id}/note         → enqueue "generate_note"
   POST /visits/{id}/contract     → enqueue "generate_contract"
   POST /visits/{id}/process-transcript  → for imported transcripts, marks
                                           transcription completed then enqueues
                                           bill/note/contract per query flags
   GET  /visits/{id}/status       → { visit_id, status, pipeline_state }  (poll)
```

### 3.2 `run_full_pipeline` execution (sequential)

The orchestrator runs stages strictly in order (not parallel). Each stage is
wrapped so a failure is recorded but the run continues to the completion check.

```
run_full_pipeline(visit_id)                       apps/worker/tasks/full_pipeline.py
 │
 ├─ 0. CLEAR + RESET
 │     delete old TranscriptSegment + BillableItem rows for visit
 │     pipeline_state = { full_pipeline: processing, transcription: pending,
 │                        billing: pending, note: pending, contract: pending }
 │
 ├─ 1. TRANSCRIPTION ───────────────────────────────────────────────┐
 │     in:  latest AudioAsset (S3 → temp file)                       │
 │     do:  Deepgram Nova-3 (diarize=true)  ── else ──▶ Whisper      │
 │     out: TranscriptSegment[] (start_ms,end_ms,text,confidence,    │
 │          speaker_label); AudioAsset.duration_ms, avg_confidence,  │
 │          status="processed"                                       │
 │     state: transcription → completed (+ segment_count)            │
 │                                                                   ▼
 ├─ 2. BILLING ─────────────────────────────────────────────────────┐
 │     in:  TranscriptSegment[] ordered by start_ms                  │
 │     do:  rules engine (libs.billing) — NO external API            │
 │     out: BillableItem[] (code,category,minutes,evidence,          │
 │          is_flagged, flag_reason); visit.status="pending_review"  │
 │     state: billing → completed (+ item_count,total_minutes)       │
 │                                                                   ▼
 ├─ 3. NOTE ─────────────────────────────────────────────────────────┐
 │     in:  TranscriptSegment[] + BillableItem[] + client/caregiver  │
 │     do:  Claude (libs.llm.generate_visit_note)                    │
 │     out: Note (SOAP structured_data + narrative)                  │
 │     state: note → completed                                       │
 │                                                                   ▼
 ├─ 4. CONTRACT ─────────────────────────────────────────────────────┐
 │     in:  Client + TranscriptSegment[] + AgencySettings (state,    │
 │          rates) + insurance flags                                 │
 │     do:  Claude (analyze_transcript_for_contract) + template fill │
 │          + 50-state rules (libs.llm_rules)                        │
 │     out: new Contract; prior draft contracts → "superseded";      │
 │          Client mutated (diagnoses, meds, care_level,             │
 │          status="proposal")                                       │
 │     state: contract → completed (+ care_need_level,services_count)│
 │                                                                   ▼
 └─ 5. COMPLETION CHECK
       full_pipeline → completed
       if any of [transcription,billing,note,contract] == failed:
             visit.status = "pipeline_failed"   → return "completed_with_failures"
       else: visit.status = "pending_review"    → return "completed"
```

Notes worth remembering:

- **No `align` stage exists.** `alignment` is a dead placeholder key seeded on
  upload; nothing processes it. Deepgram diarizes inline during transcription.
- **`diarize` is opt-in, not in the automatic pipeline.** It uses Claude Haiku to
  rename `SPEAKER_00`-style labels to real names; no acoustic diarization.
- Retries: `run_full_pipeline` auto-retries on `ConnectionError/TimeoutError/OSError`
  (max 2). The worker base task retries any exception once (2 attempts total,
  exponential backoff 15s → cap 300s).

### 3.3 Live transcription (Expo mobile only)

```
Expo record ──base64 32KB chunks──▶ wss://{API}/live/stream?token=…&encoding=m4a
                                       │
                                       ▼
                              Deepgram streaming
                                       │
   events ◀── { transcript } ── { connected } ── { error } ──┘
   (accumulated client-side into a live transcript)
```

---

## 4. State machines

### 4.1 `Visit.status` (free-form string, `default="scheduled"`)

```
                    audio upload
                  (uploads.py sets
   ┌───────────┐   "in_progress")   ┌──────────────┐   run_full_pipeline
   │ scheduled │───────────────────▶│ in_progress  │──────────────┐
   └───────────┘                    └──────────────┘              │
        │                                                          │
        │ restart assessment                          ┌────────────┴────────────┐
        │ (visits.py → "pending",                     │ all stages ok?          │
        │  pipeline_state wiped to {})                ▼                         ▼
        │                                      ┌────────────────┐    ┌──────────────────┐
        └──────────────▶ ( pending ) ─────────▶│ pending_review │    │ pipeline_failed  │
                                               └───────┬────────┘    └────────┬─────────┘
                                                       │ manual review          │ fix + restart
                                                       ▼                        └────▶ (pending)
                                                 ┌──────────┐    manual   ┌──────────┐
                                                 │ approved │───────────▶│ exported │
                                                 └──────────┘             └──────────┘
```

Observed values: `scheduled`, `in_progress`, `pending`, `pending_review`,
`pipeline_failed`, `approved`, `exported`, `completed`. `approved`/`exported`
appear only in read filters — those transitions are driven by the UI/manual
review, not the pipeline code.

### 4.2 `pipeline_state` per-stage status (JSONB, one entry per stage)

Every stage key (`full_pipeline`, `transcription`, `diarization`, `billing`,
`note`, `contract`) carries its own status:

```
   ┌─────────┐  enqueue   ┌────────┐  task start  ┌────────────┐  success  ┌───────────┐
   │ pending │───────────▶│ queued │─────────────▶│ processing │──────────▶│ completed │
   └─────────┘  (+task_id)└────────┘              └─────┬──────┘           └───────────┘
                                                        │ exception
                                                        ▼
                                                 ┌──────────┐
                                                 │  failed  │  (+ "error": <message>)
                                                 └──────────┘
```

Extra fields written per stage: `started_at`, `finished_at`; transcription adds
`segment_count` (+ `source: imported` when set via `/process-transcript`);
billing adds `item_count`, `total_minutes`, `categories`; diarization adds
`speakers`, `renamed_segments`; contract adds `care_need_level`, `services_count`.

### 4.3 Business verification status (gates login)

```
   register ─▶ ┌─────────┐ admin approves ┌──────────┐
               │ pending │───────────────▶│ approved │──▶ login allowed
               └────┬────┘                └──────────┘
                    │ admin rejects            │ admin suspends
                    ▼                          ▼
              ┌──────────┐               ┌───────────┐
              │ rejected │               │ suspended │
              └──────────┘               └───────────┘
   login while pending/rejected/suspended → 403 (status-specific message, §7)
```

### 4.4 Contract status

```
   pipeline generates ─▶ draft ──(new contract generated)──▶ superseded
                          │
                          └──(review + send)──▶ (sent / active / signed — UI-driven)
```

---

## 5. User flows

### 5.1 Agency onboarding (registration → first contract)

```
 1. POST /auth/business/register
    ├─ email exists?  ──▶ 409 "An account with this email already exists…"
    ├─ agency name exists? ──▶ 409 "An agency with this name is already registered…"
    ├─ password: complexity + HaveIBeenPwned leaked check
    └─ create Business(pending) + mirrored User + access_token
 2. Email verification link  (POST /auth/business/verify-email)
 3. Admin approves agency  → verification_status = approved
 4. Login  (POST /auth/business/login  or  /auth/login)
 5. POST /clients            (client PHI; created_by = user.id)
 6. POST /visits             (visit shell tied to client)
 7. Upload audio / import transcript  → pipeline runs
 8. Review transcript → billables → note → contract
 9. Export / email the contract  (/exports/*)
```

### 5.2 Record-to-contract (iOS / mobile)

```
 [Select client] ─▶ [Tap record] ─▶ [Speak the visit] ─▶ [Tap stop]
        │                                                     │
        │                                    ┌────────────────┘
        ▼                                    ▼
 (Expo) live WS transcript          POST /visits  → status "in_progress"
                                    POST /uploads/audio (auto_process=true)
                                             │
                                             ▼
                                    full_pipeline runs (§3.2)
                                             │
                              poll GET /visits/{id}/status
                                             │
                          ┌──────────────────┴───────────────────┐
                          ▼                                       ▼
                   pending_review                          pipeline_failed
              (transcript, billables,                  (see error in
               note, contract ready)                    pipeline_state[stage].error)
```

iOS uses `POST /visits/upload` (multipart `client_id` + `audio`); Expo uses
`POST /uploads/audio` (`visit_id` + `auto_process`). iOS has no live WS, no
pipeline screen; Expo has both.

### 5.3 Web "new assessment" wizard (`/visits/new`)

```
 Step 1: Details    →  Step 2: Source      →  Step 3: Provide          →  Step 4: Complete
 (client, visit        (audio  |  transcript)   audio: upload / record      pipeline runs,
  metadata)                                      transcript: import          redirect to
                                                 (SRT/VTT/text/auto)         /visits/{id}
```

### 5.4 Login session lifecycle (web)

```
 login → JWT (1h; admin_team 7d) in httpOnly palm_session cookie + refresh hash (30d)
   │
   ├─ activity (mousedown/keydown/touchstart, throttled) resets 15-min idle timer
   ├─ < 2 min remaining → session-warning modal
   ├─ POST /auth/refresh → rotates refresh token + new access token
   ├─ idle timeout / expiry → 401 "Session expired — please sign in again" → /login
   └─ logout-all-devices / password reset → force_logout_at invalidates all tokens
```

---

## 6. Decision trees

### 6.1 Login (`POST /auth/login`)

```
POST /auth/login
 │
 ├─ IP rate limit (10 / 60s)?           ── exceeded ─▶ 429 "Too many requests. Please wait…"
 │
 ├─ account locked (5 fails / 15 min)?  ── locked ───▶ 429 "Account temporarily locked…
 │                                                       Try again in {minutes} minutes."
 │
 ├─ email + password valid?
 │      └─ NO ─▶ record_failed_login
 │               ├─ this attempt triggers lock ─▶ 429 "Account locked due to too many…"
 │               └─ else                        ─▶ 401 "Incorrect email or password"
 │      └─ YES
 │
 ├─ user.is_active?  ── NO ─▶ 403 "Inactive user account"
 │
 ├─ mfa_enabled && mfa_secret?
 │      └─ YES ─▶ return { requires_mfa: true, mfa_token }  (no session yet)
 │               └─ client → POST /auth/mfa/login (email+password+code)
 │                        ├─ code valid?  NO ─▶ 401 "Invalid MFA code"
 │                        └─ YES ─▶ issue session
 │      └─ NO  ─▶ issue session directly
 │
 └─ issue access token (+ iss=palmcare-ai, iat, exp) + rotating refresh token
    set httpOnly palm_session cookie
```

Business login (`/auth/business/login`) adds, after credentials: email-verified
gate (403), business 2FA gate (`X-2FA-Required: true` header → 401 "2FA code
required" → "Invalid 2FA code"), and `verification_status == approved` gate
(403 with pending/rejected/suspended message).

### 6.2 Authorization on a protected request (`get_current_user`)

```
request
 │
 ├─ token from Authorization: Bearer  OR  palm_session cookie
 ├─ decodes to a valid payload?  ── NO ─▶ 401 "Invalid or expired token"
 ├─ payload.mfa_pending?         ── YES ─▶ 401 "MFA verification required"
 ├─ sub present + valid UUID?    ── NO ─▶ 401 "Invalid token payload"
 ├─ user exists?                 ── NO ─▶ 401 "User not found"
 ├─ user.is_active?              ── NO ─▶ 403 "Inactive user"
 ├─ token iat < force_logout_at? ── YES ─▶ 401 "Session expired — please sign in again"
 └─ OK ─▶ handler runs
          └─ admin-only route? role=="admin" else 403 "Admin access required"
          └─ platform route?   role=="admin" && email endswith @palmtai.com
                               else 403 "Platform admin access required"
```

### 6.3 Data isolation (why cross-account reads look like 404)

```
GET /visits/{id}
 └─ Visit JOIN Client ON Client.created_by == current_user.id
      ├─ match?  NO ─▶ 404 "Visit not found"   (not 403 — avoids enumeration)
      └─ match?  YES ─▶ return visit
```

### 6.4 Free-plan usage gate (`POST /visits`)

```
POST /visits
 └─ business has paid plan?  (or @palmtai.com platform admin)
      ├─ YES ─▶ create visit
      └─ NO  ─▶ used < 2 free assessments?
                 ├─ YES ─▶ create visit
                 └─ NO  ─▶ 402 "Free plan limit reached. You've used your 2 free
                                assessments. Please upgrade to continue."
```

### 6.5 Transcription provider selection (worker)

```
transcribe_visit
 └─ settings.use_deepgram && deepgram_api_key set?
      ├─ YES ─▶ Deepgram Nova-3 (diarize=true)  ──error──▶ fall back ▼
      └─ NO  ─────────────────────────────────────────────▶ OpenAI Whisper / faster-whisper
```

### 6.6 Audio upload validation (`POST /uploads/audio`)

```
POST /uploads/audio
 ├─ content-type is audio/*?   NO ─▶ 400 "Invalid file type: {type}. Upload an audio file…"
 ├─ size <= 500 MB?            NO ─▶ 413 "File too large. Maximum size is 500MB."
 ├─ looks like real audio?     NO ─▶ 400 "The uploaded file doesn't look like a supported audio recording."
 ├─ store to S3               fail ─▶ 500 "Failed to upload file. Please try again."
 └─ OK ─▶ AudioAsset created; if auto_process → enqueue full_pipeline
```

---

## 7. Error message catalog

Verbatim `detail=` strings with HTTP status codes, grouped by domain. `{…}` marks
runtime-interpolated values.

### 7.1 Auth & session

| Status | Message |
|--------|---------|
| 401 | `Incorrect email or password` |
| 401 | `Invalid email or password` (business login) |
| 401 | `Invalid or expired token` |
| 401 | `MFA verification required` |
| 401 | `Invalid token payload` |
| 401 | `User not found` |
| 401 | `Session expired — please sign in again` |
| 401 | `Invalid MFA code` |
| 401 | `2FA code required` (header `X-2FA-Required: true`) |
| 401 | `Invalid 2FA code` |
| 403 | `Inactive user account` / `Inactive user` |
| 400 | `MFA is not enabled for this account` |
| 400 | `Invalid MFA code. Please try again.` |
| 400 | `MFA is already enabled. Disable it first to reconfigure.` |
| 400 | `MFA has not been set up. Call /auth/mfa/setup first.` |

### 7.2 Password & account management

| Status | Message |
|--------|---------|
| 400 | `Invalid or expired reset link. Please request a new one.` |
| 400 | `Reset link has expired. Please request a new one.` |
| 400 | `You cannot reuse any of your last 5 passwords.` |
| 400 | `Current password is incorrect.` |
| 400 | `New password must be at least 8 characters.` |
| 400 | `New password must be different from current password.` |
| 400 | `Please type "DELETE MY ACCOUNT" to confirm.` |
| 403 | `Platform admin accounts cannot be deleted through self-service.` |
| 400 | `Password must contain {requirements}` |
| 400 | `This password has appeared in a known data breach. Please choose a different, unique password.` |
| 500 | `Account deletion failed. Please contact support@palmtai.com.` |

### 7.3 Registration & business verification

| Status | Message |
|--------|---------|
| 409 | `An account with this email already exists. Try signing in instead.` |
| 409 | `An agency with this name is already registered. If you work there, ask the account owner to invite you from Settings → Team.` |
| 403 | `Please verify your email address. Check your inbox for the verification link.` |
| 403 | `Business registration is pending. Please complete verification.` |
| 403 | `Business registration was rejected: {reason}` |
| 403 | `Business account is suspended. Contact support.` |
| 500 | `Registration could not be completed. Please try again in a moment.` |

### 7.4 Authorization (403)

| Status | Message |
|--------|---------|
| 403 | `Admin access required` |
| 403 | `Platform admin access required` |
| 403 | `Permission required: {permission}` |
| 403 | `CEO access required` |
| 403 | `You don't have access to this business` |
| 403 | `Only account owners can manage team members` |
| 403 | `Not authorized to modify this user` |
| 403 | `Team limit reached. Your {plan_name} plan allows {max_users} user(s).{upgrade_msg}` |

### 7.5 Not found (404)

`Visit not found` · `Client not found` · `Caregiver not found` · `Contract not
found` · `No contract found for this client` · `No contract template found.
Upload one in Templates.` · `Audio not found` · `Business not found` ·
`Business profile not found` · `Account not found` · `User not found` ·
`Ticket not found` · `Document not found` · `Subscription not found`

### 7.6 Validation (400 / 413 / 422)

| Status | Message |
|--------|---------|
| 422 | `Name cannot be empty` / `Name is too long` |
| 400 | `Invalid file type: {type}. Upload an audio file (mp3, wav, m4a, etc.)` |
| 413 | `File too large. Maximum size is 500MB.` |
| 400 | `The uploaded file doesn't look like a supported audio recording.` |
| 400 | `Too many segments. Maximum is 50,000.` |
| 400 | `Segment {i}: end_ms must be greater than start_ms` |
| 400 | `Failed to parse SRT content. Check the file format.` |
| 400 | `No valid segments found in SRT content` |
| 400 | `No content provided` |
| 400 | `Only PDF and image files are accepted` |
| 400 | `File size exceeds 10MB limit` |
| 400 | `File must be a CSV` |

### 7.7 Pipeline / transcription

| Status | Message |
|--------|---------|
| 400 | `No transcript found. Import or upload audio first.` |
| 400 | `No audio uploaded for this visit` |
| 404 | `No transcript available. Upload audio or import a transcript.` |
| 400 | `Couldn't read audio upload` / `Empty audio file` |
| 413 | `Audio chunk too large (max 25MB)` |
| 503 | `Live transcription unavailable: no provider configured on server` |
| 502 | `Live transcription failed: {ExceptionType}` |
| 502 | `Could not reach Deepgram ({ExceptionType})` |
| 502 | `Transcription service is temporarily unavailable. Please try again.` |
| 500 | `Failed to generate contract from template` |

### 7.8 Billing / payments

| Status | Message |
|--------|---------|
| 402 | `Free plan limit reached. You've used your 2 free assessments. Please upgrade to continue.` |
| 400 | `Unknown product` / `Bundle ID mismatch` / `Product ID mismatch` (Apple IAP) |
| 400 | `Invalid App Store transaction` / `Malformed App Store transaction JWS` |
| 500 | `Plan not configured on server` |
| 503 | `App Store verification library not installed on server` |
| 503 | `Apple root certificates not configured (set APPLE_ROOT_CERTS_DIR)` |

Stripe errors are returned as JSON payloads, not raised `HTTPException`s.

### 7.9 Rate limiting (429)

| Message | Trigger |
|---------|---------|
| `Too many requests. Please wait a moment and try again.` | `/auth/*` custom limiter (10 / 60s per IP) |
| `Too many requests. Please try again later.` (header `Retry-After`) | slowapi limiter (business auth, default 200/min) |
| `Account temporarily locked due to too many failed attempts. Try again in {minutes} minutes.` | account lockout (5 fails / 15 min) |
| `Account locked due to too many failed attempts. Try again in {minutes} minutes.` | lock triggered on this attempt |
| `Account temporarily locked. Try again in {seconds_remaining} seconds.` | MFA login while locked |

Per-endpoint slowapi limits: register `5/5min`, business login `10/min`,
password-reset request `5/15min`, verify-email `20/15min`,
resend-verification `3/15min`, magic-link request `5/15min`, pipeline
endpoints `120/min`.

### 7.10 Webhook / integration (401 / 503)

`Invalid webhook secret` (401) · `Invalid or missing API key` (401) ·
`Webhook not configured` (503) · `Monday.com integration request failed` (400)

---

*Generated from the codebase (`apps/api`, `apps/worker`, `apps/web`, `ios-app`).
Keep it in sync when routers, pipeline stages, or error strings change.*
