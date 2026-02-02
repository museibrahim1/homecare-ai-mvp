#!/usr/bin/env python3
"""
Generate images using WaveSpeed AI + Nano Banana Pro.

Usage:
    python scripts/wavespeed_image.py --prompt "A beautiful sunset" --output image.png
    python scripts/wavespeed_image.py --prompt "Logo design" --size square_hd --output logo.png

Sizes: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
"""

import argparse
import requests
import sys
from pathlib import Path

WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_ENDPOINT = "https://api.wavespeed.ai/v1/generate"

SIZES = ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"]


def generate_image(
    prompt: str, 
    negative_prompt: str = "blurry, low quality, distorted",
    size: str = "landscape_16_9",
    output_path: str = "image.png"
):
    """Generate image using Nano Banana Pro via WaveSpeed."""
    
    print(f"Generating image...")
    print(f"  Prompt: {prompt[:50]}...")
    print(f"  Size: {size}")
    print(f"  Output: {output_path}")
    
    headers = {
        "Authorization": f"Bearer {WAVESPEED_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "fal-ai/nano-banana-pro",
        "input": {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "image_size": size,
            "num_inference_steps": 30,
            "guidance_scale": 7.5
        }
    }
    
    try:
        response = requests.post(WAVESPEED_ENDPOINT, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Download image file
        if "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
            image_response = requests.get(image_url)
            with open(output_path, "wb") as f:
                f.write(image_response.content)
            print(f"✓ Image saved to: {output_path}")
            return output_path
        elif "image_url" in result:
            image_response = requests.get(result["image_url"])
            with open(output_path, "wb") as f:
                f.write(image_response.content)
            print(f"✓ Image saved to: {output_path}")
            return output_path
        else:
            print(f"Response: {result}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Generate image with Nano Banana Pro")
    parser.add_argument("--prompt", "-p", required=True, help="Image description prompt")
    parser.add_argument("--negative", "-n", default="blurry, low quality, distorted", help="Negative prompt")
    parser.add_argument("--size", "-s", default="landscape_16_9", choices=SIZES, help="Image size")
    parser.add_argument("--output", "-o", default="image.png", help="Output file path")
    
    args = parser.parse_args()
    
    generate_image(args.prompt, args.negative, args.size, args.output)


if __name__ == "__main__":
    main()
