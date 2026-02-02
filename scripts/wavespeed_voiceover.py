#!/usr/bin/env python3
"""
Generate voiceovers using WaveSpeed AI + ElevenLabs v3.

Usage:
    python scripts/wavespeed_voiceover.py --text "Your text here" --voice Rachel --output output.mp3

Voices: Rachel, Domi, Bella, Antoni, Josh, Arnold, Adam, Sam
"""

import argparse
import requests
import sys
from pathlib import Path

WAVESPEED_API_KEY = "42b1574b75089a503d4c5ddcaced5b677c41123c936b31d99f9c084831719dc7"
WAVESPEED_ENDPOINT = "https://api.wavespeed.ai/v1/generate"

VOICES = ["Rachel", "Domi", "Bella", "Antoni", "Josh", "Arnold", "Adam", "Sam"]


def generate_voiceover(text: str, voice: str = "Rachel", output_path: str = "voiceover.mp3"):
    """Generate voiceover using ElevenLabs v3 via WaveSpeed."""
    
    print(f"Generating voiceover...")
    print(f"  Voice: {voice}")
    print(f"  Text: {text[:50]}...")
    print(f"  Output: {output_path}")
    
    headers = {
        "Authorization": f"Bearer {WAVESPEED_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "fal-ai/elevenlabs-v3",
        "input": {
            "text": text,
            "voice": voice,
            "model_id": "eleven_multilingual_v2"
        }
    }
    
    try:
        response = requests.post(WAVESPEED_ENDPOINT, json=payload, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        
        # Download audio file
        if "audio_url" in result:
            audio_response = requests.get(result["audio_url"])
            with open(output_path, "wb") as f:
                f.write(audio_response.content)
            print(f"✓ Voiceover saved to: {output_path}")
            return output_path
        else:
            print(f"Response: {result}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Generate voiceover with ElevenLabs v3")
    parser.add_argument("--text", "-t", required=True, help="Text to convert to speech")
    parser.add_argument("--voice", "-v", default="Rachel", choices=VOICES, help="Voice to use")
    parser.add_argument("--output", "-o", default="voiceover.mp3", help="Output file path")
    
    args = parser.parse_args()
    
    generate_voiceover(args.text, args.voice, args.output)


if __name__ == "__main__":
    main()
