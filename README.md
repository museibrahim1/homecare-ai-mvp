# Homecare AI MVP

An AI-powered voice analyzer for in-home healthcare agencies that processes caregiver-client conversations to generate billable hours and service documentation.

## Features

- **Audio Upload & Storage**: Secure audio file storage with MinIO (S3-compatible)
- **Speech-to-Text**: Transcription with timestamps using faster-whisper
- **Speaker Diarization**: Identify caregiver vs client using pyannote.audio
- **Billable Hours Engine**: Rules-based extraction of billable time blocks
- **Document Generation**: Auto-generate visit notes and service contracts
- **Admin Review UI**: Web interface for reviewing and approving documentation

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
7. **Export**: Download timesheets, notes, and contracts

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
