# Adding Audio Narration to Your Demo Video

## Option 1: Record Your Own Narration

Save an MP3 file named `demo-narration.mp3` in this folder (`videos/public/`).

### Narration Script (50 seconds)

**Scene 1 (0-4s) - Intro:**
> "Introducing Homecare AI — the AI-powered care assessment engine that turns intake conversations into proposal-ready contracts."

**Scene 2 (4-9s) - Core Features:**
> "Upload audio recordings. AI transcribes and identifies speakers. Then automatically generates service contracts."

**Scene 3 (9-15s) - Pipeline:**
> "Our three-step pipeline takes you from audio to contract in minutes — not hours. That's an 80% reduction in documentation time."

**Scene 4 (15-21s) - Assessments:**
> "The Assessments Dashboard is your command center. Track every assessment with color-coded status badges."

**Scene 5 (21-27s) - Visit Detail:**
> "Watch AI process your recordings in real-time. One click runs the entire pipeline — transcription, billing extraction, and contract generation."

**Scene 6 (27-33s) - Contract Preview:**
> "Contracts are AI-generated but human-approved. Edit any section, regenerate with changes, or export directly to PDF."

**Scene 7 (33-39s) - Clients:**
> "Complete client profiles with care levels, medical conditions, and emergency contacts — all extracted from your conversations."

**Scene 8 (39-45s) - Reports:**
> "Generate reports for payroll, billing, and activity tracking. Export to CSV with one click."

**Scene 9 (45-50s) - CTA:**
> "Ready to save hours on every assessment? Start your free trial today."

---

## Option 2: Use Text-to-Speech

Use ElevenLabs, Amazon Polly, or another TTS service to generate narration from the script above.

Save the output as `demo-narration.mp3` in this folder.

---

## Option 3: Add Background Music Only

Download royalty-free background music and save as `demo-narration.mp3`.

Recommended: Upbeat, professional tracks from:
- Uppbeat.io
- Epidemic Sound
- YouTube Audio Library

---

## Rendering with Audio

Once you have your audio file:

```bash
cd videos
npx remotion render DemoVideoWithAudio out/demo-with-audio.mp4
```
