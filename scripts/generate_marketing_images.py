#!/usr/bin/env python3
"""
Generate marketing images for PalmCare AI using WaveSpeed Nano Banana 2 API.

Generates social media graphics, ad creatives, and marketing visuals
with brand-consistent styling (teal #0d9488, "Where care meets intelligence").
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_KEY = os.getenv("WAVESPEED_API_KEY")
if not API_KEY:
    print("ERROR: WAVESPEED_API_KEY not set in .env")
    sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
TEXT_TO_IMAGE_URL = "https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image"
POLL_URL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"

OUTPUT_DIR = PROJECT_ROOT / "marketing" / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


IMAGES_TO_GENERATE = [
    {
        "name": "linkedin_hero",
        "prompt": (
            "Professional marketing banner for a healthcare technology company called PalmCare AI. "
            "Clean modern design with teal (#0d9488) gradient background. "
            "Shows a sleek smartphone displaying a healthcare assessment app with clean UI. "
            "A healthcare professional in scrubs smiling while using a tablet. "
            "Text overlay: 'Where Care Meets Intelligence'. "
            "Minimalist, Apple-style aesthetic, high-end tech product photography feel. "
            "Corporate, trustworthy, innovative. No stock photo watermarks."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "instagram_square_feature",
        "prompt": (
            "Square social media post for PalmCare AI healthcare app. "
            "Teal (#0d9488) to dark gradient background. "
            "Center: a glowing smartphone mockup showing a modern healthcare dashboard with patient cards and charts. "
            "Floating UI elements around the phone: checkmarks, heart rate icons, clipboard icons. "
            "Bottom text: 'Smart Assessments. Powerful CRM.' "
            "Clean, modern, tech-forward design. Minimal and elegant like Apple product ads. "
            "No people, focus on the product interface."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "instagram_story_stats",
        "prompt": (
            "Vertical Instagram story graphic for PalmCare AI. "
            "Dark background with teal (#0d9488) accent elements and glowing effects. "
            "Large bold statistics stacked vertically: '90% Faster Assessments', '50% Less Paperwork', '100% HIPAA Compliant'. "
            "Each stat has a subtle icon next to it (clock, document, shield). "
            "Bottom: teal gradient button saying 'Palm It'. "
            "Modern, data-driven, impactful. Tech startup aesthetic."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "facebook_ad_problem_solution",
        "prompt": (
            "Facebook ad creative for PalmCare AI healthcare software. "
            "Split design: left side shows stressed healthcare worker buried in paper forms and clipboards (muted, desaturated). "
            "Right side shows the same worker smiling, using a sleek tablet with a clean digital interface (vibrant, teal-tinted). "
            "Dividing line is a teal (#0d9488) gradient swoosh. "
            "Header: 'From Paperwork to Palm It'. "
            "Professional healthcare setting, home care environment. Warm lighting on the solution side."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "twitter_product_showcase",
        "prompt": (
            "Twitter header image for PalmCare AI. "
            "Clean white background with subtle teal (#0d9488) geometric patterns. "
            "Three smartphone screens side by side showing: 1) a voice recording interface with waveform, "
            "2) a patient assessment form with checkboxes, 3) a CRM dashboard with patient cards. "
            "Below the phones: 'Voice to Contract in Minutes'. "
            "Minimal, professional, tech product showcase. Apple keynote presentation style."
        ),
        "aspect_ratio": "3:1",
        "resolution": "2k",
    },
    {
        "name": "linkedin_post_roi",
        "prompt": (
            "LinkedIn post graphic for PalmCare AI showing ROI data. "
            "Dark navy background with teal (#0d9488) accent bars and charts. "
            "Infographic style showing: '60-second assessments' with a lightning bolt icon, "
            "'5,400x ROI per client' with an upward arrow, "
            "'163 agencies onboarded' with a map outline. "
            "Clean data visualization, corporate infographic style. "
            "PalmCare AI logo in corner. Professional and data-driven."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "instagram_carousel_1_record",
        "prompt": (
            "Instagram carousel slide 1 for PalmCare AI. "
            "Teal (#0d9488) background with a large smartphone mockup in center. "
            "The phone screen shows a voice recording interface with a pulsing waveform animation, "
            "a large red record button, and timer showing '02:34'. "
            "Text above phone: 'Step 1: Record'. "
            "Text below: 'Just talk. The AI listens.' "
            "Clean, minimal, step-by-step tutorial aesthetic."
        ),
        "aspect_ratio": "4:5",
        "resolution": "2k",
    },
    {
        "name": "instagram_carousel_2_analyze",
        "prompt": (
            "Instagram carousel slide 2 for PalmCare AI. "
            "Teal (#0d9488) background with a large smartphone mockup in center. "
            "The phone screen shows an AI processing animation with flowing data streams, "
            "text being extracted, and a progress bar at 73%. "
            "Text above phone: 'Step 2: AI Analyzes'. "
            "Text below: 'Transcription. Assessment. Contract.' "
            "Clean, minimal, matching the series style."
        ),
        "aspect_ratio": "4:5",
        "resolution": "2k",
    },
    {
        "name": "instagram_carousel_3_contract",
        "prompt": (
            "Instagram carousel slide 3 for PalmCare AI. "
            "Teal (#0d9488) background with a large smartphone mockup in center. "
            "The phone screen shows a completed care contract document with signature line, "
            "patient details filled in, and a green checkmark. "
            "Text above phone: 'Step 3: Contract Ready'. "
            "Text below: 'Signed. Sealed. Palm It.' "
            "Clean, minimal, matching the series style. Celebratory feel."
        ),
        "aspect_ratio": "4:5",
        "resolution": "2k",
    },
    {
        "name": "email_header_outreach",
        "prompt": (
            "Email header banner for a cold outreach email from PalmCare AI. "
            "Wide, short banner. Teal (#0d9488) gradient from left to right. "
            "Left side: PalmCare AI text logo in white. "
            "Right side: subtle palm leaf pattern overlay. "
            "Center: 'Where Care Meets Intelligence' in elegant white typography. "
            "Professional, clean, not too busy. Suitable for email header at 600px wide."
        ),
        "aspect_ratio": "3:1",
        "resolution": "1k",
    },
]


def submit_image(prompt: str, aspect_ratio: str, resolution: str) -> str:
    """Submit an image generation task. Returns task_id."""
    resp = requests.post(
        TEXT_TO_IMAGE_URL,
        headers=HEADERS,
        json={
            "prompt": prompt,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "enable_web_search": False,
            "output_format": "png",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})
    return data.get("id", "")


def poll_result(task_id: str, max_wait: int = 120):
    """Poll until image is ready. Returns image URL or None."""
    url = POLL_URL.format(task_id=task_id)
    start = time.time()
    while time.time() - start < max_wait:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        data = resp.json().get("data", {})
        status = data.get("status", "")
        if status == "completed":
            outputs = data.get("outputs", [])
            return outputs[0] if outputs else None
        if status == "failed":
            print(f"  FAILED: {data.get('error', 'unknown')}")
            return None
        time.sleep(4)
    print("  TIMEOUT")
    return None


def download_image(url: str, filepath: Path) -> bool:
    """Download image from URL to local file."""
    try:
        resp = requests.get(url, timeout=60)
        resp.raise_for_status()
        filepath.write_bytes(resp.content)
        size_kb = len(resp.content) / 1024
        print(f"  Saved: {filepath.name} ({size_kb:.0f} KB)")
        return True
    except Exception as e:
        print(f"  Download error: {e}")
        return False


def main():
    print("=" * 60)
    print("PalmCare AI Marketing Image Generator")
    print(f"Generating {len(IMAGES_TO_GENERATE)} images via Nano Banana 2")
    print("=" * 60)

    # Submit all tasks first (parallel processing on server side)
    tasks = []
    for img in IMAGES_TO_GENERATE:
        print(f"\nSubmitting: {img['name']}...")
        try:
            task_id = submit_image(img["prompt"], img["aspect_ratio"], img["resolution"])
            if task_id:
                tasks.append({"task_id": task_id, **img})
                print(f"  Task ID: {task_id[:16]}...")
            else:
                print("  ERROR: No task ID returned")
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\n{'=' * 60}")
    print(f"Submitted {len(tasks)} tasks. Polling for results...")
    print("=" * 60)

    results = []
    for task in tasks:
        print(f"\nPolling: {task['name']}...")
        image_url = poll_result(task["task_id"])
        if image_url:
            filepath = OUTPUT_DIR / f"{task['name']}.png"
            if download_image(image_url, filepath):
                results.append({
                    "name": task["name"],
                    "file": str(filepath.relative_to(PROJECT_ROOT)),
                    "url": image_url,
                    "aspect_ratio": task["aspect_ratio"],
                })

    manifest = OUTPUT_DIR / "manifest.json"
    manifest.write_text(json.dumps(results, indent=2))

    print(f"\n{'=' * 60}")
    print(f"DONE: {len(results)}/{len(IMAGES_TO_GENERATE)} images generated")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Manifest: {manifest}")
    print("=" * 60)


if __name__ == "__main__":
    main()
