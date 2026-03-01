#!/usr/bin/env python3
"""Generate PalmCare AI ad voiceover segments using OpenAI TTS."""

import os
import sys
from pathlib import Path
from openai import OpenAI

SEGMENTS = [
    {
        "id": "01-scene1a",
        "text": "Every client has a story worth capturing.",
    },
    {
        "id": "02-scene1b",
        "text": "A care professional. A family trusting you with someone they love.",
    },
    {
        "id": "03-scene1c",
        "text": "PalmCare AI listens — so you never miss a detail.",
    },
    {
        "id": "04-scene2a",
        "text": "Assessment complete.",
    },
    {
        "id": "05-scene2b",
        "text": "In seconds, your care plan and service agreement — ready to sign.",
    },
    {
        "id": "06-scene2c",
        "text": "No paperwork. No delays. Just care, done right.",
    },
    {
        "id": "07-brand",
        "text": "PalmCare AI.",
    },
    {
        "id": "08-tagline",
        "text": "Record it. Transcribe it. Contract it.",
    },
    {
        "id": "09-palmit",
        "text": "Palm it.",
    },
]

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "segments-palmcare"
VOICE = "nova"
MODEL = "tts-1-hd"


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for seg in SEGMENTS:
        out_path = OUTPUT_DIR / f"{seg['id']}.mp3"
        if out_path.exists():
            print(f"  [skip] {seg['id']} already exists")
            continue

        print(f"  Generating {seg['id']}: \"{seg['text'][:50]}...\"")
        response = client.audio.speech.create(
            model=MODEL,
            voice=VOICE,
            input=seg["text"],
            speed=0.92,
        )
        response.stream_to_file(str(out_path))
        print(f"  [done] {out_path.name}")

    print(f"\nAll {len(SEGMENTS)} segments saved to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
