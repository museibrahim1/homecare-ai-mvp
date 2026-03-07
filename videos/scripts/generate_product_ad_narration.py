#!/usr/bin/env python3
"""Generate voiceover segments for the Product Ad using OpenAI TTS."""

import os
import sys
from pathlib import Path
from openai import OpenAI

SCRIPT_DIR = Path(__file__).parent
PUBLIC_DIR = SCRIPT_DIR.parent / "public"
SEGMENTS_DIR = PUBLIC_DIR / "segments-product-ad"

SEGMENTS = [
    {
        "file": "01-open.mp3",
        "text": "Every morning, someone's mother needs care.",
        "voice": "nova",
    },
    {
        "file": "02-problem.mp3",
        "text": "And every evening, a caregiver drowns in paperwork they shouldn't have to do.",
        "voice": "nova",
    },
    {
        "file": "03-enter.mp3",
        "text": "What if you could just... talk?",
        "voice": "nova",
    },
    {
        "file": "04-record.mp3",
        "text": "PalmCare AI records your assessment in real time. Every word. Every speaker. Every detail that matters.",
        "voice": "nova",
    },
    {
        "file": "05-transform.mp3",
        "text": "Then, in seconds, AI transforms your conversation into a complete service agreement — pricing, care plan, ready to sign.",
        "voice": "nova",
    },
    {
        "file": "06-emotion.mp3",
        "text": "So you can focus on what you actually came here to do.",
        "voice": "nova",
    },
    {
        "file": "07-care.mp3",
        "text": "Care.",
        "voice": "nova",
    },
    {
        "file": "08-tagline.mp3",
        "text": "PalmCare AI. Just palm it.",
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
            print(f"  SKIP {seg['file']}")
            continue
        print(f"  GEN  {seg['file']}: \"{seg['text'][:50]}...\"")
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=seg["voice"],
            input=seg["text"],
            speed=0.92,
        )
        response.stream_to_file(str(out))
        print(f"  DONE {seg['file']}")

    print(f"\nAll {len(SEGMENTS)} segments saved to {SEGMENTS_DIR}")


if __name__ == "__main__":
    main()
