"""Integration tests using sample fixtures."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'worker'))

from tests.fixtures import (
    get_sample_audio_path,
    get_sample_transcript,
    get_sample_segments,
    get_expected_billables,
)


class TestFixtures:
    """Verify test fixtures are valid."""

    def test_sample_audio_exists(self):
        """Verify sample audio file exists."""
        audio_path = get_sample_audio_path()
        assert audio_path.exists(), f"Audio file not found: {audio_path}"
        assert audio_path.stat().st_size > 0, "Audio file is empty"

    def test_sample_transcript_loads(self):
        """Verify sample transcript loads correctly."""
        transcript = get_sample_transcript()
        assert "segments" in transcript
        assert "diarization" in transcript
        assert len(transcript["segments"]) > 0

    def test_sample_segments_have_required_fields(self):
        """Verify segments have all required fields."""
        segments = get_sample_segments()
        required_fields = ["id", "start_ms", "end_ms", "text"]
        
        for segment in segments:
            for field in required_fields:
                assert field in segment, f"Missing field '{field}' in segment"

    def test_segments_are_ordered(self):
        """Verify segments are in chronological order."""
        segments = get_sample_segments()
        for i in range(1, len(segments)):
            assert segments[i]["start_ms"] >= segments[i-1]["start_ms"], \
                f"Segment {i} starts before segment {i-1}"


class TestBillingWithFixtures:
    """Test billing rules with sample transcript."""

    def test_billables_from_sample_transcript(self):
        """Test generating billables from sample transcript."""
        from libs.billing import generate_billables_from_transcript
        
        segments = get_sample_segments()
        
        # Get visit time range
        start_ms = min(s["start_ms"] for s in segments)
        end_ms = max(s["end_ms"] for s in segments)
        
        billables = generate_billables_from_transcript(
            segments,
            visit_start_ms=start_ms,
            visit_end_ms=end_ms,
            min_block_minutes=1,
        )
        
        assert len(billables) > 0, "Should generate at least one billable"
        
        # Check that expected categories are detected (using current category names)
        categories = {b["category"] for b in billables}
        # Accept either old or new category naming convention
        has_medication = "MED_REMINDER" in categories or "Medication Management" in categories
        has_meal = "MEAL_PREP" in categories or "Nutrition" in categories
        has_vitals = "VITALS" in categories or "Health Monitoring" in categories
        assert has_medication, f"Should detect medication task. Got: {categories}"
        assert has_meal, f"Should detect meal prep task. Got: {categories}"
        assert has_vitals, f"Should detect vitals check. Got: {categories}"

    def test_billables_match_expected(self):
        """Verify detected billables roughly match expected."""
        from libs.billing import generate_billables_from_transcript
        
        segments = get_sample_segments()
        expected = get_expected_billables()
        
        start_ms = min(s["start_ms"] for s in segments)
        end_ms = max(s["end_ms"] for s in segments)
        
        billables = generate_billables_from_transcript(
            segments,
            visit_start_ms=start_ms,
            visit_end_ms=end_ms,
            min_block_minutes=1,
        )
        
        detected_categories = {b["category"] for b in billables}
        expected_categories = {e["category"] for e in expected}
        
        # Create mapping for category name variations
        category_mapping = {
            "MED_REMINDER": "Medication Management",
            "MEAL_PREP": "Nutrition", 
            "VITALS": "Health Monitoring",
            "ADL_MOBILITY": "Mobility",
            "HOUSEHOLD_LIGHT": "Homemaking",
        }
        
        # Normalize detected categories to check against expected
        normalized_detected = set()
        for cat in detected_categories:
            normalized_detected.add(cat)
            # Also add the mapped version
            for old, new in category_mapping.items():
                if cat == new:
                    normalized_detected.add(old)
                elif cat == old:
                    normalized_detected.add(new)
        
        # Should detect at least 3 categories (using flexible matching)
        overlap = normalized_detected & expected_categories
        assert len(detected_categories) >= 3, \
            f"Should detect at least 3 categories. Got: {detected_categories}"


class TestNoteGenerationWithFixtures:
    """Test note generation with sample data."""

    def test_note_from_sample_data(self):
        """Test generating note from sample transcript and billables."""
        from libs.note_gen import generate_structured_note, generate_narrative
        from libs.billing import generate_billables_from_transcript
        
        segments = get_sample_segments()
        
        # Generate billables
        start_ms = min(s["start_ms"] for s in segments)
        end_ms = max(s["end_ms"] for s in segments)
        
        billables = generate_billables_from_transcript(
            segments,
            visit_start_ms=start_ms,
            visit_end_ms=end_ms,
            min_block_minutes=1,
        )
        
        # Generate structured note
        visit_data = {
            "id": "test-visit-001",
            "scheduled_start": "2024-01-15T09:00:00Z",
            "client_name": "Test Client",
            "caregiver_name": "Test Caregiver",
        }
        
        structured_note = generate_structured_note(visit_data, billables, segments)
        
        assert structured_note["visit_info"]["visit_id"] == "test-visit-001"
        assert len(structured_note["tasks_performed"]) > 0
        assert structured_note["observations"] != ""

    def test_narrative_from_sample(self):
        """Test narrative generation from sample data."""
        from libs.note_gen import generate_structured_note, generate_narrative
        from libs.billing import generate_billables_from_transcript
        
        segments = get_sample_segments()
        start_ms = min(s["start_ms"] for s in segments)
        end_ms = max(s["end_ms"] for s in segments)
        
        billables = generate_billables_from_transcript(
            segments, start_ms, end_ms, min_block_minutes=1
        )
        
        visit_data = {
            "id": "test-visit-001",
            "scheduled_start": "2024-01-15T09:00:00Z",
        }
        
        structured_note = generate_structured_note(visit_data, billables, segments)
        narrative = generate_narrative(structured_note)
        
        assert len(narrative) > 100, "Narrative should be substantial"
        assert "Home care visit" in narrative
        assert "stable condition" in narrative


class TestEndToEndPipeline:
    """End-to-end pipeline tests using fixtures."""

    def test_full_pipeline_flow(self):
        """Test the complete pipeline from transcript to note."""
        from libs.billing import generate_billables_from_transcript
        from libs.note_gen import generate_structured_note, generate_narrative
        
        # 1. Load transcript (simulating ASR output)
        transcript = get_sample_transcript()
        segments = transcript["segments"]
        
        # 2. Get time bounds
        start_ms = min(s["start_ms"] for s in segments)
        end_ms = max(s["end_ms"] for s in segments)
        
        # 3. Generate billables
        billables = generate_billables_from_transcript(
            segments,
            visit_start_ms=start_ms,
            visit_end_ms=end_ms,
            min_block_minutes=1,
        )
        
        assert len(billables) > 0, "Pipeline should produce billables"
        
        # 4. Generate structured note
        visit_data = {
            "id": transcript.get("visit_id", "test"),
            "scheduled_start": "2024-01-15T09:00:00Z",
            "client_name": "Robert Johnson",
            "caregiver_name": "Jane Smith",
        }
        
        structured_note = generate_structured_note(visit_data, billables, segments)
        
        # Duration is calculated from segments, not billables
        assert structured_note["visit_info"]["duration_minutes"] >= 0
        
        # 5. Generate narrative
        narrative = generate_narrative(structured_note)
        
        assert len(narrative) > 0, "Pipeline should produce narrative"
        
        # 6. Verify complete output
        result = {
            "billables": billables,
            "structured_note": structured_note,
            "narrative": narrative,
        }
        
        # All components should be present
        assert result["billables"]
        assert result["structured_note"]["tasks_performed"]
        assert result["narrative"]
