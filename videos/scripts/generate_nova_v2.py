#!/usr/bin/env python3
"""
Generate OpenAI Nova voiceovers - Updated hook without generic CRM intro.
"""

import os
from pathlib import Path
from openai import OpenAI

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "segments-v3"

# Updated narration - hook starts directly with the solution
NARRATION_SEGMENTS = {
    "01-hook": """Introducing HomeCare AI — the first healthcare-centric CRM, powered by AI automation. Turn voice assessments into contracts in minutes. Automatic billing extraction. Built specifically for home care agencies from day one.""",
    
    "02-crm": """Track clients from intake to active care with a Kanban pipeline designed for healthcare. Complete profiles with care levels, medical history, and emergency contacts. Everything your agency needs in one powerful platform.""",
    
    "03-record": """Getting started is simple. Hit record and speak naturally, or upload existing audio files. Our AI understands healthcare terminology and multi-speaker conversations. Just record your assessment and let AI handle the rest.""",
    
    "04-ai": """Here's where the magic happens. AI automatically transcribes your recording, identifies speakers, extracts every billable item, and generates a complete, ready-to-sign contract. All in minutes instead of hours.""",
    
    "05-results": """The results? What used to take six hours now takes six minutes. Capture one hundred percent of billable items. Zero manual data entry. Focus on what matters most — caring for your clients.""",
    
    "06-cta": """Ready to transform your agency? Start your free trial today. No credit card required. Setup takes minutes. HomeCare AI — where care meets automation.""",
}

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    client = OpenAI()
    
    print("=" * 60)
    print("Generating Updated Narration (OpenAI Nova)")
    print("=" * 60)
    
    for segment_name, text in NARRATION_SEGMENTS.items():
        output_path = OUTPUT_DIR / f"{segment_name}.mp3"
        print(f"\n[{segment_name}]")
        print(f"  Text: {text[:60]}...")
        print("  Generating with OpenAI TTS (nova)...")
        
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="nova",
            input=text,
            speed=1.0,
        )
        
        response.stream_to_file(str(output_path))
        print(f"  Saved: {output_path}")
    
    print("\n" + "=" * 60)
    print("All segments generated!")
    print("=" * 60)

if __name__ == "__main__":
    main()
