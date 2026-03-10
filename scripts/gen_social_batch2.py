#!/usr/bin/env python3
"""Batch 2: Instagram feed + story visuals with palm tree + assessment branding."""
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
        "name": "ig_square_palm_app",
        "prompt": (
            "Square Instagram post photograph. Close-up of hands holding an iPhone 15 Pro "
            "in Space Black, the screen showing a teal (#0d9488) healthcare assessment "
            "app with patient data cards. Background: blurred tropical setting with palm "
            "trees and warm golden sunlight bokeh. The phone screen is sharp and legible. "
            "Lifestyle tech photography, warm tones, aspirational. No text overlays."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "ig_square_assessment_home",
        "prompt": (
            "Square photograph of a home care assessment scene. A young Black male caregiver "
            "in a polo shirt sits next to an elderly patient on a comfortable couch. He holds "
            "an iPhone that is clearly recording — the phone screen shows a teal voice "
            "recording interface with an animated waveform. Natural daylight from a large "
            "window, a small palm plant on the windowsill. Warm, genuine, professional. "
            "Editorial healthcare photography."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "ig_square_contract_signing",
        "prompt": (
            "Square product photograph. An iPhone 15 Pro lies flat on a clean white desk, "
            "the screen displaying a completed healthcare service contract with a teal "
            "(#0d9488) header, patient details, and a digital signature at the bottom. "
            "Next to the phone: a fresh coffee cup and a small succulent plant. Overhead "
            "flat-lay perspective. Soft diffused studio lighting. Minimalist, clean, "
            "satisfying completion moment. Apple aesthetic."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "ig_square_stats_infographic",
        "prompt": (
            "Square data visualization graphic on a dark navy (#0f172a) background. Three "
            "large stat blocks arranged vertically: '60-Second Assessments' with a lightning "
            "bolt icon, '15+ Hours Saved Weekly' with a clock icon, '50 States Covered' with "
            "a map icon. Each stat block has a teal (#0d9488) accent bar on the left. "
            "A subtle palm leaf watermark pattern in the background. Clean corporate "
            "infographic design, professional typography. Modern SaaS marketing style."
        ),
        "aspect_ratio": "1:1",
        "resolution": "2k",
    },
    {
        "name": "ig_story_palm_phone",
        "prompt": (
            "Vertical Instagram story photograph. A woman's hand holds an iPhone 15 Pro "
            "up against a backdrop of tall palm trees and a stunning sunset sky in orange "
            "and teal. The phone screen shows a healthcare app dashboard with teal UI "
            "elements, patient cards, and a recording button. The composition has the palm "
            "trees framing the phone from both sides. Magical golden hour lighting, "
            "lifestyle photography. Vertical 9:16 format."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "ig_story_assessment_vertical",
        "prompt": (
            "Vertical Instagram story photograph. Inside a bright senior living facility, "
            "a female caregiver in scrubs kneels beside an elderly woman in a wheelchair, "
            "showing her something on an iPad. The iPad screen displays a healthcare "
            "assessment form with teal (#0d9488) accents. Warm natural light from tall "
            "windows. A potted palm plant visible in the background. Compassionate, "
            "professional, authentic care moment. Vertical format, editorial style."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "ig_story_palm_it_cta",
        "prompt": (
            "Vertical graphic design for Instagram story. Dark background that fades from "
            "navy (#0f172a) at top to teal (#0d9488) at bottom. A single tall palm tree "
            "silhouette on the right side. In the center, a glowing iPhone 15 Pro mockup "
            "showing a healthcare recording screen with a large circular 'record' button. "
            "Below the phone, bold text: 'PALM IT' in white. Clean, modern, tech-forward. "
            "Startup marketing aesthetic with tropical vibes."
        ),
        "aspect_ratio": "9:16",
        "resolution": "2k",
    },
    {
        "name": "ig_story_before_after",
        "prompt": (
            "Vertical Instagram story split design. TOP HALF: A cluttered desk with paper "
            "forms, sticky notes, coffee stains, stressed healthcare worker — desaturated "
            "muted colors, overhead view. BOTTOM HALF: Clean desk with only an iPhone "
            "showing a teal healthcare app, a small palm plant, and a coffee cup — bright, "
            "vibrant, organized. A teal (#0d9488) divider line separates the halves. "
            "Before-and-after transformation. Vertical 9:16."
        ),
        "aspect_ratio": "9:16",
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
    print(f"=== Batch 2: {len(IMAGES)} Instagram images ===")
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
    print(f"\nBatch 2 done: {ok}/{len(IMAGES)}")


if __name__ == "__main__":
    main()
