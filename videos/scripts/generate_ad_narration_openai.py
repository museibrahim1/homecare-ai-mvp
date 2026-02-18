#!/usr/bin/env python3
"""
Generate OpenAI TTS voiceover for the 45-second Ad Video.
Uses tts-1-hd model with nova voice.

Usage:
    export OPENAI_API_KEY='your-key'
    python scripts/generate_ad_narration_openai.py [--voice nova]
"""

import os
import sys
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("Installing openai package...")
    os.system(f"{sys.executable} -m pip install openai")
    from openai import OpenAI

SEGMENTS = {
    "01-pain": "Still writing care contracts by hand? You're wasting hours every single day.",
    "02-problem": "Hours of paperwork. Missed billable items. Error-prone contracts. Revenue slipping through the cracks.",
    "03-solution": "Meet HomeCare AI. The first healthcare CRM that turns conversations into contracts, automatically.",
    "04-how": "Record your assessment. AI transcribes, extracts billing codes, and generates a ready-to-sign contract. Three steps. Done.",
    "05-stats": "Six hours down to six minutes. One hundred percent of billables captured. Zero manual entry.",
    "06-cta": "Start your free trial today. No credit card required. HomeCare AI. Where care meets automation.",
}


def main():
    voice = "nova"
    if "--voice" in sys.argv:
        idx = sys.argv.index("--voice")
        if idx + 1 < len(sys.argv):
            voice = sys.argv[idx + 1]

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or api_key.startswith("your-"):
        print("Error: OPENAI_API_KEY not set.")
        print("  export OPENAI_API_KEY='sk-...'")
        sys.exit(1)

    client = OpenAI(api_key=api_key)
    output_dir = Path(__file__).parent.parent / "public" / "segments-ad"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 50)
    print("Ad Video Narration — OpenAI TTS (tts-1-hd)")
    print(f"Voice: {voice}")
    print("=" * 50)

    for name, text in SEGMENTS.items():
        out = output_dir / f"{name}.mp3"
        print(f"\n[{name}] {text[:60]}...")
        print("  Generating...")

        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=voice,
            input=text,
            speed=1.0,
        )

        with open(out, "wb") as f:
            for chunk in response.iter_bytes():
                f.write(chunk)

        size_kb = out.stat().st_size / 1024
        print(f"  Saved: {out} ({size_kb:.1f} KB)")

    print("\n" + "=" * 50)
    print("All 6 segments generated!")
    print(f"Output: {output_dir}")
    print("=" * 50)
    print("\nPreview: cd videos && npm run dev -> select 'AdVideoWithAudio'")
    print("Render:  npx remotion render AdVideoWithAudio output-ad.mp4")


if __name__ == "__main__":
    main()
