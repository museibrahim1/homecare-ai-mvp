# PalmCare AI (AI Voice Contractor)

An AI-powered care assessment engine for in-home healthcare agencies that turns intake/visit conversations (audio or transcripts) into **proposal-ready service contracts**—so agencies can send accurate contracts and pricing faster.

## Features

- **Care Assessment → Contract Generation (Primary)**: Extract care needs and service details and generate a **proposal-ready service contract**
- **Contract Templates**: Generate contract documents from templates (`templates/contracts/`)
- **Admin Review UI**: Review/edit/approve contracts and supporting artifacts in the web app
- **Audio Upload & Storage**: Store recordings in MinIO (S3-compatible)
- **Speech-to-Text**: Timestamped transcription (OpenAI Whisper API or local faster-whisper)
- **Speaker Diarization (Optional)**: Identify who spoke when (pyannote.audio), can be skipped for speed
- **Supporting Outputs**: Rules-based billable blocks and AI-generated visit notes

## Tech Stack

- **Backend**: FastAPI (Python)
- **Worker**: Celery with Redis
- **Database**: PostgreSQL
- **Object Storage**: MinIO
- **ASR**: faster-whisper
- **Diarization**: pyannote.audio
- **Frontend**: Next.js (React)
- **Infrastructure**: Docker Compose

## Quickstart

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start all services:
   ```bash
   docker compose up --build
   ```

3. Run database seed:
   ```bash
   docker compose exec api python scripts/seed.py
   ```

4. Access the application:
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Admin UI: http://localhost:3000
   - MinIO Console: http://localhost:9001

## API Workflow

1. **Login**: `POST /auth/login` to get JWT token
2. **Create Client**: `POST /clients` with client details
3. **Create Visit**: `POST /visits` to create a visit shell
4. **Upload Audio**: `POST /uploads/audio` with the recording
5. **Run Pipeline**:
   - `POST /pipeline/visits/{visit_id}/transcribe`
   - `POST /pipeline/visits/{visit_id}/diarize`
   - `POST /pipeline/visits/{visit_id}/align`
   - `POST /pipeline/visits/{visit_id}/bill`
   - `POST /pipeline/visits/{visit_id}/note`
   - `POST /pipeline/visits/{visit_id}/contract`
6. **Review**: Use the admin UI to review and approve
7. **Export**: Download the contract/proposal and supporting exports (PDF/CSV)

## Contract-First Workflow (Recommended)

1. Create a client and an assessment visit (intake call).
2. Upload audio (or import a transcript).
3. Run the pipeline through contract generation.
4. Review/edit the generated contract details.
5. Export the contract PDF and send as a proposal.

## Project Structure

```
homecare-ai-mvp/
├── apps/
│   ├── api/          # FastAPI backend
│   ├── worker/       # Celery worker
│   └── web/          # Next.js frontend
├── infra/            # Infrastructure configs
├── templates/        # Document templates
├── scripts/          # Utility scripts
└── tests/            # Test suite
```

## Environment Variables

See `.env.example` for all required environment variables.

## Development

### Running Tests
```bash
docker compose exec api pytest
```

### Database Migrations
```bash
docker compose exec api alembic upgrade head
```

### Adding New Billing Rules
Edit `apps/api/app/services/billing_rules.py` to add new task detection patterns.

## License

Proprietary - All rights reserved
