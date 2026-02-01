# Homecare AI - Video Studio

This folder contains a Remotion-powered video generation system for creating demo videos, marketing content, and tutorials.

## Quick Start

```bash
# Start the preview studio
npm run dev

# This opens http://localhost:3000 in your browser
```

## Available Compositions

| ID | Description | Duration |
|----|-------------|----------|
| `HelloWorld` | Simple test animation | 5 seconds |
| `DemoVideo` | Full product demo (no audio) | 50 seconds |
| `DemoVideoWithAudio` | Full product demo (with narration) | 50 seconds |

## Preview a Video

1. Run `npm run dev`
2. Open http://localhost:3000
3. Select a composition from the sidebar
4. Press Play to preview

## Render Final Video

```bash
# Render demo without audio
npx remotion render DemoVideo out/demo.mp4

# Render demo with audio (add audio file first)
npx remotion render DemoVideoWithAudio out/demo-with-audio.mp4

# Render with custom quality
npx remotion render DemoVideo out/demo-4k.mp4 --scale=2
```

## Adding Audio

See `public/AUDIO_INSTRUCTIONS.md` for:
- Narration script
- How to record/generate audio
- Background music options

## Project Structure

```
videos/
├── src/
│   ├── index.ts              # Entry point
│   ├── Root.tsx              # Composition registration
│   └── compositions/
│       ├── HelloWorld.tsx    # Test animation
│       └── DemoVideo.tsx     # Full product demo
├── public/
│   ├── screenshots/          # App screenshots
│   └── demo-narration.mp3    # Audio file (add this)
├── remotion.config.ts        # Remotion settings
└── package.json
```

## Creating New Videos

1. Create a new component in `src/compositions/`
2. Register it in `src/Root.tsx`
3. Preview with `npm run dev`
4. Render with `npx remotion render YourCompositionId output.mp4`

## Tips

- Use `interpolate()` for linear animations
- Use `spring()` for bouncy, natural motion
- Use `<Sequence>` to time multiple scenes
- Screenshots are in `public/screenshots/`
