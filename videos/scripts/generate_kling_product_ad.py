#!/usr/bin/env python3
"""
Generate Kling V3 Pro clips for the PalmCare AI Product Ad.
8 cinematic clips covering the full care journey.
"""

import os
import sys
import json
import time
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PUBLIC_DIR = SCRIPT_DIR.parent / "public"
KLING_DIR = PUBLIC_DIR / "kling-product-ad"
QUEUE_URL = "https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video"

CLIPS = [
    {
        "id": "01_sunrise_home",
        "file": "01_sunrise_home.mp4",
        "prompt": (
            "Cinematic aerial drone shot slowly descending toward a beautiful "
            "suburban home at golden hour sunrise. Warm amber light bathes the "
            "front porch and landscaped yard. A home care vehicle is parked in "
            "the driveway. Volumetric light rays, shallow depth of field, "
            "professional color grading, 4K cinematic quality, no artifacts."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "02_nurse_walks_in",
        "file": "02_nurse_walks_in.mp4",
        "prompt": (
            "A confident Black female home care nurse in clean scrubs with a "
            "subtle teal lanyard walks through the front door of a warm, "
            "well-lit home. She carries a modern smartphone and smiles warmly. "
            "Camera tracks her from behind as she enters. Soft natural morning "
            "light flooding through windows, cinematic shallow depth of field, "
            "warm tones, professional commercial style, no blur or distortion."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "03_greeting_client",
        "file": "03_greeting_client.mp4",
        "prompt": (
            "Medium shot of a friendly home care nurse greeting an elderly "
            "woman sitting in a comfortable armchair in a bright living room. "
            "The nurse kneels slightly to make eye contact, holding the "
            "elderly woman's hand gently. Warm golden light from a nearby "
            "window, compassionate and heartfelt mood, slow subtle push-in "
            "camera, cinematic bokeh background, no artifacts."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "04_recording_assessment",
        "file": "04_recording_assessment.mp4",
        "prompt": (
            "Over-the-shoulder shot of a home care professional holding an "
            "iPhone with a glowing teal interface, recording a conversation "
            "with an elderly client seated across from her. The phone screen "
            "shows audio waveforms. Bright airy living room, soft natural "
            "light, slight rack focus from phone to client's face, cinematic "
            "depth of field, warm professional atmosphere, no distortion."
        ),
        "duration": "6",
        "aspect_ratio": "16:9",
    },
    {
        "id": "05_ai_processing",
        "file": "05_ai_processing.mp4",
        "prompt": (
            "Extreme close-up of a modern iPhone screen showing flowing text "
            "and glowing teal data visualization lines animating across the "
            "display, suggesting AI processing medical notes. The phone is "
            "held by professional hands. Dark background with the screen as "
            "the main light source, teal and white color palette, subtle lens "
            "flare, cinematic macro shot, ultra sharp details, no blur."
        ),
        "duration": "4",
        "aspect_ratio": "16:9",
    },
    {
        "id": "06_showing_contract",
        "file": "06_showing_contract.mp4",
        "prompt": (
            "A home care coordinator sits at a kitchen table showing a tablet "
            "screen to an elderly client's adult daughter. Both are smiling "
            "and nodding in agreement. A signed care document is visible on "
            "the table. Warm overhead kitchen lighting, teal accent on the "
            "coordinator's badge, slow gentle dolly around the table, "
            "cinematic realistic style, hopeful mood, no artifacts."
        ),
        "duration": "6",
        "aspect_ratio": "16:9",
    },
    {
        "id": "07_family_relief",
        "file": "07_family_relief.mp4",
        "prompt": (
            "Close-up emotional shot of an adult daughter hugging her elderly "
            "mother with tears of relief and gratitude, while a home care "
            "nurse stands slightly behind them smiling warmly. Soft golden "
            "backlight creating a halo effect, cinematic shallow depth of "
            "field, warm color grading, gentle slow-motion effect, deeply "
            "emotional and heartfelt, no distortion."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "08_palm_it_hero",
        "file": "08_palm_it_hero.mp4",
        "prompt": (
            "Dramatic hero shot of a confident home care professional standing "
            "tall in a doorway, silhouetted against warm golden light. She "
            "holds her phone confidently at her side. Camera slowly pushes in "
            "as light flares around her figure. Cinematic widescreen framing, "
            "golden hour backlight, empowering and heroic mood, teal accent "
            "light hitting one side of her face, professional commercial "
            "quality, no blur or artifacts."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
]


def load_fal_key():
    key = os.environ.get("FAL_KEY")
    if key:
        return key
    env_path = SCRIPT_DIR.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("FAL_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def api_request(url, fal_key, method="GET", data=None):
    headers = {
        "Authorization": f"Key {fal_key}",
        "Content-Type": "application/json",
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def submit_clip(clip_def, fal_key):
    print(f"\n  Submitting: {clip_def['id']}")
    payload = {
        "prompt": clip_def["prompt"],
        "duration": clip_def["duration"],
        "aspect_ratio": clip_def["aspect_ratio"],
    }
    result = api_request(QUEUE_URL, fal_key, method="POST", data=payload)
    req_id = result.get("request_id")
    print(f"  Queued: {req_id}")
    return req_id, result.get("status_url"), result.get("response_url")


def poll_until_done(status_url, response_url, fal_key, clip_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        try:
            status = api_request(status_url, fal_key)
        except Exception:
            time.sleep(5)
            continue
        state = status.get("status", "UNKNOWN")
        if state == "COMPLETED":
            result = api_request(response_url, fal_key)
            return result
        elif state in ("FAILED", "CANCELLED"):
            print(f"  {clip_id}: {state}")
            return None
        else:
            elapsed = int(time.time() - start)
            print(f"  {clip_id}: {state} [{elapsed}s]")
            time.sleep(10)
    print(f"  {clip_id}: TIMEOUT")
    return None


def download_video(url, dest):
    urllib.request.urlretrieve(url, str(dest))
    size_mb = dest.stat().st_size / (1024 * 1024)
    print(f"  Downloaded {dest.name} ({size_mb:.1f} MB)")


def main():
    fal_key = load_fal_key()
    if not fal_key:
        print("ERROR: FAL_KEY not found in .env")
        sys.exit(1)

    KLING_DIR.mkdir(parents=True, exist_ok=True)

    # Submit all clips
    jobs = []
    for clip in CLIPS:
        out = KLING_DIR / clip["file"]
        if out.exists():
            print(f"  SKIP {clip['file']} (exists)")
            continue
        try:
            req_id, status_url, resp_url = submit_clip(clip, fal_key)
            jobs.append((clip, req_id, status_url, resp_url))
        except Exception as e:
            print(f"  FAILED to submit {clip['id']}: {e}")

    if not jobs:
        print("\nAll clips exist. Done.")
        return

    print(f"\n{'='*50}")
    print(f"Generating {len(jobs)} clips... (2-5 min each)")
    print(f"{'='*50}")

    results = {}
    for clip, req_id, status_url, resp_url in jobs:
        result = poll_until_done(status_url, resp_url, fal_key, clip["id"])
        if result:
            video_url = result.get("video", {}).get("url")
            if video_url:
                out = KLING_DIR / clip["file"]
                download_video(video_url, out)
                results[clip["id"]] = str(out)
            else:
                results[clip["id"]] = None
        else:
            results[clip["id"]] = None

    ok = sum(1 for v in results.values() if v)
    print(f"\n{'='*50}")
    print(f"DONE: {ok}/{len(results)} clips generated")
    for cid, path in results.items():
        print(f"  [{'OK' if path else 'FAIL'}] {cid}")

    manifest = KLING_DIR / "manifest.json"
    manifest.write_text(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
