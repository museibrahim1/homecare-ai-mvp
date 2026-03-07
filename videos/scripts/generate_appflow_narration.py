#!/usr/bin/env python3
"""Generate voiceover segments for the AppFlowAd using OpenAI TTS."""

import os
import sys
from pathlib import Path
from openai import OpenAI

SCRIPT_DIR = Path(__file__).parent
PUBLIC_DIR = SCRIPT_DIR.parent / "public"
SEGMENTS_DIR = PUBLIC_DIR / "segments-appflow"

SEGMENTS = [
    {
        "file": "01-hook.mp3",
        "text": "What if your care assessments... wrote themselves?",
        "voice": "nova",
    },
    {
        "file": "02-intro.mp3",
        "text": "Meet PalmCare AI — the app that turns every conversation into a complete care plan.",
        "voice": "nova",
    },
    {
        "file": "03-record.mp3",
        "text": "Just press record. Talk to your client, like you always do.",
        "voice": "nova",
    },
    {
        "file": "04-transcribe.mp3",
        "text": "AI listens to every word. Identifies each speaker. Highlights what matters.",
        "voice": "nova",
    },
    {
        "file": "05-contract.mp3",
        "text": "In seconds — a full service agreement, pricing, and care plan — ready to sign.",
        "voice": "nova",
    },
    {
        "file": "06-close.mp3",
        "text": "PalmCare AI. Record it. Transcribe it. Contract it.",
        "voice": "nova",
    },
    {
        "file": "07-palmit.mp3",
        "text": "Palm it.",
        "voice": "nova",
    },
]


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        env_path = SCRIPT_DIR.parent.parent / ".env"
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                if line.startswith("OPENAI_API_KEY="):
                    api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    SEGMENTS_DIR.mkdir(parents=True, exist_ok=True)

    for seg in SEGMENTS:
        out = SEGMENTS_DIR / seg["file"]
        if out.exists():
            print(f"  SKIP {seg['file']} (exists)")
            continue
        print(f"  GEN  {seg['file']}: \"{seg['text'][:60]}...\"")
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=seg["voice"],
            input=seg["text"],
            speed=0.95,
        )
        response.stream_to_file(str(out))
        print(f"  DONE {seg['file']}")

    print(f"\nAll {len(SEGMENTS)} segments saved to {SEGMENTS_DIR}")


if __name__ == "__main__":
    main()
