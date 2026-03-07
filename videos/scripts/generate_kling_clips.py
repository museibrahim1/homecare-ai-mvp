#!/usr/bin/env python3
"""
Generate cinematic lifestyle clips via Kling V3 Pro (fal.ai)
for the PalmCare AI AppFlow ad.

Uses direct REST API calls instead of fal_client library.
Requires: FAL_KEY environment variable
"""

import os
import sys
import json
import time
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PUBLIC_DIR = SCRIPT_DIR.parent / "public"
KLING_DIR = PUBLIC_DIR / "kling-clips"

QUEUE_URL = "https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video"

CLIPS = [
    {
        "id": "scene_hook",
        "file": "hook_caregiver_arriving.mp4",
        "prompt": (
            "A warm and professional home care nurse walks up to the front door "
            "of a sunlit suburban home, carrying a tablet. Morning golden hour "
            "lighting, shallow depth of field, slow cinematic push-in camera, "
            "realistic professional medical uniform with subtle teal accents, "
            "welcoming atmosphere, 4K cinematic quality, no blur or artifacts."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "scene_record",
        "file": "record_hands_phone.mp4",
        "prompt": (
            "Close-up of professional hands holding a modern iPhone in a bright "
            "living room, the person taps a teal record button on the screen. "
            "Soft natural light from a nearby window, bokeh background showing "
            "a cozy home interior, slow gentle camera tilt, cinematic realistic "
            "style, clean details, no distortion."
        ),
        "duration": "5",
        "aspect_ratio": "16:9",
    },
    {
        "id": "scene_client",
        "file": "caregiver_with_client.mp4",
        "prompt": (
            "A caring home health aide sitting beside an elderly woman on a "
            "comfortable couch in a warm living room, both smiling naturally. "
            "The aide holds a phone to the side while focusing on the client. "
            "Soft morning light, warm color palette with subtle teal accents "
            "in the aide's lanyard, slow push-in camera, cinematic realistic "
            "style, gentle and compassionate mood, no artifacts."
        ),
        "duration": "6",
        "aspect_ratio": "16:9",
    },
    {
        "id": "scene_success",
        "file": "success_handshake.mp4",
        "prompt": (
            "A satisfied home care coordinator and an elderly client's family "
            "member shake hands warmly in a bright modern kitchen. A signed "
            "document sits on the table between them. Warm natural lighting, "
            "celebratory but professional mood, slow dolly out camera, "
            "cinematic realistic style, teal accent on the coordinator's "
            "badge, clean details, no blur."
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
    print(f"\n{'='*60}")
    print(f"Submitting: {clip_def['id']} -> {clip_def['file']}")
    print(f"Prompt: {clip_def['prompt'][:80]}...")
    print(f"Duration: {clip_def['duration']}s | Aspect: {clip_def['aspect_ratio']}")

    payload = {
        "prompt": clip_def["prompt"],
        "duration": clip_def["duration"],
        "aspect_ratio": clip_def["aspect_ratio"],
    }
    result = api_request(QUEUE_URL, fal_key, method="POST", data=payload)
    request_id = result.get("request_id")
    status_url = result.get("status_url")
    print(f"  Queued: {request_id}")
    return request_id, status_url, result.get("response_url")


def poll_until_done(status_url, response_url, fal_key, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        try:
            status = api_request(status_url, fal_key)
        except Exception as e:
            print(f"  Poll error: {e}, retrying...")
            time.sleep(5)
            continue

        state = status.get("status", "UNKNOWN")
        if state == "COMPLETED":
            print(f"  Completed! Fetching result...")
            result = api_request(response_url, fal_key)
            return result
        elif state in ("FAILED", "CANCELLED"):
            print(f"  {state}: {status}")
            return None
        else:
            queue_pos = status.get("queue_position", "?")
            elapsed = int(time.time() - start)
            print(f"  [{elapsed}s] Status: {state} | Queue position: {queue_pos}")
            time.sleep(10)

    print(f"  TIMEOUT after {timeout}s")
    return None


def download_video(url, dest):
    print(f"  Downloading to {dest.name}...")
    urllib.request.urlretrieve(url, str(dest))
    size_mb = dest.stat().st_size / (1024 * 1024)
    print(f"  Saved ({size_mb:.1f} MB)")


def main():
    fal_key = load_fal_key()
    if not fal_key:
        print("ERROR: FAL_KEY not found.")
        print("Get one at https://fal.ai/dashboard/keys")
        print("Then add to .env:  FAL_KEY=your_key_here")
        sys.exit(1)

    KLING_DIR.mkdir(parents=True, exist_ok=True)

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
            print(f"  SUBMIT FAILED: {e}")

    if not jobs:
        print("\nAll clips already exist or no jobs submitted.")
        return

    print(f"\n{'='*60}")
    print(f"Waiting for {len(jobs)} clips to generate...")
    print("(Kling Pro typically takes 2-5 minutes per clip)")

    results = {}
    for clip, req_id, status_url, resp_url in jobs:
        print(f"\n--- Polling: {clip['id']} ({req_id}) ---")
        result = poll_until_done(status_url, resp_url, fal_key)
        if result:
            video_url = result.get("video", {}).get("url")
            if video_url:
                out = KLING_DIR / clip["file"]
                download_video(video_url, out)
                results[clip["id"]] = str(out)
            else:
                print(f"  No video URL in result: {json.dumps(result)[:200]}")
                results[clip["id"]] = None
        else:
            results[clip["id"]] = None

    print(f"\n{'='*60}")
    print("RESULTS:")
    for cid, path in results.items():
        status = "OK" if path else "FAILED"
        print(f"  [{status}] {cid}: {path}")

    manifest = KLING_DIR / "manifest.json"
    manifest.write_text(json.dumps(results, indent=2))
    print(f"\nManifest: {manifest}")


if __name__ == "__main__":
    main()
