---
marp: true
title: Homecare AI Pitch Deck
paginate: true
theme: default
---

## Homecare AI

### Care assessments in, proposal-ready contracts out.

**AI-powered workflow for home healthcare agencies** that turns intake/visit conversations (audio or transcripts) into **draft service contracts, billables, and exports** — with human-in-the-loop review.

---

## The problem

- **Slow**: intake calls → manual notes → manual pricing → manual contract drafting  
- **Inconsistent**: variability across coordinators/branches leads to **pricing and scope errors**
- **High-stakes**: delays and mistakes cost **revenue, compliance risk, and client trust**

---

## The solution

Homecare AI converts a conversation into structured outputs:

- **Transcript ingestion** (upload audio or import text)
- **Services & billables extraction**
- **Contract drafting** from templates
- **Review + edit + export** (PDF/CSV) in one place

---

## Demo login (admin UI)

![Login screen](screenshots/01-login.png)

---

## Assessments inbox (the “work queue”)

Teams can quickly see what’s pending review and start a new assessment or demo.

![Assessments page](screenshots/02-assessments.png)

---

## Workflow: assessment → pipeline → proposal

1. Start or import an assessment  
2. Run pipeline steps (transcribe → bill → contract)  
3. Review outputs in the right-side panel  
4. Export PDF/CSV for client + billing ops

---

## Intake capture + pipeline controls

Upload audio or import a transcript, then run the pipeline.

![Visit detail](screenshots/03-visit-detail.png)

---

## Contract generation (human-in-the-loop)

Preview the generated contract, edit/regenerate, then export.

![Contract preview](screenshots/04-contract-preview.png)

---

## Client CRM (lightweight, agency-friendly)

Centralized client records power consistent assessments, proposals, and reporting.

![Clients](screenshots/05-clients.png)

---

## Reporting & exports

Agency ops can pull timesheets/billing summaries and track throughput.

![Reports](screenshots/06-reports.png)

---

## How it works (high level)

- **Frontend**: Next.js admin UI  
- **Backend**: FastAPI API + auth  
- **Pipeline**: worker jobs (transcription, extraction, contract generation)  
- **Storage**: Postgres (entities) + S3/MinIO (audio)  

---

## Business model (initial)

- Subscription per agency / location
- Tiered plans by usage (visits/month, storage, seats)
- Optional onboarding + integrations

---

## What we’re building next

- Deeper template controls + clause library
- More robust validation + audit trails
- Integrations (EMR/CRM, billing systems)
- Multi-location analytics and admin tooling

