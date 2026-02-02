#!/usr/bin/env python3
"""
Generate professional sales video narration using WaveSpeed AI + ElevenLabs v3.

Usage:
    python scripts/generate_sales_narration.py --voice Alice
"""

import argparse
import requests
import time
import sys
from pathlib import Path

WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_SUBMIT_ENDPOINT = "https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3"
WAVESPEED_RESULT_ENDPOINT = "https://api.wavespeed.ai/api/v3/predictions"

VOICES = ["Alice", "Aria", "Sarah", "Laura", "George", "Brian", "Daniel"]

# Professional sales narration - 16 scenes
SCENE_NARRATIONS = [
    # INTRO SECTION
    {
        "id": "01-hook",
        "text": "Running a home care agency? You're spending six hours a day on paperwork. Forty percent of your time lost to admin. Two to three days just to create a single contract. Manual assessments. Handwritten notes. Hours of typing. There has to be a better way."
    },
    {
        "id": "02-solution",
        "text": "Introducing HomeCare AI. Turn voice assessments into professional contracts. In minutes, not hours."
    },
    
    # WORKFLOW SECTION
    {
        "id": "03-workflow1",
        "text": "Step one. Record your assessment. Use your phone or any device. Speak naturally. Our AI understands care-specific terminology and identifies each speaker automatically."
    },
    {
        "id": "04-workflow2",
        "text": "Step two. AI processes everything. Automatic transcription. Speaker diarization. Billable item extraction. Service categorization. One click runs the entire pipeline."
    },
    {
        "id": "05-workflow3",
        "text": "Step three. Generate professional contracts. AI creates complete, ready-to-sign documents with services, schedules, and pricing. Export to PDF, email directly, or use your custom templates."
    },
    {
        "id": "06-results",
        "text": "The transformation is incredible. What used to take two to three days now takes fifteen minutes. That's the power of AI."
    },
    
    # FEATURES SECTION
    {
        "id": "07-dashboard",
        "text": "Your powerful dashboard shows everything at a glance. Real-time activity feed. Client and caregiver overview. Pending assessments. Quick action buttons to keep you moving."
    },
    {
        "id": "08-crm",
        "text": "Full CRM and sales pipeline built right in. Track every client from lead to active with Kanban-style boards. Complete client profiles. Caregiver matching. Care level tracking. Medical history management."
    },
    {
        "id": "09-ai",
        "text": "Advanced AI features powered by state-of-the-art technology. Voice identification recognizes your staff in every recording. Multi-speaker diarization. Automatic billing extraction. Smart contract and visit note generation."
    },
    {
        "id": "10-integrations",
        "text": "Integrates with the tools you already use. Google Calendar. Gmail. Google Drive. Stripe for payments. Monday dot com. Custom webhooks. Your workflow, supercharged."
    },
    {
        "id": "11-reports",
        "text": "Reports and billing to get paid faster. Automated timesheets. Billing reports by period. One-click CSV export for payroll. Complete client activity tracking."
    },
    {
        "id": "12-compliance",
        "text": "HIPAA compliant. Enterprise-grade security. SOC two ready. Your data is encrypted and protected."
    },
    
    # OUTRO SECTION
    {
        "id": "13-testimonial",
        "text": "HomeCare AI cut our contract generation time from hours to minutes. We've increased our client capacity by forty percent without adding staff. Sarah Martinez, Owner of Sunshine Home Care, Texas."
    },
    {
        "id": "14-pricing",
        "text": "Simple, transparent pricing. Starter at forty-nine dollars a month. Growth at ninety-nine. Pro at one ninety-nine. Plans that scale with your agency."
    },
    {
        "id": "15-cta",
        "text": "Ready to transform your agency? Join five hundred plus home care agencies saving hours every day. Start your free trial now. No credit card required."
    },
    {
        "id": "16-endcard",
        "text": "HomeCare AI. The AI-powered care assessment engine. Visit homecareai dot com."
    },
]


def generate_voiceover(text: str, voice: str, output_path: str) -> bool:
    """Generate a single voiceover using ElevenLabs v3 via WaveSpeed."""
    
    headers = {
        "Authorization": f"Bearer {WAVESPEED_API_KEY}",
        "Content-Type": "application/json"
    }
    
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
        task_id = result.get("data", {}).get("id")
        if not task_id:
            print(f"    No task ID in response: {result}")
            return False
        
        # Poll for result
        max_attempts = 30
        for attempt in range(max_attempts):
            time.sleep(2)
            
            result_url = f"{WAVESPEED_RESULT_ENDPOINT}/{task_id}/result"
            result_response = requests.get(result_url, headers=headers, timeout=30)
            result_response.raise_for_status()
            
            result_data = result_response.json()
            status = result_data.get("data", {}).get("status", "")
            
            if status == "completed":
                outputs = result_data.get("data", {}).get("outputs", [])
                if outputs:
                    audio_url = outputs[0] if isinstance(outputs, list) else outputs
                    audio_response = requests.get(audio_url, timeout=60)
                    with open(output_path, "wb") as f:
                        f.write(audio_response.content)
                    return True
                else:
                    print(f"    No outputs in completed response")
                    return False
            elif status == "failed":
                error = result_data.get("data", {}).get("error", "Unknown error")
                print(f"    Task failed: {error}")
                return False
        
        print(f"    Timeout waiting for task completion")
        return False
            
    except requests.exceptions.RequestException as e:
        print(f"    Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Generate sales video narration with ElevenLabs v3")
    parser.add_argument("--voice", "-v", default="Alice", choices=VOICES, 
                        help="ElevenLabs voice (default: Alice)")
    args = parser.parse_args()
    
    output_dir = Path(__file__).parent.parent / "public" / "segments-v2"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("HomeCare AI Sales Video - ElevenLabs v3 Narration Generator")
    print("=" * 70)
    print(f"Voice: {args.voice}")
    print(f"Scenes: {len(SCENE_NARRATIONS)}")
    print(f"Output: {output_dir}")
    print()
    
    success_count = 0
    
    for i, scene in enumerate(SCENE_NARRATIONS, 1):
        output_path = output_dir / f"{scene['id']}.mp3"
        print(f"[{i}/{len(SCENE_NARRATIONS)}] Generating {scene['id']}...")
        print(f"    Text: {scene['text'][:60]}...")
        
        if generate_voiceover(scene['text'], args.voice, str(output_path)):
            file_size = output_path.stat().st_size / 1024
            print(f"    ✓ Saved: {output_path.name} ({file_size:.1f} KB)")
            success_count += 1
        else:
            print(f"    ✗ Failed to generate")
        
        time.sleep(1)
    
    print()
    print(f"Done! Generated {success_count}/{len(SCENE_NARRATIONS)} voiceovers.")
    
    if success_count == len(SCENE_NARRATIONS):
        print()
        print("Next steps:")
        print("  1. Check audio durations: ffprobe public/segments-v2/*.mp3")
        print("  2. Preview: npm run dev → select 'SalesDemoWithAudio'")
        print("  3. Render: npx remotion render SalesDemoWithAudio out/sales-demo.mp4")


if __name__ == "__main__":
    main()
