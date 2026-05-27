#!/usr/bin/env python3
"""
Generate a sample WAV audio file for testing the pipeline.

This script creates a simple audio file with synthetic tones that can be
used to test the transcription and diarization pipeline without requiring
actual speech recordings.

Usage:
    python scripts/generate_test_audio.py

Output:
    tests/fixtures/sample_visit.wav - A ~60 second audio file
"""

import wave
import struct
import math
import os
from pathlib import Path


def generate_sine_wave(frequency: float, duration: float, sample_rate: int = 16000, amplitude: float = 0.5) -> list:
    """Generate a sine wave at the given frequency."""
    num_samples = int(sample_rate * duration)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        value = amplitude * math.sin(2 * math.pi * frequency * t)
        samples.append(value)
    return samples


def generate_silence(duration: float, sample_rate: int = 16000) -> list:
    """Generate silence."""
    num_samples = int(sample_rate * duration)
    return [0.0] * num_samples


def add_noise(samples: list, noise_level: float = 0.02) -> list:
    """Add slight noise to make it more realistic."""
    import random
    return [s + random.uniform(-noise_level, noise_level) for s in samples]


def create_sample_audio(output_path: str, duration_seconds: int = 60):
    """
    Create a sample audio file simulating a homecare visit conversation.
    
    The audio alternates between two "speakers" using different frequency
    patterns, with pauses in between to simulate turn-taking.
    """
    sample_rate = 16000
    all_samples = []
    
    # Define speaker "voices" as frequency patterns
    speaker1_freqs = [200, 250, 300]  # Lower voice
    speaker2_freqs = [350, 400, 450]  # Higher voice
    
    # Create a sequence of speaking turns
    turns = [
        # (speaker, duration, pause_after)
        (1, 3.0, 0.5),   # Speaker 1: "Hello, how are you today?"
        (2, 2.0, 0.5),   # Speaker 2: "I'm doing well, thank you"
        (1, 4.0, 0.5),   # Speaker 1: "Let me help you with your medication"
        (2, 1.5, 0.5),   # Speaker 2: "Okay, thank you"
        (1, 3.5, 0.5),   # Speaker 1: "Now let's prepare some breakfast"
        (2, 2.5, 0.5),   # Speaker 2: "That sounds good"
        (1, 4.0, 0.5),   # Speaker 1: "How has your appetite been?"
        (2, 3.0, 0.5),   # Speaker 2: "It's been good, I've been eating well"
        (1, 3.0, 0.5),   # Speaker 1: "That's great to hear"
        (2, 2.0, 0.5),   # Speaker 2: "Yes, feeling much better"
        (1, 4.0, 0.5),   # Speaker 1: "Let me check your blood pressure"
        (2, 1.5, 0.5),   # Speaker 2: "Sure"
        (1, 3.0, 0.5),   # Speaker 1: "Looking good, 120 over 80"
        (2, 2.0, 0.5),   # Speaker 2: "That's normal right?"
        (1, 2.5, 0.5),   # Speaker 1: "Yes, perfectly normal"
        (2, 3.0, 0.5),   # Speaker 2: "Good, I was a bit worried"
        (1, 4.0, 0.5),   # Speaker 1: "No need to worry, you're doing great"
        (2, 2.0, 0.5),   # Speaker 2: "Thank you for everything"
        (1, 3.0, 0.5),   # Speaker 1: "You're welcome, see you tomorrow"
    ]
    
    for speaker, speak_duration, pause_duration in turns:
        # Generate speech-like pattern
        freqs = speaker1_freqs if speaker == 1 else speaker2_freqs
        segment_samples = []
        
        # Create varied frequencies to simulate speech
        time_per_freq = speak_duration / len(freqs)
        for freq in freqs:
            segment_samples.extend(generate_sine_wave(freq, time_per_freq, sample_rate, 0.3))
        
        # Add noise for realism
        segment_samples = add_noise(segment_samples, 0.01)
        all_samples.extend(segment_samples)
        
        # Add pause
        all_samples.extend(generate_silence(pause_duration, sample_rate))
    
    # Pad to reach target duration if needed
    current_duration = len(all_samples) / sample_rate
    if current_duration < duration_seconds:
        all_samples.extend(generate_silence(duration_seconds - current_duration, sample_rate))
    
    # Convert to 16-bit PCM
    max_amplitude = max(abs(s) for s in all_samples) or 1
    pcm_samples = [int((s / max_amplitude) * 32767 * 0.8) for s in all_samples]
    
    # Write WAV file
    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        for sample in pcm_samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    return len(all_samples) / sample_rate


def main():
    """Generate all test fixtures."""
    # Ensure fixtures directory exists
    fixtures_dir = Path(__file__).parent.parent / 'tests' / 'fixtures'
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate sample audio
    audio_path = fixtures_dir / 'sample_visit.wav'
    duration = create_sample_audio(str(audio_path), duration_seconds=60)
    print(f"✓ Created: {audio_path} ({duration:.1f} seconds)")
    
    # Create a companion JSON file with expected transcript info
    transcript_info = {
        "description": "Sample homecare visit audio for testing",
        "duration_seconds": duration,
        "speakers": ["caregiver", "client"],
        "expected_tasks": [
            "MED_REMINDER",
            "MEAL_PREP", 
            "VITALS"
        ],
        "notes": [
            "This is synthetic audio with tone patterns, not actual speech",
            "Use for pipeline integration testing only",
            "ASR will not produce meaningful transcripts from this file"
        ]
    }
    
    import json
    info_path = fixtures_dir / 'sample_visit_info.json'
    with open(info_path, 'w') as f:
        json.dump(transcript_info, f, indent=2)
    print(f"✓ Created: {info_path}")
    
    print("\nTest fixtures generated successfully!")
    print("\nTo use in tests:")
    print("  from pathlib import Path")
    print("  audio_path = Path(__file__).parent / 'fixtures' / 'sample_visit.wav'")


if __name__ == '__main__':
    main()
