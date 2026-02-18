#!/usr/bin/env python3
"""
Generate ElevenLabs v3 voiceovers for 45-second Ad Video via WaveSpeed API.
Punchy ad format: Problem → Solution → CTA
"""

import os
import time
import requests

# WaveSpeed API configuration
WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_SUBMIT_ENDPOINT = "https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3"
WAVESPEED_RESULT_ENDPOINT = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "segments-ad")

# Narration script - 45 seconds total, 6 segments
# Each segment is timed to match scene durations exactly
NARRATION_SEGMENTS = {
    # Scene 1: Pain Hook (7s) — grab attention immediately
    "01-pain": """Still writing care contracts by hand? You're wasting hours every single day.""",

    # Scene 2: The Problem (7s) — amplify the pain
    "02-problem": """Hours of paperwork. Missed billable items. Error-prone contracts. Revenue slipping through the cracks.""",

    # Scene 3: The Solution (8s) — introduce the product
    "03-solution": """Meet HomeCare AI. The first healthcare CRM that turns conversations into contracts — automatically.""",

    # Scene 4: How It Works (10s) — show simplicity
    "04-how": """Record your assessment. AI transcribes, extracts billing codes, and generates a ready-to-sign contract. Three steps. Done.""",

    # Scene 5: Proof & Stats (6s) — social proof
    "05-stats": """Six hours to six minutes. One hundred percent of billables captured. Zero manual entry.""",

    # Scene 6: CTA (7s) — close the deal
    "06-cta": """Start your free trial today. No credit card required. HomeCare AI — where care meets automation.""",
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
    print("Generating Ad Video Narration (45 seconds)")
    print("Voice: Alice (ElevenLabs v3 via WaveSpeed)")
    print("=" * 60)

    for segment_name, text in NARRATION_SEGMENTS.items():
        output_path = os.path.join(OUTPUT_DIR, f"{segment_name}.mp3")
        print(f"\n[{segment_name}]")
        print(f"  Text: {text[:80]}...")

        # Submit task
        print("  Submitting to WaveSpeed...")
        task_id = submit_task(text)
        print(f"  Task ID: {task_id}")

        # Poll for result
        print("  Waiting for completion...")
        audio_url = poll_for_result(task_id)

        if audio_url:
            print(f"  Downloading audio...")
            download_audio(audio_url, output_path)
            print(f"  Saved: {output_path}")
        else:
            print(f"  ERROR: No audio URL returned")

    print("\n" + "=" * 60)
    print("All 6 ad segments generated!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)
    print("\nTo preview: cd videos && npm run dev")
    print("Select 'AdVideoWithAudio' composition in Remotion Studio")

if __name__ == "__main__":
    main()
