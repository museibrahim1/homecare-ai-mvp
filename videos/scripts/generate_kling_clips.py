#!/usr/bin/env python3
"""
Generate cinematic lifestyle clips via Kling O3 Pro (fal.ai)
for the PalmCare AI AppFlow ad.

Requires: FAL_KEY environment variable
Install:  pip install fal-client
"""

import os
import sys
import json
import time
from pathlib import Path

try:
    import fal_client
except ImportError:
    print("Install fal-client: pip install fal-client")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent
PUBLIC_DIR = SCRIPT_DIR.parent / "public"
KLING_DIR = PUBLIC_DIR / "kling-clips"

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
        "duration": 5,
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
        "duration": 5,
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
        "duration": 6,
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
        "duration": 5,
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


def generate_clip(clip_def):
    print(f"\n{'='*60}")
    print(f"Generating: {clip_def['id']} -> {clip_def['file']}")
    print(f"Prompt: {clip_def['prompt'][:80]}...")
    print(f"Duration: {clip_def['duration']}s | Aspect: {clip_def['aspect_ratio']}")

    result = fal_client.subscribe(
        "fal-ai/kling-video/o3/pro/text-to-video",
        arguments={
            "prompt": clip_def["prompt"],
            "duration": clip_def["duration"],
            "aspect_ratio": clip_def["aspect_ratio"],
        },
        with_logs=True,
    )

    video_url = result.get("video", {}).get("url")
    if not video_url:
        print(f"  ERROR: No video URL in response: {json.dumps(result, indent=2)}")
        return None

    print(f"  Video URL: {video_url}")
    return video_url


def download_video(url, dest):
    import urllib.request
    print(f"  Downloading to {dest}...")
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

    os.environ["FAL_KEY"] = fal_key
    KLING_DIR.mkdir(parents=True, exist_ok=True)

    results = {}
    for clip in CLIPS:
        out = KLING_DIR / clip["file"]
        if out.exists():
            print(f"  SKIP {clip['file']} (exists)")
            results[clip["id"]] = str(out)
            continue

        try:
            url = generate_clip(clip)
            if url:
                download_video(url, out)
                results[clip["id"]] = str(out)
        except Exception as e:
            print(f"  FAILED: {e}")
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
