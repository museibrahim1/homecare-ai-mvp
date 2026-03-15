#!/usr/bin/env python3
"""Generate Nano Banana 2 polished iPhone mockup images for Reel ad."""
import os
import sys
import time
import requests

WAVESPEED_API_KEY = os.environ.get("WAVESPEED_API_KEY", "")
if not WAVESPEED_API_KEY:
    print("ERROR: WAVESPEED_API_KEY not set")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {WAVESPEED_API_KEY}",
    "Content-Type": "application/json",
}
SUBMIT_URL = "https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image"
POLL_URL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "nano-reel")
os.makedirs(OUTPUT_DIR, exist_ok=True)

IMAGES = [
    {
        "name": "iphone_recording_hero",
        "prompt": "Photorealistic iPhone 15 Pro in Space Black floating at a slight 3D angle against a dark gradient background with subtle teal (#0d9488) ambient glow. Screen displays a modern healthcare app recording interface with teal waveform audio visualization, white text showing 'Recording Assessment', timer showing 02:45, speaker indicators. Premium tech product photography style, dramatic studio lighting with rim light, reflection on glossy surface below, 4K detail.",
        "resolution": "2k",
        "aspect_ratio": "9:16",
    },
    {
        "name": "iphone_contract_hero",
        "prompt": "Photorealistic iPhone 15 Pro in Space Black floating at a slight 3D angle against a dark gradient background with subtle teal (#0d9488) ambient glow. Screen displays a professional AI-generated care service agreement document with clean typography, teal accent headers, client details, service breakdown table, signature line at bottom. Premium tech product photography style, dramatic studio lighting, soft reflection below phone, 4K detail.",
        "resolution": "2k",
        "aspect_ratio": "9:16",
    },
    {
        "name": "iphone_dashboard_hero",
        "prompt": "Photorealistic iPhone 15 Pro in Space Black floating at a dramatic 3D perspective angle against a rich dark gradient background with vibrant teal (#0d9488) and cyan light trails. Screen displays a modern healthcare dashboard app with teal navigation bar, client cards with avatars, statistics widgets showing numbers, clean modern UI design. Premium Apple-style product shot, volumetric studio lighting, glass-like reflection, 4K detail.",
        "resolution": "2k",
        "aspect_ratio": "9:16",
    },
    {
        "name": "iphone_transcript_hero",
        "prompt": "Photorealistic iPhone 15 Pro in Space Black floating against deep dark background with soft teal (#0d9488) backlight glow. Screen shows a live AI transcription interface with color-coded speaker labels (Speaker 1 in teal, Speaker 2 in blue), timestamped conversation text flowing down the screen, AI analysis badges at bottom showing 'Extracting billables...' with loading indicator. Premium product photography, cinematic lighting, 4K.",
        "resolution": "2k",
        "aspect_ratio": "9:16",
    },
]


def generate_image(name, prompt, resolution, aspect_ratio):
    out_path = os.path.join(OUTPUT_DIR, f"{name}.png")
    if os.path.exists(out_path):
        print(f"  [skip] {name} exists")
        return out_path

    payload = {
        "prompt": prompt,
        "resolution": resolution,
        "aspect_ratio": aspect_ratio,
    }
    print(f"  [submit] {name}")
    resp = requests.post(SUBMIT_URL, json=payload, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()
    task_id = data.get("data", {}).get("id") or data.get("id")

    for attempt in range(60):
        time.sleep(3)
        poll = requests.get(POLL_URL.format(task_id=task_id), headers=HEADERS)
        poll.raise_for_status()
        result = poll.json()
        status = result.get("data", {}).get("status") or result.get("status", "")

        if status == "completed":
            outputs = result.get("data", {}).get("outputs") or result.get("outputs")
            if outputs and len(outputs) > 0:
                img_url = outputs[0]
                print(f"  [done] {name} -> downloading...")
                img_resp = requests.get(img_url)
                with open(out_path, "wb") as f:
                    f.write(img_resp.content)
                return out_path
            return None
        if status in ("failed", "error"):
            print(f"  [fail] {name}: {result}")
            return None
        if attempt % 5 == 0:
            print(f"  [poll] {name}: {status} ({attempt})")

    return None


if __name__ == "__main__":
    print("=== Generating Nano Banana iPhone Mockups ===\n")
    for img in IMAGES:
        path = generate_image(img["name"], img["prompt"], img["resolution"], img["aspect_ratio"])
        status = "OK" if path else "FAILED"
        print(f"  {img['name']}: {status}\n")
    print("=== Done ===")
