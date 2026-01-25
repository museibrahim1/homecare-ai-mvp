"""Test fixtures for the Homecare AI pipeline."""

import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent


def get_sample_audio_path() -> Path:
    """Get the path to the sample audio file."""
    return FIXTURES_DIR / "sample_visit.wav"


def get_sample_transcript() -> dict:
    """Load the sample transcript fixture."""
    with open(FIXTURES_DIR / "sample_transcript.json") as f:
        return json.load(f)


def get_sample_segments() -> list:
    """Get just the transcript segments from the sample."""
    transcript = get_sample_transcript()
    return transcript["segments"]


def get_expected_billables() -> list:
    """Get the expected billable items from the sample."""
    transcript = get_sample_transcript()
    return transcript["expected_billables"]
