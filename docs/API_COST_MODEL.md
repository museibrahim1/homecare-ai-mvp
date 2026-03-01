# API Cost Model — PalmCare AI

*Last updated: February 25, 2026*

## Per-Assessment Variable Cost (30-minute recording)

| Pipeline Step | Service | Rate | Cost |
|---------------|---------|------|------|
| Transcription + Diarization | Deepgram Nova-3 (diarize=true) | $0.0077/min | **$0.23** |
| Billing Extraction | Claude Sonnet 4 (~2K in / ~1K out tokens) | $3/$15 per 1M tokens | **$0.02** |
| Visit Note Generation | Claude Sonnet 4 (~3K in / ~2K out tokens) | $3/$15 per 1M tokens | **$0.04** |
| Contract Generation | Claude Sonnet 4 (~5K in / ~4K out tokens) | $3/$15 per 1M tokens | **$0.08** |
| **Total per assessment** | | | **~$0.37** |

### Scaling Estimates

| Monthly Assessments | Variable API Cost | Fixed Costs | Total |
|--------------------|-------------------|-------------|-------|
| 50 | $18.50 | ~$20 | ~$38.50 |
| 100 | $37.00 | ~$20 | ~$57.00 |
| 500 | $185.00 | ~$20 | ~$205.00 |
| 1,000 | $370.00 | ~$20 | ~$390.00 |

## Fixed Monthly Costs

| Service | Plan | Cost | Notes |
|---------|------|------|-------|
| Resend (email) | Free tier | $0 | 3,000 emails/month included |
| Resend (email) | Pro | $20/mo | 50,000 emails/month |
| MinIO / S3 | Self-hosted | $0 | Audio + document storage |
| Stirling-PDF | Self-hosted | $0 | OCR for contract templates |
| Redis + Celery | Self-hosted | $0 | Task queue |
| PostgreSQL | Self-hosted | $0 | Database |

## Per-Transaction Costs

| Service | Rate | When |
|---------|------|------|
| Stripe | 2.9% + $0.30 | Each customer payment |
| Stripe (international) | +1.5% | International cards |

## Landing Page Chat

| Service | Rate | Estimated Monthly Cost |
|---------|------|----------------------|
| Claude Haiku (landing chat) | $0.25/$1.25 per 1M tokens | ~$2-5/mo at moderate traffic |

## Revenue vs Cost Analysis

At **$0.37 per assessment** and billing clients **$25-35/hr** for care:

- A typical 20-hour/week client generates **$2,000-2,800/mo** in billings
- The assessment that creates that contract costs **$0.37**
- **ROI: 5,400x - 7,500x** return on AI cost per client acquired
- Even at 1,000 assessments/month, total API spend is ~$390/mo

## Cost Optimization Applied

| Change | Savings |
|--------|---------|
| Removed pyannote (redundant diarization) | $19-99/mo subscription + ~$0.08/assessment |
| Switched landing chat from GPT-4o-mini to Claude Haiku | One fewer vendor (OpenAI not required for chat) |
| Deepgram diarize=true replaces separate step | ~30s faster per pipeline run |

## Fallback Strategy

| Primary | Fallback | Trigger |
|---------|----------|---------|
| Deepgram Nova-3 | OpenAI Whisper ($0.006/min) | DEEPGRAM_API_KEY not set |
| Claude Sonnet 4 | GPT-4o-mini ($0.15/$0.60 per 1M) | ANTHROPIC_API_KEY not set |
| Claude Haiku (chat) | N/A (503 error) | ANTHROPIC_API_KEY not set |

## Services NOT Used in Production

| Service | Status | Notes |
|---------|--------|-------|
| WaveSpeed / ElevenLabs | Scripts only | Used in `/videos/` for marketing voiceovers |
| WaveSpeed / Nano Banana Pro | Scripts only | Used in `/videos/` for marketing images |
| pyannote.ai | **Removed** | Replaced by Deepgram built-in diarization |
| OpenAI (landing chat) | **Replaced** | Switched to Claude Haiku |
