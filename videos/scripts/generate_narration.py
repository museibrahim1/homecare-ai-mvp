#!/usr/bin/env python3
"""
Generate audio narration for the Homecare AI demo video using OpenAI TTS.

Usage:
    python scripts/generate_narration.py

Requires:
    - OPENAI_API_KEY environment variable set
    - pip install openai
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

# Narration script - timed to match video scenes
NARRATION_SCRIPT = """
Introducing Homecare AI — the AI-powered care assessment engine that turns intake conversations into proposal-ready contracts.

Upload audio recordings from assessments, phone calls, or visits. Our AI transcribes and identifies speakers, then automatically generates service contracts.

Our three-step pipeline takes you from audio to contract in minutes, not hours. That's an 80% reduction in documentation time.

The Assessments Dashboard is your command center. Track every assessment with color-coded status badges and quick search filtering.

Watch AI process your recordings in real-time. One click runs the entire pipeline — transcription, billing extraction, and contract generation.

Contracts are AI-generated but human-approved. Edit any section, regenerate with changes, or export directly to PDF.

Complete client profiles with care levels, medical conditions, and emergency contacts — all extracted from your conversations.

Generate reports for payroll, billing, and activity tracking. Export to CSV with one click.

Ready to save hours on every assessment? Start your free trial today.
"""

def generate_narration():
    """Generate the narration audio file."""
    
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key or api_key == "your-openai-api-key-here":
        print("Error: OPENAI_API_KEY not set or invalid.")
        print("\nTo set it, run:")
        print("  export OPENAI_API_KEY='your-actual-api-key'")
        print("\nOr add it to your .env file.")
        sys.exit(1)
    
    # Initialize client
    client = OpenAI(api_key=api_key)
    
    # Output path
    output_dir = Path(__file__).parent.parent / "public"
    output_path = output_dir / "demo-narration.mp3"
    
    print("Generating narration audio...")
    print(f"Output: {output_path}")
    print(f"Voice: nova (professional, warm)")
    print(f"Model: tts-1-hd (high quality)")
    print()
    
    try:
        # Generate speech
        response = client.audio.speech.create(
            model="tts-1-hd",  # High quality model
            voice="nova",      # Professional, warm female voice
            input=NARRATION_SCRIPT.strip(),
            speed=1.0,         # Normal speed
        )
        
        # Save to file
        response.stream_to_file(str(output_path))
        
        print(f"✓ Audio saved to: {output_path}")
        print(f"✓ File size: {output_path.stat().st_size / 1024:.1f} KB")
        print()
        print("Next steps:")
        print("  1. Preview: cd videos && npm run dev")
        print("  2. Select 'DemoVideoWithAudio' composition")
        print("  3. Render: npx remotion render DemoVideoWithAudio out/demo.mp4")
        
    except Exception as e:
        print(f"Error generating audio: {e}")
        sys.exit(1)


if __name__ == "__main__":
    generate_narration()
