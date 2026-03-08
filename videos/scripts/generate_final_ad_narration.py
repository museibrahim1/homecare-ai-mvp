#!/usr/bin/env python3
"""Generate voiceover for the final PalmCare AI product ad — user's brand script."""

import os
import sys
from pathlib import Path
from openai import OpenAI

SCRIPT_DIR = Path(__file__).parent
SEGMENTS_DIR = SCRIPT_DIR.parent / "public" / "segments-final-ad"

SEGMENTS = [
    {
        "file": "01-story.mp3",
        "text": "Every client has a story worth capturing.",
        "voice": "nova",
        "speed": 0.90,
    },
    {
        "file": "02-trust.mp3",
        "text": "A care professional. A family trusting you with someone they love.",
        "voice": "nova",
        "speed": 0.88,
    },
    {
        "file": "03-listens.mp3",
        "text": "PalmCare AI listens — so you never miss a detail.",
        "voice": "nova",
        "speed": 0.90,
    },
    {
        "file": "04-complete.mp3",
        "text": "Assessment complete.",
        "voice": "nova",
        "speed": 0.85,
    },
    {
        "file": "05-seconds.mp3",
        "text": "In seconds, your care plan and service agreement — ready to sign.",
        "voice": "nova",
        "speed": 0.88,
    },
    {
        "file": "06-nodelay.mp3",
        "text": "No paperwork. No delays. Just care, done right.",
        "voice": "nova",
        "speed": 0.90,
    },
    {
        "file": "07-brand.mp3",
        "text": "PalmCare AI.",
        "voice": "nova",
        "speed": 0.85,
    },
    {
        "file": "08-tagline.mp3",
        "text": "Record it. Transcribe it. Contract it.",
        "voice": "nova",
        "speed": 0.88,
    },
    {
        "file": "09-palmit.mp3",
        "text": "Palm it.",
        "voice": "nova",
        "speed": 0.82,
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
        print(f"  GEN  {seg['file']}: \"{seg['text']}\"")
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=seg["voice"],
            input=seg["text"],
            speed=seg["speed"],
        )
        response.stream_to_file(str(out))
        print(f"  DONE {seg['file']}")

    print(f"\nAll {len(SEGMENTS)} segments ready in {SEGMENTS_DIR}")


if __name__ == "__main__":
    main()
