#!/usr/bin/env python3
"""
Generate ElevenLabs v3 voiceovers for 90-second Quick Demo via WaveSpeed API.
Focused script: Healthcare CRM + AI Automation
"""

import os
import time
import requests

# WaveSpeed API configuration
WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_SUBMIT_ENDPOINT = "https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3"
WAVESPEED_RESULT_ENDPOINT = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "segments-v3")

# Narration script - 90 seconds total, 6 segments
NARRATION_SEGMENTS = {
    "01-hook": """Still using generic CRMs for your home care agency? Spending hours on paperwork, losing billable items, and struggling with scattered client data? There's a better way. Introducing HomeCare AI — the first healthcare-centric CRM powered by AI automation.""",
    
    "02-crm": """Built specifically for home care agencies, HomeCare AI features a Kanban pipeline that tracks clients from intake to active care. Complete client profiles with care levels, medical history, and emergency contacts — everything you need in one place.""",
    
    "03-record": """Getting started is simple. Record assessments directly in the app or upload existing audio files. Our AI understands multi-speaker conversations and healthcare terminology. Just click record and speak naturally.""",
    
    "04-ai": """Here's where the magic happens. AI automatically transcribes your recording, identifies speakers, extracts every billable item, and generates a complete, ready-to-sign contract — all in minutes instead of hours.""",
    
    "05-results": """The results speak for themselves. What used to take six hours now takes six minutes. Capture one hundred percent of billable items with zero manual data entry. AI handles everything so you can focus on what matters — caring for your clients.""",
    
    "06-cta": """Ready to transform your agency? Start your free trial today. No credit card required. Setup in minutes. HomeCare AI — where care meets automation.""",
}

def submit_task(text: str, voice_id: str = "Alice") -> str:
    """Submit a TTS task and return the task ID."""
    headers = {
        "Authorization": f"Bearer {WAVESPEED_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "voice_id": voice_id,
        "similarity": 1.0,
        "stability": 0.5,
        "use_speaker_boost": True,
    }
    
    response = requests.post(WAVESPEED_SUBMIT_ENDPOINT, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    return data.get("data", {}).get("id") or data.get("id")

def poll_for_result(task_id: str, max_attempts: int = 60) -> str:
    """Poll for task completion and return the audio URL."""
    headers = {"Authorization": f"Bearer {WAVESPEED_API_KEY}"}
    url = WAVESPEED_RESULT_ENDPOINT.format(task_id=task_id)
    
    for attempt in range(max_attempts):
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        status = data.get("data", {}).get("status") or data.get("status")
        
        if status == "completed":
            outputs = data.get("data", {}).get("outputs") or data.get("outputs")
            if outputs and len(outputs) > 0:
                return outputs[0]
            return None
        elif status == "failed":
            raise Exception(f"Task failed: {data}")
        
        print(f"  Status: {status}, waiting...")
        time.sleep(2)
    
    raise Exception("Timeout waiting for task completion")

def download_audio(url: str, output_path: str):
    """Download audio file from URL."""
    response = requests.get(url, stream=True)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=" * 60)
    print("Generating Quick Demo Narration (90 seconds)")
    print("Voice: Alice (ElevenLabs v3)")
    print("=" * 60)
    
    for segment_name, text in NARRATION_SEGMENTS.items():
        output_path = os.path.join(OUTPUT_DIR, f"{segment_name}.mp3")
        print(f"\n[{segment_name}]")
        print(f"  Text: {text[:60]}...")
        
        # Submit task
        print("  Submitting to WaveSpeed...")
        task_id = submit_task(text)
        print(f"  Task ID: {task_id}")
        
        # Poll for result
        print("  Waiting for completion...")
        audio_url = poll_for_result(task_id)
        
        if audio_url:
            # Download audio
            print(f"  Downloading audio...")
            download_audio(audio_url, output_path)
            print(f"  Saved: {output_path}")
        else:
            print(f"  ERROR: No audio URL returned")
    
    print("\n" + "=" * 60)
    print("All segments generated!")
    print("=" * 60)

if __name__ == "__main__":
    main()
