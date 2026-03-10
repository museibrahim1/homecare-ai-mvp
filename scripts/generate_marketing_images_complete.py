#!/usr/bin/env python3
"""
Generate all 10 PalmCare AI marketing graphics via Nano Banana 2 API
"""

import requests
import os
import time
import json
from urllib.request import urlretrieve

# Load API key
WAVESPEED_API_KEY = os.getenv('WAVESPEED_API_KEY')
if not WAVESPEED_API_KEY:
    raise ValueError("WAVESPEED_API_KEY environment variable not set")

# Ensure output directory exists
os.makedirs('marketing/generated', exist_ok=True)

# Image generation function
def generate_image(prompt, filename, resolution="2k", aspect_ratio="16:9"):
    print(f"Generating {filename}...")
    
    # Submit image generation request
    response = requests.post(
        'https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image',
        headers={
            'Authorization': f'Bearer {WAVESPEED_API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'prompt': prompt,
            'resolution': resolution,
            'aspect_ratio': aspect_ratio,
            'enable_web_search': False,
            'output_format': 'png'
        }
    )
    
    if response.status_code != 200:
        print(f"Error submitting {filename}: {response.text}")
        return False
        
    task_id = response.json()['task_id']
    print(f"Task {task_id} submitted for {filename}")
    
    # Poll for completion
    while True:
        result_response = requests.get(
            f'https://api.wavespeed.ai/api/v3/predictions/{task_id}/result',
            headers={'Authorization': f'Bearer {WAVESPEED_API_KEY}'}
        )
        
        if result_response.status_code == 200:
            result = result_response.json()
            if result['status'] == 'completed':
                image_url = result['outputs'][0]
                print(f"Downloading {filename} from {image_url}")
                urlretrieve(image_url, f'marketing/generated/{filename}')
                print(f"✅ {filename} saved successfully")
                return True
            elif result['status'] == 'failed':
                print(f"❌ {filename} generation failed: {result.get('error', 'Unknown error')}")
                return False
        
        print(f"Waiting for {filename}...")
        time.sleep(4)

# Define all 10 marketing graphics
image_specs = [
    {
        'filename': 'linkedin_hero.png',
        'prompt': 'Professional healthcare technology LinkedIn banner. Clean teal gradient background (#0d9488). Modern smartphone mockup showing healthcare assessment interface with patient data forms. Professional healthcare worker in scrubs smiling confidently. Text overlay: "PalmCare AI - Where Care Meets Intelligence". Minimalist design, high-tech aesthetic, medical icons floating subtly. 2K quality, ultra-crisp.',
        'aspect_ratio': '16:9'
    },
    {
        'filename': 'instagram_square_feature.png',
        'prompt': 'Instagram square post for healthcare app. Dark teal to black gradient background (#0d9488 to #000). Glowing smartphone with modern healthcare dashboard UI visible on screen. Floating medical icons (stethoscope, heart, clipboard) with soft glow effects. Bold white text: "Smart Assessments. Powerful CRM." PalmCare AI branding. High-tech, professional aesthetic.',
        'aspect_ratio': '1:1'
    },
    {
        'filename': 'instagram_story_stats.png',
        'prompt': 'Instagram story graphic with dark background. Bold impact statistics in large white text: "90% Faster Assessments", "50% Less Paperwork", "100% HIPAA Compliant". Teal accent elements (#0d9488). PalmCare AI logo. "Palm It" call-to-action button in teal. Modern, high-contrast design for mobile viewing.',
        'aspect_ratio': '9:16'
    },
    {
        'filename': 'facebook_ad_problem_solution.png',
        'prompt': 'Split-screen Facebook ad design. LEFT SIDE: Stressed healthcare worker surrounded by paper forms, muted gray tones, cluttered desk. RIGHT SIDE: Smiling healthcare worker with tablet, vibrant teal colors (#0d9488), organized modern workspace. Text overlay: "From Paperwork to Palm It". Clear before/after contrast. Professional healthcare setting.',
        'aspect_ratio': '16:9'
    },
    {
        'filename': 'twitter_product_showcase.png',
        'prompt': 'Clean white background Twitter banner. Three smartphone screens in sequence showing PalmCare AI workflow: 1) Voice recording interface with waveform, 2) AI analysis screen with data processing, 3) Generated contract document. Teal accent color (#0d9488). Text: "Voice to Contract in Minutes". Professional, minimalist design.',
        'aspect_ratio': '21:9'
    },
    {
        'filename': 'linkedin_post_roi.png',
        'prompt': 'ROI infographic with dark navy background. Teal data visualization bars and charts (#0d9488). Key statistics prominently displayed: "60-second assessments", "15+ hours saved weekly", "All 50 states". Modern data visualization style. PalmCare AI branding. Professional business aesthetic for LinkedIn audience.',
        'aspect_ratio': '1:1'
    },
    {
        'filename': 'instagram_carousel_1_record.png',
        'prompt': 'Instagram carousel slide 1. Teal gradient background (#0d9488). Smartphone with large red record button and audio waveform animation. Step number "1" prominently displayed. Text: "Record - Just talk. The AI listens." Clean, modern mobile UI design. Healthcare professional theme.',
        'aspect_ratio': '4:5'
    },
    {
        'filename': 'instagram_carousel_2_analyze.png',
        'prompt': 'Instagram carousel slide 2. Matching teal gradient background (#0d9488). Smartphone showing AI processing interface with data streams, progress bars, and analytical visualizations. Step number "2" prominent. Text: "Analyze - AI processes your conversation." Futuristic tech aesthetic.',
        'aspect_ratio': '4:5'
    },
    {
        'filename': 'instagram_carousel_3_contract.png',
        'prompt': 'Instagram carousel slide 3. Teal gradient background (#0d9488). Smartphone displaying completed contract document with green checkmark overlay. Step number "3" prominent. Text: "Contract Ready - Signed, sealed, Palm It." Success state, celebration aesthetic, professional document visible.',
        'aspect_ratio': '4:5'
    },
    {
        'filename': 'email_header_outreach.png',
        'prompt': 'Email header banner with teal gradient background (#0d9488 to lighter teal). PalmCare AI logo and palm leaf pattern elements. Text: "Where Care Meets Intelligence" in clean white font. Professional, modern design suitable for business email headers. Subtle healthcare iconography.',
        'aspect_ratio': '21:9',
        'resolution': '1k'
    }
]

# Generate all images
print("Starting PalmCare AI marketing image generation...")
print(f"Generating {len(image_specs)} images")

success_count = 0
for i, spec in enumerate(image_specs, 1):
    print(f"\n--- Image {i}/{len(image_specs)}: {spec['filename']} ---")
    
    success = generate_image(
        prompt=spec['prompt'],
        filename=spec['filename'],
        resolution=spec.get('resolution', '2k'),
        aspect_ratio=spec['aspect_ratio']
    )
    
    if success:
        success_count += 1
    
    # Brief pause between requests
    time.sleep(2)

print(f"\n🎉 Marketing image generation complete!")
print(f"✅ {success_count}/{len(image_specs)} images generated successfully")
print(f"📁 Images saved to marketing/generated/")
print("\nReady for social media campaigns!")
