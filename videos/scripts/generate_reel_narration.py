"""
Generate voiceover segments for PalmCare AI Instagram/Facebook Reel
Uses WaveSpeed + ElevenLabs v3 (Alice voice)

Script (45s total):
  01-hook:       "Still doing care assessments the old way?"            (~2.5s)
  02-meet:       "Meet PalmCare AI."                                    (~1.5s)
  03-clients:    "Your entire client list, organized and ready."        (~2.5s)
  04-record:     "Just press record and talk to your client."           (~2.5s)
  05-ai:         "AI captures every word, identifies each speaker."     (~3.0s)
  06-contract:   "And generates a full service agreement — instantly."  (~3.0s)
  07-features:   "Scheduling, documents, billing — all in one app."    (~3.0s)
  08-close:      "PalmCare AI. Record it. Transcribe it. Contract it." (~3.5s)
  09-palmit:     "Palm it."                                             (~1.0s)
"""

import os
import time
import json
import requests

WAVESPEED_API_KEY = os.environ.get("WAVESPEED_API_KEY", "")

SEGMENTS = [
    ("01-hook",     "Still doing care assessments the old way?"),
    ("02-meet",     "Meet PalmCare AI."),
    ("03-clients",  "Your entire client list, organized and ready."),
    ("04-record",   "Just press record and talk to your client."),
    ("05-ai",       "AI captures every word, identifies each speaker."),
    ("06-contract", "And generates a full service agreement — instantly."),
    ("07-features", "Scheduling, documents, billing — all in one app."),
    ("08-close",    "PalmCare AI. Record it. Transcribe it. Contract it."),
    ("09-palmit",   "Palm it."),
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "segments-reel")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SUBMIT_URL = "https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3"
POLL_URL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

headers = {
    "Authorization": f"Bearer {WAVESPEED_API_KEY}",
    "Content-Type": "application/json",
}

def generate_segment(name: str, text: str):
    out_path = os.path.join(OUTPUT_DIR, f"{name}.mp3")
    if os.path.exists(out_path):
        print(f"  [skip] {name} already exists")
        return out_path

    payload = {
        "text": text,
        "voice_id": "Alice",
        "similarity": 1.0,
        "stability": 0.5,
        "use_speaker_boost": True,
    }

    print(f"  [submit] {name}: {text}")
    resp = requests.post(SUBMIT_URL, json=payload, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    task_id = data.get("data", {}).get("id") or data.get("id")
    if not task_id:
        print(f"  [error] No task ID: {data}")
        return None

    for attempt in range(60):
        time.sleep(2)
        poll = requests.get(POLL_URL.format(task_id=task_id), headers=headers)
        poll.raise_for_status()
        result = poll.json()
        status = result.get("data", {}).get("status") or result.get("status", "")

        if status == "completed":
            outputs = result.get("data", {}).get("outputs") or result.get("outputs")
            audio_url = outputs[0] if outputs and len(outputs) > 0 else None
            if audio_url:
                print(f"  [done] {name} -> downloading...")
                audio_resp = requests.get(audio_url)
                with open(out_path, "wb") as f:
                    f.write(audio_resp.content)
                return out_path
            else:
                print(f"  [warn] Completed but no audio URL: {json.dumps(result, indent=2)[:500]}")
                return None

        if status in ("failed", "error", "cancelled"):
            print(f"  [fail] {name}: {result}")
            return None

        if attempt % 5 == 0:
            print(f"  [poll] {name}: {status} (attempt {attempt})")

    print(f"  [timeout] {name}")
    return None


if __name__ == "__main__":
    print("=== PalmCare AI Reel Voiceover Generation ===\n")
    results = {}
    for name, text in SEGMENTS:
        path = generate_segment(name, text)
        results[name] = path
        print()

    print("\n=== Results ===")
    for name, path in results.items():
        status = "OK" if path else "FAILED"
        print(f"  {name}: {status}")
