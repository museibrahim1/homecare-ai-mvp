# Claude Skills & Instructions

This document contains instructions for tools, APIs, and skills that Claude should use when asked to perform specific tasks. **Always check this file when starting a new task.**

---

## Table of Contents
1. [Video Creation (Remotion)](#video-creation-remotion)
2. [Voiceover Generation (WaveSpeed + ElevenLabs)](#voiceover-generation-wavespeed--elevenlabs)
3. [Image Generation (WaveSpeed + Nano Banana Pro)](#image-generation-wavespeed--nano-banana-pro)

---

## Video Creation (Remotion)

### When to Use
When the user asks to create, edit, or render videos, animations, or motion graphics.

### Setup Location
```
/videos/                    # Remotion project root
├── src/
│   ├── index.ts           # Entry point
│   ├── Root.tsx           # Composition registration
│   └── compositions/      # Video components
├── public/
│   ├── segments/          # Audio narration files
│   └── screenshots/       # App screenshots for demos
├── scripts/
│   └── generate_narration.py  # TTS generation script
└── package.json
```

### Key Commands
```bash
# Start preview studio
cd videos && npm run dev

# Render video
cd videos && npx remotion render CompositionId output.mp4

# Generate narration (OpenAI TTS)
cd videos && python3 scripts/generate_narration.py --voice nova --segments
```

### Remotion Best Practices
- Use `interpolate()` for linear animations
- Use `spring()` for bouncy, natural motion
- Use `<Sequence>` to time multiple scenes
- Always add buffer time (0.5-1s) after audio in each scene
- Use `staticFile()` for assets in /public folder

### Available Voices (OpenAI TTS)
| Voice | Style |
|-------|-------|
| nova | Female, warm, professional (recommended) |
| onyx | Male, deep, authoritative |
| alloy | Neutral, balanced |
| fable | British, expressive |
| shimmer | Female, soft, gentle |

---

## Voiceover Generation (WaveSpeed + ElevenLabs)

### When to Use
When the user asks to generate voiceovers, narration, speech, or audio from text.

### API Configuration
```
Provider: WaveSpeed AI
Model: ElevenLabs Eleven V3
API Key: Set WAVESPEED_API_KEY in .env
```

### API Endpoints
```
# Submit task
POST https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3
Authorization: Bearer $WAVESPEED_API_KEY

# Get result (poll until status=completed)
GET https://api.wavespeed.ai/api/v3/predictions/{task_id}/result
```

### Request Format (Submit Task)
```json
{
  "text": "Your text to convert to speech",
  "voice_id": "Alice",
  "similarity": 1.0,
  "stability": 0.5,
  "use_speaker_boost": true
}
```

### Available ElevenLabs Voices
- Alice (female, clear, professional) - RECOMMENDED
- Aria (female, expressive)
- Sarah (female, soft)
- Laura (female, warm)
- Charlotte (female, elegant)
- Jessica (female, friendly)
- Lily (female, gentle)
- Roger (male, authoritative)
- George (male, deep)
- Charlie (male, casual)
- Callum (male, Scottish)
- Liam (male, young)
- Will (male, confident)
- Eric (male, clear)
- Chris (male, warm)
- Brian (male, newscast)
- Daniel (male, British)
- Bill (male, mature)

### Usage Instructions
1. Use ElevenLabs v3 via WaveSpeed for high-quality voiceovers
2. For video narration, generate audio then place in `/videos/public/segments/`
3. Prefer ElevenLabs over OpenAI TTS for final production audio

---

## Image Generation (WaveSpeed + Nano Banana Pro)

### When to Use
When the user asks to generate images, pictures, illustrations, or graphics.

### API Configuration
```
Provider: WaveSpeed AI
Model: Nano Banana Pro (fal-ai/nano-banana-pro)
API Key: Set WAVESPEED_API_KEY in .env
```

### API Endpoint
```
POST https://api.wavespeed.ai/v1/generate
Authorization: Bearer $WAVESPEED_API_KEY
```

### Request Format
```json
{
  "model": "fal-ai/nano-banana-pro",
  "input": {
    "prompt": "Your image description",
    "negative_prompt": "blurry, low quality, distorted",
    "image_size": "landscape_16_9",
    "num_inference_steps": 30,
    "guidance_scale": 7.5
  }
}
```

### Image Size Options
- `square_hd` (1024x1024)
- `square` (512x512)
- `portrait_4_3` (768x1024)
- `portrait_16_9` (576x1024)
- `landscape_4_3` (1024x768)
- `landscape_16_9` (1024x576)

### Usage Instructions
1. Use Nano Banana Pro for fast, high-quality image generation
2. Include negative prompts to improve quality
3. Use `landscape_16_9` for video thumbnails
4. Use `square_hd` for social media posts

---

## Transcription (Deepgram Nova-3)

### When to Use
When processing audio recordings for transcription, either batch (pipeline) or live (real-time preview).

### API Configuration
```
Provider: Deepgram
Model: Nova-3
API Key: Set DEEPGRAM_API_KEY in .env
Endpoint: https://api.deepgram.com/v1/listen
```

### Features
- Smart formatting (currency, phone numbers, medical terms)
- Built-in speaker diarization (no separate pyannote step)
- Sub-300ms latency for live transcription
- 36+ languages

### Backend Integration
- **Batch (pipeline):** `apps/worker/libs/deepgram_asr.py` - auto-selected when DEEPGRAM_API_KEY is set
- **Live (real-time):** `POST /live/transcribe` - sends audio chunk, returns instant transcript
- **Fallback:** OpenAI Whisper when Deepgram key not configured

### Pricing
- Pay-as-you-go: ~$0.0077/minute
- Cheaper than Whisper ($0.006/min) for batch, slightly more for streaming

---

## Quick Reference

| Task | Tool/API | Model |
|------|----------|-------|
| Create video | Remotion | N/A (code-based) |
| Generate voiceover | WaveSpeed | ElevenLabs v3 |
| Generate image | WaveSpeed | Nano Banana Pro |
| Quick TTS (dev) | OpenAI | tts-1-hd |
| Transcription (primary) | Deepgram | Nova-3 |
| Transcription (fallback) | OpenAI | Whisper-1 |
| AI Analysis | Anthropic | Claude Sonnet 4 |

---

## Adding New Skills

When learning a new tool or API:
1. Add a new section to this document
2. Include: When to Use, API Config, Request Format, Best Practices
3. Update the Table of Contents
4. Commit changes with message "Update Claude.MD with [skill name]"

---

*Last updated: February 1, 2026*
