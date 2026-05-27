#!/usr/bin/env python3
"""Batch 1: LinkedIn, Facebook, Twitter brand visuals with palm tree aesthetics."""
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
        "name": "linkedin_palm_hero",
        "prompt": (
            "Wide cinematic marketing banner photograph. A row of tall royal palm trees lines "
            "the left side of a modern healthcare facility entrance at golden hour. In the "
            "foreground a confident Black female healthcare coordinator in teal scrubs holds "
            "an iPhone 15 Pro showing a sleek teal healthcare app dashboard. Warm sunset light "
            "filters through the palm fronds casting long shadows. Clean professional "
            "composition, shallow depth of field on the phone screen. Teal (#0d9488) accent "
            "lighting. No text overlays, no watermarks, photorealistic 8K."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "linkedin_caregiver_assessment",
        "prompt": (
            "Professional photograph of a home care assessment in progress. A friendly "
            "Latina caregiver sits across from an elderly woman in a bright, well-decorated "
            "living room. The caregiver holds an iPhone recording an assessment — the phone "
            "screen shows a teal (#0d9488) voice recording interface with an audio waveform. "
            "Natural window light illuminates the scene. A small potted palm plant sits on "
            "the side table. Warm, compassionate, authentic healthcare moment. "
            "Photorealistic, editorial photography style, shallow depth of field."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "linkedin_crm_showcase",
        "prompt": (
            "Clean product marketing photo. A modern MacBook Pro displays a healthcare CRM "
            "dashboard with teal (#0d9488) sidebar, patient cards, pipeline view, and analytics "
            "charts. The laptop sits on a white marble desk. Next to it: an iPhone 15 Pro "
            "showing the same app's mobile interface. A small potted palm plant and a cup "
            "of coffee complete the scene. Soft studio lighting, minimalist Apple product "
            "photography style. White background with subtle shadows. No text overlays."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "fb_ad_palm_sunset",
        "prompt": (
            "Facebook ad creative photograph. Silhouette of two palm trees against a vibrant "
            "orange and teal sunset sky. In the foreground, a healthcare professional in "
            "smart casual attire walks confidently while reviewing a completed contract on "
            "her iPhone. The phone screen glows teal (#0d9488) with a healthcare contract "
            "document. Cinematic golden hour lighting, tropical warmth meets professional "
            "healthcare technology. Wide landscape composition, photorealistic."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "fb_ad_problem_solution",
        "prompt": (
            "Split-screen Facebook advertisement photograph. LEFT SIDE: A stressed home care "
            "worker at a messy desk overflowing with paper forms, manila folders, clipboards — "
            "desaturated, dim lighting, frustrated expression. RIGHT SIDE: The same woman "
            "smiling, standing outdoors by palm trees, holding her phone showing a clean "
            "teal healthcare app. Bright, vibrant colors, natural sunlight. A diagonal teal "
            "(#0d9488) gradient divides the two halves. Professional advertising photography."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "twitter_brand_banner",
        "prompt": (
            "Ultra-wide panoramic banner. Aerial drone view of a palm-tree-lined coastal "
            "boulevard at sunset. Warm golden light. In the bottom-right corner, a "
            "translucent teal (#0d9488) glass panel overlays the scene showing a faint "
            "healthcare dashboard interface. Clean, cinematic, aspirational. The feeling "
            "of technology meeting nature. No text, no watermarks. Panoramic aspect ratio."
        ),
        "aspect_ratio": "21:9",
        "resolution": "2k",
    },
    {
        "name": "linkedin_team_outdoors",
        "prompt": (
            "Professional team photograph outdoors. Three diverse healthcare professionals "
            "(one Black man, one Asian woman, one white woman) stand together under tall "
            "palm trees in a modern business park. They hold tablets and phones, collaborating "
            "on a healthcare platform with teal (#0d9488) UI visible on screens. Warm natural "
            "daylight, palm shadows on the walkway. Confident, collaborative, innovative. "
            "Corporate editorial photography style. No text overlays."
        ),
        "aspect_ratio": "16:9",
        "resolution": "2k",
    },
    {
        "name": "fb_ad_three_phones",
        "prompt": (
            "Product marketing photograph showing three iPhone 15 Pro phones floating at "
            "slight angles against a clean teal-to-white gradient background. Phone 1 shows "
            "a voice recording screen with waveform. Phone 2 shows an AI-generated assessment "
            "document. Phone 3 shows a completed healthcare contract with signature. Subtle "
            "palm leaf shadows cast across the background. Apple product launch aesthetic, "
            "studio lighting, reflections on the phones. Teal (#0d9488) accent."
        ),
        "aspect_ratio": "16:9",
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
    print(f"=== Batch 1: {len(IMAGES)} LinkedIn/FB/Twitter images ===")
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
    print(f"\nBatch 1 done: {ok}/{len(IMAGES)}")


if __name__ == "__main__":
    main()
