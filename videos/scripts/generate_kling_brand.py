#!/usr/bin/env python3
"""Generate PalmCare AI brand-themed Kling clips — palm trees, outdoor, assessment scenes."""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "kling-brand"

env_path = SCRIPT_DIR.parent.parent / ".env"
FAL_KEY = None
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("FAL_KEY="):
            FAL_KEY = line.split("=", 1)[1].strip().strip('"').strip("'")
            break
if not FAL_KEY:
    print("ERROR: FAL_KEY not found in .env")
    sys.exit(1)

QUEUE_URL = "https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video"
HEADERS = {
    "Authorization": f"Key {FAL_KEY}",
    "Content-Type": "application/json",
}

CLIPS = [
    {
        "file": "01_palm_trees_establishing.mp4",
        "prompt": (
            "Cinematic establishing shot, slow dolly forward. Lush tropical setting with tall "
            "coconut palm trees swaying gently in warm breeze. Modern single-story home care "
            "facility exterior with clean white walls and teal-colored accents on the door frame "
            "and signage. Golden hour sunlight filtering through palm fronds casting dappled shadows "
            "on a stone walkway. Warm, inviting, professional. Shot on Arri Alexa, shallow depth of "
            "field, anamorphic lens flare."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "file": "02_greeting_outdoor.mp4",
        "prompt": (
            "Medium shot, outdoor covered patio with palm trees visible in background. A professional "
            "Black female home care assessor in her 30s wearing a teal polo shirt and carrying a tablet "
            "warmly greets an elderly Hispanic woman sitting in a comfortable wicker chair. Bright "
            "natural daylight, tropical garden visible behind them with frangipani flowers and palm "
            "fronds. The assessor extends her hand with a genuine smile. Warm color grading, cinematic "
            "4K, shot on 50mm lens."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "file": "03_conversation_patio.mp4",
        "prompt": (
            "Two-shot, slow orbit. A home care assessor in teal polo sits across from an elderly woman "
            "at a beautiful outdoor patio table. Palm trees and tropical landscaping surround them. "
            "The assessor listens attentively, nodding, while the elderly woman talks and gestures with "
            "her hands. A smartphone lies flat on the table between them, screen facing up. Soft golden "
            "hour lighting, lens bokeh from palm fronds. Warm, intimate, professional. Cinematic shallow "
            "depth of field, subtle camera movement."
        ),
        "duration": "10",
        "aspect_ratio": "16:9",
    },
    {
        "file": "04_phone_recording.mp4",
        "prompt": (
            "Close-up shot of a woman's hands holding a modern smartphone in portrait orientation. "
            "The phone screen shows a teal-colored recording interface with audio waveform animation. "
            "Background is softly blurred outdoor patio with palm trees and warm sunlight. The screen "
            "has a subtle green recording indicator. Hands are steady, professional grip. Shot from "
            "slightly above, 35mm macro lens, beautiful bokeh, golden hour light reflecting off the "
            "phone screen edges. Cinematic, warm tones."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "file": "05_showing_contract.mp4",
        "prompt": (
            "Medium close-up. The home care assessor in teal turns her smartphone toward the elderly "
            "client, showing the screen. Both women look at the phone with positive expressions — the "
            "assessor is confident, the client looks relieved and pleased. Outdoor patio setting with "
            "tall palm trees and tropical plants softly blurred in background. Warm golden light. "
            "The phone screen faces the camera slightly. Natural, authentic interaction. Cinematic "
            "shallow depth of field, gentle handheld movement, 4K."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "file": "06_palm_sunset_hero.mp4",
        "prompt": (
            "Epic wide shot, slow upward tilt. Silhouettes of tall palm trees against a breathtaking "
            "sunset sky with teal, coral, and gold gradients. A modern home care facility is visible "
            "in the lower third, warm interior lights glowing through windows. The camera slowly tilts "
            "up from the building through the palm tree canopy to the colorful sky. Cinematic, peaceful, "
            "aspirational. Shot on anamorphic lens with natural lens flares. 4K, Arri Alexa color science."
        ),
        "duration": "10",
        "aspect_ratio": "16:9",
    },
]


def submit_clip(clip):
    body = json.dumps({
        "prompt": clip["prompt"],
        "duration": clip["duration"],
        "aspect_ratio": clip["aspect_ratio"],
    }).encode()
    req = urllib.request.Request(QUEUE_URL, data=body, headers=HEADERS, method="POST")
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read().decode())
    return data.get("request_id")


def poll_result(request_id, timeout=600):
    url = f"{QUEUE_URL}/requests/{request_id}/status"
    req = urllib.request.Request(url, headers={"Authorization": f"Key {FAL_KEY}"})
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(req)
            data = json.loads(resp.read().decode())
            status = data.get("status", "UNKNOWN")
            if status == "COMPLETED":
                resp_url = f"{QUEUE_URL}/requests/{request_id}"
                req2 = urllib.request.Request(resp_url, headers={"Authorization": f"Key {FAL_KEY}"})
                resp2 = urllib.request.urlopen(req2)
                result = json.loads(resp2.read().decode())
                video = result.get("video", {}).get("url")
                return video
            elif status in ("FAILED", "CANCELLED"):
                print(f"    FAILED: {data}")
                return None
            else:
                pct = data.get("queue_position", "?")
                print(f"    status={status} pos={pct}")
        except Exception as e:
            print(f"    poll error: {e}")
        time.sleep(15)
    print("    TIMEOUT")
    return None


def download(url, dest):
    urllib.request.urlretrieve(url, str(dest))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    request_ids = {}
    for clip in CLIPS:
        out = OUTPUT_DIR / clip["file"]
        if out.exists():
            print(f"SKIP  {clip['file']} (already exists)")
            continue
        print(f"SUBMIT {clip['file']}: {clip['prompt'][:80]}...")
        try:
            rid = submit_clip(clip)
            print(f"  → request_id: {rid}")
            request_ids[clip["file"]] = rid
        except Exception as e:
            print(f"  ERROR submitting: {e}")

    if not request_ids:
        print("\nAll clips already exist or no submissions succeeded.")
        return

    print(f"\nWaiting for {len(request_ids)} clips to render...\n")
    time.sleep(30)

    for filename, rid in request_ids.items():
        print(f"POLL  {filename} ({rid})")
        video_url = poll_result(rid)
        if video_url:
            dest = OUTPUT_DIR / filename
            print(f"  DOWNLOAD → {dest}")
            download(video_url, dest)
            print(f"  DONE  {filename}")
        else:
            print(f"  FAILED {filename}")

    print("\nGeneration complete.")
    for clip in CLIPS:
        p = OUTPUT_DIR / clip["file"]
        status = "✓" if p.exists() else "✗"
        print(f"  {status} {clip['file']}")


if __name__ == "__main__":
    main()
