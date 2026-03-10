import requests
import os
import json
import time
from urllib.parse import urlparse
from urllib.request import urlretrieve

def generate_image(prompt, filename, resolution="2k", aspect_ratio="16:9"):
    """Generate image using Nano Banana 2 API"""
    api_key = os.getenv('WAVESPEED_API_KEY')
    if not api_key:
        print("Error: WAVESPEED_API_KEY not found in environment")
        return None
    
    # Submit generation request
    response = requests.post(
        'https://api.wavespeed.ai/api/v3/google/nano-banana-2/text-to-image',
        headers={
            'Authorization': f'Bearer {api_key}',
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
        print(f"Error submitting request: {response.status_code} - {response.text}")
        return None
    
    task_id = response.json()['task_id']
    print(f"Task submitted: {task_id}")
    
    # Poll for completion
    while True:
        time.sleep(4)
        result_response = requests.get(
            f'https://api.wavespeed.ai/api/v3/predictions/{task_id}/result',
            headers={'Authorization': f'Bearer {api_key}'}
        )
        
        if result_response.status_code == 200:
            result = result_response.json()
            if result['status'] == 'completed':
                image_url = result['outputs'][0]
                print(f"Image generated: {image_url}")
                
                # Download image
                output_path = f"marketing/generated/{filename}"
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                urlretrieve(image_url, output_path)
                print(f"Saved to: {output_path}")
                return output_path
            elif result['status'] == 'failed':
                print(f"Generation failed: {result}")
                return None
        else:
            print(f"Error checking status: {result_response.status_code}")
            return None

def main():
    # Sage.ai-style graphics inspired by their clean, professional approach
    
    # 1. Hero banner - clean, professional like Sage.ai's homepage
    generate_image(
        "Clean minimalist healthcare technology banner, split screen showing overwhelmed healthcare worker with paperwork on left (muted colors), versus confident healthcare professional using tablet with PalmCare AI interface on right (vibrant teal #0d9488), modern sans-serif typography 'Where Care Meets Intelligence', professional medical setting, ultra-clean design aesthetic similar to enterprise SaaS platforms",
        "sage_style_hero.png",
        "2k",
        "21:9"
    )
    
    # 2. Product demo graphic - showing the app in action
    generate_image(
        "Professional product showcase, three iPhone mockups in floating perspective showing PalmCare AI workflow: first phone shows voice recording interface with waveform, second shows AI processing with data visualization, third shows completed assessment contract, clean white background, subtle shadows, teal accent color #0d9488, enterprise software aesthetic",
        "sage_style_product_demo.png",
        "2k",
        "16:9"
    )
    
    # 3. Stats/ROI graphic - clean data visualization
    generate_image(
        "Clean minimal infographic, dark navy background, three key metrics highlighted in teal #0d9488: '60-second assessments', '90% faster evaluations', '15+ hours saved weekly', modern data visualization with subtle geometric shapes, professional typography, enterprise dashboard aesthetic",
        "sage_style_stats.png",
        "2k",
        "1:1"
    )
    
    # 4. Video thumbnail/cover
    generate_image(
        "Video thumbnail for healthcare technology promotional video, healthcare professional in scrubs holding smartphone with PalmCare AI interface visible on screen, modern medical office background, confident pose, teal color accents #0d9488, overlay text 'Voice to Contract in Seconds', professional lighting, YouTube thumbnail style composition",
        "video_thumbnail.png",
        "2k",
        "16:9"
    )
    
    # 5. Social media square - Instagram/LinkedIn
    generate_image(
        "Square format social media graphic, healthcare worker at desk using smartphone with PalmCare AI app visible, clean modern medical office, teal gradient background #0d9488, overlay text 'Smart Healthcare Assessments', professional portrait style, confident healthcare professional",
        "sage_style_social_square.png",
        "2k",
        "1:1"
    )
    
    print("All Sage.ai-style marketing graphics generated successfully!")

if __name__ == "__main__":
    main()