#!/usr/bin/env python3
"""
Test Fixtures Generator

Creates test fixtures for the pipeline with expected outputs.
"""

import json
from pathlib import Path


def create_fixtures():
    """Create test fixture definitions."""
    
    fixtures_dir = Path(__file__).parent.parent / "tests" / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    
    # Define test cases
    test_cases = [
        {
            "name": "clean_room_short",
            "description": "Short conversation in a quiet room",
            "audio_url": None,  # Would be populated with actual test audio
            "expected": {
                "min_segments": 5,
                "max_segments": 15,
                "min_speakers": 2,
                "max_speakers": 2,
                "expected_categories": ["MED_REMINDER", "COMPANIONSHIP"],
                "min_total_minutes": 5,
                "max_total_minutes": 15,
            }
        },
        {
            "name": "noisy_kitchen",
            "description": "Conversation with background kitchen noise",
            "audio_url": None,
            "expected": {
                "min_segments": 3,
                "max_segments": 20,
                "min_speakers": 1,
                "max_speakers": 3,
                "expected_categories": ["MEAL_PREP"],
                "min_total_minutes": 10,
                "max_total_minutes": 30,
            }
        },
        {
            "name": "full_visit",
            "description": "Full 2-hour visit with multiple activities",
            "audio_url": None,
            "expected": {
                "min_segments": 20,
                "max_segments": 200,
                "min_speakers": 2,
                "max_speakers": 2,
                "expected_categories": [
                    "ADL_HYGIENE",
                    "MEAL_PREP",
                    "MED_REMINDER",
                    "COMPANIONSHIP"
                ],
                "min_total_minutes": 90,
                "max_total_minutes": 150,
            }
        },
        {
            "name": "edge_case_short",
            "description": "Very short visit - edge case",
            "audio_url": None,
            "expected": {
                "min_segments": 1,
                "max_segments": 5,
                "min_speakers": 1,
                "max_speakers": 2,
                "expected_categories": ["COMPANIONSHIP"],
                "min_total_minutes": 1,
                "max_total_minutes": 10,
            }
        },
    ]
    
    # Write fixture definitions
    fixtures_file = fixtures_dir / "test_cases.json"
    with open(fixtures_file, 'w') as f:
        json.dump(test_cases, f, indent=2)
    
    print(f"✅ Created fixture definitions: {fixtures_file}")
    
    # Create mock transcript for testing
    mock_transcript = {
        "segments": [
            {"start_ms": 0, "end_ms": 5000, "text": "Good morning! How are you feeling today?", "speaker_label": "Speaker A"},
            {"start_ms": 5500, "end_ms": 10000, "text": "I'm doing well, thank you.", "speaker_label": "Speaker B"},
            {"start_ms": 10500, "end_ms": 18000, "text": "Let me help you with your medication.", "speaker_label": "Speaker A"},
            {"start_ms": 19000, "end_ms": 25000, "text": "Thank you. What's for breakfast?", "speaker_label": "Speaker B"},
            {"start_ms": 26000, "end_ms": 35000, "text": "I'll prepare some eggs and toast.", "speaker_label": "Speaker A"},
        ]
    }
    
    mock_file = fixtures_dir / "mock_transcript.json"
    with open(mock_file, 'w') as f:
        json.dump(mock_transcript, f, indent=2)
    
    print(f"✅ Created mock transcript: {mock_file}")
    
    # Create expected billables
    expected_billables = {
        "items": [
            {"category": "MED_REMINDER", "minutes": 8, "description": "Medication reminder"},
            {"category": "MEAL_PREP", "minutes": 15, "description": "Meal preparation"},
            {"category": "COMPANIONSHIP", "minutes": 12, "description": "Companionship"},
        ],
        "total_minutes": 35
    }
    
    billables_file = fixtures_dir / "expected_billables.json"
    with open(billables_file, 'w') as f:
        json.dump(expected_billables, f, indent=2)
    
    print(f"✅ Created expected billables: {billables_file}")
    
    print("\n📁 Fixture files created in:", fixtures_dir)
    print("\nTo use these fixtures in tests:")
    print("  1. Add actual audio files to the fixtures directory")
    print("  2. Update audio_url in test_cases.json")
    print("  3. Run tests with: pytest tests/")


if __name__ == "__main__":
    create_fixtures()
