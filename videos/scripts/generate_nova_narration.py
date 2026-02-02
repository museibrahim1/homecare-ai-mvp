#!/usr/bin/env python3
"""
Generate OpenAI Nova voiceovers for 90-second Quick Demo.
Focused script: Healthcare CRM + AI Automation
"""

import os
from pathlib import Path
from openai import OpenAI

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "segments-v3"

# Narration script - 90 seconds total, 6 segments
# More energetic and punchy for Nova voice
NARRATION_SEGMENTS = {
    "01-hook": """Still using Monday, Salesforce, or HubSpot for your home care agency? These generic CRMs weren't built for healthcare. Hours on manual contracts. Missed billing opportunities. Scattered client data. There's a better way. Introducing HomeCare AI — the first healthcare-centric CRM, powered by AI automation.""",
    
    "02-crm": """Built specifically for home care, HomeCare AI features a Kanban pipeline that tracks clients from intake to active care. Complete profiles with care levels, medical history, and emergency contacts. Everything you need, designed for healthcare from day one.""",
    
    "03-record": """Getting started is simple. Hit record and speak naturally, or upload existing audio files. Our AI understands healthcare terminology and multi-speaker conversations. Just record your assessment and let AI do the heavy lifting.""",
    
    "04-ai": """Here's where the magic happens. AI automatically transcribes your recording, identifies speakers, extracts every billable item, and generates a complete, ready-to-sign contract. All in minutes instead of hours.""",
    
    "05-results": """The results? What used to take six hours now takes six minutes. Capture one hundred percent of billable items. Zero manual data entry. AI handles everything so you can focus on what matters most — caring for your clients.""",
    
    "06-cta": """Ready to transform your agency? Start your free trial today. No credit card required. Setup takes minutes. HomeCare AI — where care meets automation.""",
}

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Initialize OpenAI client
    client = OpenAI()
    
    print("=" * 60)
    print("Generating Quick Demo Narration (OpenAI Nova)")
    print("=" * 60)
    
    for segment_name, text in NARRATION_SEGMENTS.items():
        output_path = OUTPUT_DIR / f"{segment_name}.mp3"
        print(f"\n[{segment_name}]")
        print(f"  Text: {text[:60]}...")
        
        # Generate speech with Nova voice
        print("  Generating with OpenAI TTS (nova)...")
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="nova",
            input=text,
            speed=1.0,
        )
        
        # Save to file
        response.stream_to_file(str(output_path))
        print(f"  Saved: {output_path}")
    
    print("\n" + "=" * 60)
    print("All segments generated with Nova voice!")
    print("=" * 60)

if __name__ == "__main__":
    main()
