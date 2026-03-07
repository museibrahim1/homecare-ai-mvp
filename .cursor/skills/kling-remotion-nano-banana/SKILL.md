---
name: kling-remotion-nano-banana
description: Plans and executes high-quality AI video workflows using Kling 3.0 (fal.ai), Remotion, and Nano Banana assets. Use when the user asks for marketing videos, text-to-video generation, video prompt tuning, Remotion scene assembly, or image-to-video workflows.
---

# Kling + Remotion + Nano Banana

## When to use

Use this skill when the task includes any of:
- "Kling 3.0", "fal.ai", "text-to-video", "image-to-video"
- "Remotion video", "promo video", "marketing video"
- "Nano Banana" image generation for video scenes
- Improving motion quality, duration, aspect ratio, or audio in generated videos

## Project defaults

- Prefer Nano Banana for iPhone/UI marketing images.
- Prefer Remotion for final assembly, timing, captions, and brand polish.
- Use Kling O3 Pro when realistic motion quality is the priority.

## Kling O3 Pro quick reference

- Model ids:
  - `fal-ai/kling-video/o3/pro/text-to-video`
  - `fal-ai/kling-video/o3/pro/image-to-video`
- Client package: `@fal-ai/client`
- Auth: set `FAL_KEY` server-side (never expose in browser/mobile).
- O3 Pro supports:
  - Duration: `3` to `15` seconds
  - Aspect ratio (text-to-video): `16:9`, `9:16`, `1:1`
  - Native audio generation via `generate_audio`
  - 1080p output in pro mode

## Recommended workflow

1. Define outcome first
   - Goal, audience, CTA, platform (web, TikTok, LinkedIn), target duration.
2. Pick aspect ratio and duration
   - LinkedIn/web hero: `16:9`
   - Reels/Shorts: `9:16`
   - Feed cross-post: `1:1`
3. Create source visuals
   - Generate/refresh stills with Nano Banana for product-accurate frames.
4. Generate motion clips with Kling
   - Start with short clips (4-6s) and iterate quickly.
   - Raise duration only after style/motion direction looks right.
   - For image-driven shots, use start-frame or start/end-frame image-to-video.
5. Assemble in Remotion
   - Sequence clips, transitions, overlays, captions, logo lockups, CTA end card.
6. QA and export
   - Check legibility, pacing, and safe areas for the destination platform.

## Prompt pattern for Kling

Use this structure:

`[Subject + environment], [camera movement], [action], [style], [lighting], [brand color hints], [no artifacts constraints].`

Example:

`Home care coordinator using a modern mobile app in a bright client living room, slow push-in camera, she records an assessment and reviews AI-generated notes, cinematic realistic style, soft morning light, subtle teal accents matching brand palette, clean details, no blur or distortion.`

## API usage pattern

Use `fal.subscribe(...)` for straightforward calls, or queue for long-running/multi-step pipelines.

### Text-to-video minimal request fields

- `prompt`
- `duration`
- `aspect_ratio`
- `generate_audio` (optional)

### Image-to-video minimal request fields

- `image_url` (required start frame)
- `prompt` (optional but recommended for motion/style guidance)
- `end_image_url` (optional end frame for controlled transitions)
- `duration`
- `generate_audio` (optional)

### Image-to-video best use

- Use when you need visual continuity from a designed frame.
- Use `end_image_url` when you need deterministic start-to-end transitions.
- Keep prompts motion-specific (camera move + subject action) instead of broad style-only prompts.
- Prefer 5-8s shots first; extend to 10-15s after motion quality is stable.

### Reliability pattern

- Log queue updates.
- Persist `requestId`.
- Retry polling (`fal.queue.status`) on transient failures.
- Fetch final result with `fal.queue.result`.

## Quality checklist

- Motion is coherent (no jitter, no limb warping).
- Product UI is recognizable and brand-accurate.
- Text overlays are readable on mobile.
- Clip timing aligns with narration/music beats.
- Final CTA is visible for at least 1.2s.

## Guardrails

- Do not place `FAL_KEY` in client-side code.
- For secrets, use server route/proxy only.
- Prefer multiple short shots over one long complex shot when quality drops.
