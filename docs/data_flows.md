# PALM Data Flows

How data moves through the product, end to end. Visual version:
`docs/visual/02-data-flows.html` (also in `~/Desktop/PALM Docs/`).

Last updated: July 10, 2026.

## System at a glance

Three client apps (native iOS, Next.js web, Expo mobile) talk to one FastAPI
backend on Railway. Heavy AI work runs on a Celery worker via Redis so requests
never block. PostgreSQL stores 21 models with field-level encryption on
sensitive fields; MinIO/S3 holds audio and documents. External services:
Deepgram Nova-3 (transcription + diarization), Anthropic Claude (billables,
notes, contracts, landing chat), Apple App Store (all billing), Resend (email).

## Flow 1: Voice to contract (the core pipeline)

1. **Record** — caregiver records the assessment visit on iOS/Expo.
2. **Upload** — audio goes to the API and lands in S3 (`POST /uploads/audio`).
3. **Transcribe** — Deepgram Nova-3 with `diarize=true` returns text plus
   speaker labels in one pass.
4. **Extract billables** — rules engine plus Claude find billable care blocks.
5. **Write SOAP note** — Claude generates the clinical visit note.
6. **Generate contract** — Claude plus DOCX templates build a service
   agreement using the right rules for all 51 US jurisdictions
   (`apps/worker/libs/state_rules.py`).
7. **Review and approve** — agency reviews billables, note, and contract in
   the web dashboard.
8. **Export and send** — PDF/DOCX exported and emailed to the client via Resend.

Cost per assessment: about $0.37. Time: minutes instead of 2 to 3 hours by hand.

## Flow 2: Money (Apple subscriptions)

1. **Paywall** — user picks Starter/Growth/Enterprise, monthly or annual
   (StoreKit 2, `PaywallView.swift`).
2. **Apple charges** — payment handled entirely by Apple; PALM never sees
   card data.
3. **Server verifies** — signed transaction (JWS) validated against Apple root
   certificates (`POST /billing/apple/verify`).
4. **Entitlement on** — subscription row updated: tier, trial status, billing
   cycle, expiry.
5. **Stays in sync** — renewals, refunds, cancellations arrive as App Store
   Server Notifications V2 (`POST /billing/apple/notifications`).

14-day free trials on Starter and Growth come from Apple introductory offers
and are mirrored server side (`SubscriptionStatus.TRIAL`).

## Flow 3: Sign-up and login

1. **Register** — agency signs up with business details
   (`/auth/business/register`).
2. **Verify** — email verification plus business approval queue in admin.
3. **Login** — bcrypt password check, optional MFA, account lockout on brute
   force; JWT issued.
4. **Every request** — JWT checked, role checked, per-tier AI rate limit
   applied (`app/core/tier_limits.py`), PHI access audit-logged.

Data isolation: users can only read their own agency's clients, visits, and
contracts.

## Flow 4: Growth engine (outreach and social)

1. **Lead sourcing** — CMS agency database imported and enriched
   (`scripts/data/`).
2. **Email campaigns** — outreach waves, demo confirmations, digests via
   Resend (`scripts/email/`, `scripts/investors/`).
3. **Creatives** — on-brand images and videos from the code-based creative
   studio (Playwright rendering).
4. **Auto-posting** — GitHub Actions publishes to Instagram, Threads, and
   LinkedIn on schedule; Facebook uses native Meta scheduling.

## Security controls along the way

| Layer | Protection |
|---|---|
| In transit | HTTPS everywhere; WebSocket streams carry the same JWT |
| At rest | Postgres + Fernet field encryption (EIN, voiceprint); audio in access-controlled S3 |
| Identity | Short JWT sessions, MFA, bcrypt + password history, lockout, 15-min web timeout |
| Authorization | Server-side role checks; agency data isolation on every query |
| Abuse | Rate limits on auth + AI endpoints; per-tier AI limits (15/40/120 req/min) |
| Payments | Apple holds card data; server-side JWS verification before any entitlement |
| Compliance | HIPAA audit logging middleware on PHI routes; Trivy + Gitleaks + CodeQL in CI |
