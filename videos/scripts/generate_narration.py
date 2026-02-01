#!/usr/bin/env python3
"""
Generate audio narration for the Homecare AI demo video using OpenAI TTS.

Usage:
    python scripts/generate_narration.py [--voice VOICE] [--speed SPEED]

Options:
    --voice     Voice choice: alloy, echo, fable, onyx, nova, shimmer (default: nova)
    --speed     Speed multiplier: 0.25 to 4.0 (default: 1.0)
    --segments  Generate individual scene segments instead of one file

Voices:
    - alloy:   Neutral, balanced
    - echo:    Male, warm
    - fable:   British, expressive
    - onyx:    Male, deep, authoritative
    - nova:    Female, professional, warm (default)
    - shimmer: Female, soft, gentle
"""

import os
import sys
import argparse
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("Installing openai package...")
    os.system(f"{sys.executable} -m pip install openai")
    from openai import OpenAI

# Scene-by-scene narration with timing targets
# Each scene has: (start_sec, end_sec, text)
SCENE_NARRATIONS = [
    # Scene 1: Intro (0-4 seconds) - 4 sec
    (0, 4, "Introducing Homecare AI. The AI-powered care assessment engine."),
    
    # Scene 2: Core Features (4-9 seconds) - 5 sec
    (4, 9, "Upload recordings. AI transcribes with speaker identification. Then generates contracts automatically."),
    
    # Scene 3: Pipeline (9-15 seconds) - 6 sec
    (9, 15, "Three simple steps. Transcribe. Bill. Contract. What took hours now takes minutes."),
    
    # Scene 4: Assessments (15-21 seconds) - 6 sec
    (15, 21, "Your command center. Track every assessment with color-coded status badges and instant search."),
    
    # Scene 5: Visit Detail (21-27 seconds) - 6 sec
    (21, 27, "Watch AI process recordings in real-time. One click runs the entire pipeline."),
    
    # Scene 6: Contract Preview (27-33 seconds) - 6 sec
    (27, 33, "AI-generated contracts. Human-approved. Edit, regenerate, or export to PDF."),
    
    # Scene 7: Clients (33-39 seconds) - 6 sec
    (33, 39, "Complete client profiles. Care levels. Medical history. Emergency contacts. All in one place."),
    
    # Scene 8: Reports (39-45 seconds) - 6 sec
    (39, 45, "Generate reports for payroll and billing. Export to CSV with one click."),
    
    # Scene 9: CTA (45-50 seconds) - 5 sec
    (45, 50, "Ready to save hours on every assessment? Start your free trial today."),
]

# Full narration (combined, for single-file generation)
FULL_NARRATION = """Introducing Homecare AI. The AI-powered care assessment engine.

Upload recordings. AI transcribes with speaker identification. Then generates contracts automatically.

Three simple steps. Transcribe. Bill. Contract. What took hours now takes minutes.

Your command center. Track every assessment with color-coded status badges and instant search.

Watch AI process recordings in real-time. One click runs the entire pipeline.

AI-generated contracts. Human-approved. Edit, regenerate, or export to PDF.

Complete client profiles. Care levels. Medical history. Emergency contacts. All in one place.

Generate reports for payroll and billing. Export to CSV with one click.

Ready to save hours on every assessment? Start your free trial today."""


def get_client():
    """Get OpenAI client with API key."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or api_key == "your-openai-api-key-here":
        print("Error: OPENAI_API_KEY not set or invalid.")
        print("\nTo set it, run:")
        print("  export OPENAI_API_KEY='your-actual-api-key'")
        sys.exit(1)
    return OpenAI(api_key=api_key)


def generate_single_file(client, voice: str, speed: float, output_dir: Path):
    """Generate a single narration file."""
    output_path = output_dir / "demo-narration.mp3"
    
    print(f"Generating single narration file...")
    print(f"  Voice: {voice}")
    print(f"  Speed: {speed}x")
    print(f"  Output: {output_path}")
    print()
    
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=FULL_NARRATION.strip(),
        speed=speed,
    )
    
    with open(output_path, "wb") as f:
        for chunk in response.iter_bytes():
            f.write(chunk)
    
    print(f"✓ Audio saved: {output_path}")
    print(f"✓ File size: {output_path.stat().st_size / 1024:.1f} KB")
    return output_path


def generate_segments(client, voice: str, speed: float, output_dir: Path):
    """Generate individual audio segments for each scene."""
    segments_dir = output_dir / "segments"
    segments_dir.mkdir(exist_ok=True)
    
    print(f"Generating {len(SCENE_NARRATIONS)} scene segments...")
    print(f"  Voice: {voice}")
    print(f"  Speed: {speed}x")
    print(f"  Output: {segments_dir}/")
    print()
    
    for i, (start, end, text) in enumerate(SCENE_NARRATIONS, 1):
        output_path = segments_dir / f"scene-{i:02d}.mp3"
        print(f"  [{i}/9] Scene {i} ({start}-{end}s): {text[:40]}...")
        
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice=voice,
            input=text,
            speed=speed,
        )
        
        with open(output_path, "wb") as f:
            for chunk in response.iter_bytes():
                f.write(chunk)
    
    print()
    print(f"✓ All segments saved to: {segments_dir}/")
    return segments_dir


def main():
    parser = argparse.ArgumentParser(description="Generate demo video narration")
    parser.add_argument("--voice", choices=["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
                        default="nova", help="Voice to use (default: nova)")
    parser.add_argument("--speed", type=float, default=1.0,
                        help="Speed multiplier 0.25-4.0 (default: 1.0)")
    parser.add_argument("--segments", action="store_true",
                        help="Generate individual scene segments")
    args = parser.parse_args()
    
    # Validate speed
    if not 0.25 <= args.speed <= 4.0:
        print("Error: Speed must be between 0.25 and 4.0")
        sys.exit(1)
    
    client = get_client()
    output_dir = Path(__file__).parent.parent / "public"
    
    print("=" * 60)
    print("Homecare AI Demo Video - Narration Generator")
    print("=" * 60)
    print()
    
    if args.segments:
        generate_segments(client, args.voice, args.speed, output_dir)
    else:
        generate_single_file(client, args.voice, args.speed, output_dir)
    
    print()
    print("Next steps:")
    print("  1. Preview: cd videos && npm run dev")
    print("  2. Select 'DemoVideoWithAudio' composition")
    print("  3. Render: npx remotion render DemoVideoWithAudio out/demo.mp4")


if __name__ == "__main__":
    main()
