#!/usr/bin/env python3
"""
Generate voiceovers using WaveSpeed AI + ElevenLabs v3.

Usage:
    python scripts/generate_elevenlabs_narration.py --voice Rachel

Voices: Rachel, Domi, Bella, Antoni, Josh, Arnold, Adam, Sam
"""

import argparse
import requests
import time
import sys
from pathlib import Path

WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_SUBMIT_ENDPOINT = "https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3"
WAVESPEED_RESULT_ENDPOINT = "https://api.wavespeed.ai/api/v3/predictions"

VOICES = ["Alice", "Aria", "Roger", "Sarah", "Laura", "Charlie", "George", "Callum", "River", "Liam", "Charlotte", "Matilda", "Will", "Jessica", "Eric", "Chris", "Brian", "Daniel", "Lily", "Bill"]

# Scene narrations for the demo video (12 scenes)
SCENE_NARRATIONS = [
    # Scene 1: Intro
    "Introducing Homecare AI. The AI-powered care assessment engine.",
    
    # Scene 2: Core Features
    "Upload recordings. AI transcribes with speaker identification. Then generates contracts automatically.",
    
    # Scene 3: AI Pipeline Steps
    "Three simple steps. Transcribe. Bill. Contract. What took hours now takes minutes.",
    
    # Scene 4: Dashboard
    "Your dashboard shows everything at a glance. Active clients, pending assessments, and recent activity.",
    
    # Scene 5: Assessments
    "Track every assessment with color-coded status badges. Search, filter, and manage with ease.",
    
    # Scene 6: Visit Detail
    "Watch AI process recordings in real-time. One click runs the entire pipeline.",
    
    # Scene 7: Contract Preview
    "AI-generated contracts. Human-approved. Edit, regenerate, or export to PDF.",
    
    # Scene 8: Clients CRM
    "Complete client profiles. Care levels. Medical history. Emergency contacts. All in one place.",
    
    # Scene 9: Pipeline Board
    "Your sales pipeline visualized. Track clients from intake to active. Drag and drop to update status.",
    
    # Scene 10: Voice ID
    "Voice identification technology. Staff record once, AI recognizes them in every recording.",
    
    # Scene 11: Reports
    "Generate reports for payroll and billing. Export to CSV with one click.",
    
    # Scene 12: CTA
    "Ready to save hours on every assessment? Start your free trial today.",
]


def generate_voiceover(text: str, voice: str, output_path: str) -> bool:
    """Generate a single voiceover using ElevenLabs v3 via WaveSpeed."""
    
    headers = {
        "Authorization": f"Bearer {WAVESPEED_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Submit the task
    payload = {
        "text": text,
        "voice_id": voice,
        "similarity": 1.0,
        "stability": 0.5,
        "use_speaker_boost": True
    }
    
    try:
        # Submit task
        response = requests.post(WAVESPEED_SUBMIT_ENDPOINT, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        
        # Get task ID
        task_id = result.get("data", {}).get("id")
        if not task_id:
            print(f"    No task ID in response: {result}")
            return False
        
        # Step 2: Poll for result
        max_attempts = 30
        for attempt in range(max_attempts):
            time.sleep(2)  # Wait 2 seconds between polls
            
            result_url = f"{WAVESPEED_RESULT_ENDPOINT}/{task_id}/result"
            result_response = requests.get(result_url, headers=headers, timeout=30)
            result_response.raise_for_status()
            
            result_data = result_response.json()
            status = result_data.get("data", {}).get("status", "")
            
            if status == "completed":
                # Get audio URL from outputs
                outputs = result_data.get("data", {}).get("outputs", [])
                if outputs:
                    audio_url = outputs[0] if isinstance(outputs, list) else outputs
                    audio_response = requests.get(audio_url, timeout=60)
                    with open(output_path, "wb") as f:
                        f.write(audio_response.content)
                    return True
                else:
                    print(f"    No outputs in completed response: {result_data}")
                    return False
            elif status == "failed":
                error = result_data.get("data", {}).get("error", "Unknown error")
                print(f"    Task failed: {error}")
                return False
            # else: still processing, continue polling
        
        print(f"    Timeout waiting for task completion")
        return False
            
    except requests.exceptions.RequestException as e:
        print(f"    Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate demo video narration with ElevenLabs v3")
    parser.add_argument("--voice", "-v", default="Rachel", choices=VOICES, 
                        help="ElevenLabs voice (default: Rachel)")
    args = parser.parse_args()
    
    output_dir = Path(__file__).parent.parent / "public" / "segments"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Homecare AI Demo Video - ElevenLabs v3 Narration Generator")
    print("=" * 60)
    print(f"Voice: {args.voice}")
    print(f"Scenes: {len(SCENE_NARRATIONS)}")
    print(f"Output: {output_dir}")
    print()
    
    success_count = 0
    
    for i, text in enumerate(SCENE_NARRATIONS, 1):
        output_path = output_dir / f"scene-{i:02d}.mp3"
        print(f"[{i}/{len(SCENE_NARRATIONS)}] Generating scene {i}...")
        print(f"    Text: {text[:50]}...")
        
        if generate_voiceover(text, args.voice, str(output_path)):
            file_size = output_path.stat().st_size / 1024
            print(f"    ✓ Saved: {output_path.name} ({file_size:.1f} KB)")
            success_count += 1
        else:
            print(f"    ✗ Failed to generate")
        
        # Small delay between requests
        time.sleep(1)
    
    print()
    print(f"Done! Generated {success_count}/{len(SCENE_NARRATIONS)} voiceovers.")
    
    if success_count == len(SCENE_NARRATIONS):
        print()
        print("Next steps:")
        print("  1. Preview: cd videos && npm run dev")
        print("  2. Select 'DemoVideoWithAudio' composition")
        print("  3. Render: npx remotion render DemoVideoWithAudio out/demo.mp4")


if __name__ == "__main__":
    main()
