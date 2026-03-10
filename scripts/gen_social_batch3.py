#!/usr/bin/env python3
"""Batch 3: Carousel series, iPhone mockups, and brand-specific palm tree visuals."""
import json, os, sys, time, requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

API_KEY = os.getenv("WAVESPEED_API_KEY")
if not API_KEY:
    print("ERROR: WAVESPEED_API_KEY not set"); sys.exit(1)

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
SUBMIT_URL = "https://api.wavespeed.ai/api/v3/google/nano-banana-pro/text-to-image"
POLL_URL = "https://api.wavespeed.ai/api/v3/predictions/{task_id}/result"
OUT = PROJECT_ROOT / "apps/web/public/marketing/social"
OUT.mkdir(parents=True, exist_ok=True)

IMAGES = [
    {
        "name": "carousel_step1_record",
        "prompt": (
            "Square social media carousel slide. Clean teal (#0d9488) gradient background. "
            "Large '01' in semi-transparent white at top-left. Center: an iPhone 15 Pro "
            "in Space Black showing a voice recording screen with a pulsing teal waveform "
            "and a large red record button, timer at 02:34. Below the phone in white text: "
            "'Record the Assessment'. A small palm leaf icon decorates the bottom-right "
            "corner. Modern, minimal, step-by-step tutorial design."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "carousel_step2_analyze",
        "prompt": (
            "Square social media carousel slide. Clean teal (#0d9488) gradient background "
            "slightly darker than slide 1. Large '02' in semi-transparent white at top-left. "
            "Center: an iPhone 15 Pro showing an AI analysis screen with flowing data "
            "streams, extracted text sections, speaker labels, and a progress indicator. "
            "Below the phone: 'AI Extracts Everything'. Small palm leaf icon at bottom-right. "
            "Matching series style, modern and clean."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "carousel_step3_contract",
        "prompt": (
            "Square social media carousel slide. Clean teal (#0d9488) gradient background, "
            "slightly darker again. Large '03' in semi-transparent white at top-left. "
            "Center: an iPhone 15 Pro showing a completed healthcare service contract "
            "with patient details, care plan sections, and a green checkmark. Below the "
            "phone: 'Contract Ready to Sign'. Small palm leaf icon at bottom-right. "
            "Celebratory feel, matching series style."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "carousel_step4_cta",
        "prompt": (
            "Square social media carousel final slide. Rich teal (#0d9488) background with "
            "a subtle palm tree pattern overlay. Center: bold white text 'PALM IT' in a "
            "modern sans-serif font with a slight glow. Below: 'Voice to Contract in 60 "
            "Seconds' in smaller white text. A horizontal line separates it from "
            "'palmcareai.com' at the very bottom. Clean, impactful, call-to-action design. "
            "Brand consistency with palm tree motifs."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "iphone_mockup_home",
        "prompt": (
            "Photorealistic iPhone 15 Pro in Space Black, floating at a 15-degree angle "
            "against a clean white background with soft shadow beneath. The screen shows "
            "a healthcare app home dashboard: teal (#0d9488) header with 'Good Morning' "
            "greeting, stat cards showing clients count and pending assessments, quick "
            "action buttons, and a bottom tab bar with Home, Clients, Record, Schedule, "
            "Settings icons. Studio product photography lighting."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "iphone_mockup_recording",
        "prompt": (
            "Photorealistic iPhone 15 Pro in Space Black, floating at a 15-degree angle "
            "against a clean white background with soft shadow. Screen shows a voice "
            "recording interface: large circular teal (#0d9488) record button in center, "
            "audio waveform visualization, timer showing 03:45, speaker labels 'Caregiver' "
            "and 'Client' with color dots. Minimal UI, healthcare recording app. "
            "Studio product photography."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "iphone_mockup_contract",
        "prompt": (
            "Photorealistic iPhone 15 Pro in Space Black, floating at a 15-degree angle "
            "against a clean white background with soft shadow. Screen shows a completed "
            "healthcare service contract: teal (#0d9488) header bar, patient name, date, "
            "assessment summary section, billable items list with checkboxes, care plan "
            "with ADL items, and a 'Send for Signature' teal button at bottom. "
            "Professional document viewer UI. Studio lighting."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "palm_brand_sunset",
        "prompt": (
            "Artistic brand photograph for a healthcare technology company. Majestic row "
            "of royal palm trees silhouetted against a dramatic sunset sky that gradients "
            "from deep orange to rich teal (#0d9488). The ocean is visible in the background "
            "reflecting the sky colors. In the foreground, a subtle glass-like overlay shows "
            "faint healthcare data visualizations — chart lines, patient icons. Cinematic "
            "wide shot, aspirational, premium brand imagery. No text."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "palm_brand_minimal",
        "prompt": (
            "Minimalist brand image. Single elegant palm tree in center against a clean "
            "gradient from white to light teal (#0d9488). The palm tree is rendered in a "
            "modern semi-flat illustration style with subtle shadows. At the base of the "
            "palm, a tiny iPhone silhouette leans against the trunk. Extremely clean, "
            "Apple-inspired minimalism. Lots of white space. Sophisticated and calm."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
]


def submit(prompt, aspect_ratio, resolution):
    r = requests.post(SUBMIT_URL, headers=HEADERS, json={
        "prompt": prompt, "resolution": resolution,
        "aspect_ratio": aspect_ratio, "output_format": "png",
    }, timeout=30)
    r.raise_for_status()
    return r.json().get("data", {}).get("id", "")


def poll(task_id, timeout=180):
    url = POLL_URL.format(task_id=task_id)
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = requests.get(url, headers=HEADERS, timeout=15)
        d = r.json().get("data", {})
        if d.get("status") == "completed":
            return (d.get("outputs") or [None])[0]
        if d.get("status") == "failed":
            print(f"  FAILED: {d.get('error')}")
            return None
        time.sleep(5)
    print("  TIMEOUT")
    return None


def download(url, fp):
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    fp.write_bytes(r.content)
    print(f"  Saved {fp.name} ({len(r.content)//1024}KB)")
    return True


def main():
    print(f"=== Batch 3: {len(IMAGES)} Carousel/iPhone/Brand images ===")
    tasks = []
    for img in IMAGES:
        print(f"Submitting {img['name']}...")
        try:
            tid = submit(img["prompt"], img["aspect_ratio"], img["resolution"])
            if tid:
                tasks.append({**img, "task_id": tid})
                print(f"  -> {tid[:20]}...")
        except Exception as e:
            print(f"  ERROR: {e}")

    print(f"\nPolling {len(tasks)} tasks...")
    ok = 0
    for t in tasks:
        print(f"Polling {t['name']}...")
        url = poll(t["task_id"])
        if url:
            try:
                download(url, OUT / f"{t['name']}.png")
                ok += 1
            except Exception as e:
                print(f"  Download error: {e}")
    print(f"\nBatch 3 done: {ok}/{len(IMAGES)}")


if __name__ == "__main__":
    main()
