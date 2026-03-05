import requests
import os
import json
import time
from urllib.parse import urlparse
from urllib.request import urlretrieve

def generate_voiceover(text, voice_id="Alice", filename="promo_narration.mp3"):
    """Generate voiceover using ElevenLabs v3 API"""
    api_key = os.getenv('WAVESPEED_API_KEY')
    if not api_key:
        print("Error: WAVESPEED_API_KEY not found in environment")
        return None
    
    # Submit generation request
    response = requests.post(
        'https://api.wavespeed.ai/api/v3/elevenlabs/eleven-v3',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'text': text,
            'voice_id': voice_id,
            'similarity': 1.0,
            'stability': 0.5,
            'use_speaker_boost': True
        }
    )
    
    if response.status_code != 200:
        print(f"Error submitting request: {response.status_code} - {response.text}")
        return None
    
    task_id = response.json()['task_id']
    print(f"Voiceover task submitted: {task_id}")
    
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
                audio_url = result['outputs'][0]
                print(f"Audio generated: {audio_url}")
                
                # Download audio
                output_path = f"videos/public/segments/{filename}"
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                urlretrieve(audio_url, output_path)
                print(f"Saved to: {output_path}")
                return output_path
            elif result['status'] == 'failed':
                print(f"Generation failed: {result}")
                return None
        else:
            print(f"Error checking status: {result_response.status_code}")
            return None

def main():
    # Generate professional narration for 10-second promo video
    script = "Healthcare assessments in seconds, not hours. PalmCare AI transforms voice into contracts instantly. Where care meets intelligence."
    
    # Use Alice - clear, professional female voice (recommended)
    generate_voiceover(script, "Alice", "promo_10sec_narration.mp3")
    
    print("Professional voiceover generated for 10-second promo video!")

if __name__ == "__main__":
    main()