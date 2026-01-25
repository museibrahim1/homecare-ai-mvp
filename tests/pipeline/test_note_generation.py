"""Tests for note generation in the pipeline."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'worker'))

from libs.note_gen import (
    generate_structured_note,
    generate_narrative,
    _generate_observations,
    _detect_concerns,
)


class TestObservationGeneration:
    """Tests for observation generation from transcript."""

    def test_empty_segments(self):
        """Test with no transcript segments."""
        result = _generate_observations([])
        assert result == "Visit conducted as scheduled."

    def test_positive_indicators(self):
        """Test detection of positive indicators."""
        segments = [
            {"text": "How are you feeling today?"},
            {"text": "I'm feeling good, thank you."},
        ]
        result = _generate_observations(segments)
        assert "good spirits" in result

    def test_pain_detection(self):
        """Test detection of pain mentions."""
        segments = [
            {"text": "My back hurts today."},
        ]
        result = _generate_observations(segments)
        assert "discomfort" in result

    def test_appetite_discussion(self):
        """Test detection of appetite discussion."""
        segments = [
            {"text": "Have you been eating well?"},
            {"text": "Yes, my appetite has been good."},
        ]
        result = _generate_observations(segments)
        assert "Appetite" in result

    def test_sleep_discussion(self):
        """Test detection of sleep discussion."""
        segments = [
            {"text": "I'm feeling tired today."},
            {"text": "Did you sleep well last night?"},
        ]
        result = _generate_observations(segments)
        assert "Sleep" in result

    def test_no_notable_observations(self):
        """Test when no keywords match."""
        segments = [
            {"text": "The weather is nice today."},
            {"text": "Yes, it's a beautiful day."},
        ]
        result = _generate_observations(segments)
        assert "without notable concerns" in result


class TestConcernDetection:
    """Tests for concern detection from transcript."""

    def test_empty_segments(self):
        """Test with no transcript segments."""
        result = _detect_concerns([])
        assert result == "None noted."

    def test_fall_risk(self):
        """Test detection of fall risk."""
        segments = [{"text": "I almost had a fall yesterday."}]
        result = _detect_concerns(segments)
        assert "Fall risk" in result

    def test_dizziness(self):
        """Test detection of dizziness."""
        segments = [{"text": "I've been feeling dizzy lately."}]
        result = _detect_concerns(segments)
        assert "Dizziness" in result

    def test_confusion(self):
        """Test detection of confusion."""
        segments = [{"text": "She seemed confused about her medication schedule."}]
        result = _detect_concerns(segments)
        assert "Confusion" in result

    def test_memory_concerns(self):
        """Test detection of memory issues."""
        segments = [{"text": "I forgot to take my medication."}]
        result = _detect_concerns(segments)
        assert "Memory concerns" in result

    def test_multiple_concerns(self):
        """Test detection of multiple concerns."""
        segments = [
            {"text": "I had a fall last week."},
            {"text": "I've also been feeling dizzy and forgot my pills."},
        ]
        result = _detect_concerns(segments)
        assert "Fall risk" in result
        assert "Dizziness" in result
        assert "Memory concerns" in result

    def test_no_concerns(self):
        """Test when no concerns detected."""
        segments = [{"text": "Everything is fine today."}]
        result = _detect_concerns(segments)
        assert result == "None noted."


class TestStructuredNoteGeneration:
    """Tests for complete structured note generation."""

    def test_basic_note_generation(self):
        """Test basic note generation."""
        visit_data = {
            "id": "123",
            "scheduled_start": "2024-01-15T09:00:00Z",
            "client_name": "John Smith",
            "caregiver_name": "Jane Doe",
        }
        billables = [
            {"category": "MED_REMINDER", "description": "Medication reminder", "minutes": 10},
            {"category": "MEAL_PREP", "description": "Meal preparation", "minutes": 20},
        ]
        segments = [{"text": "Let me help you with your medication."}]

        result = generate_structured_note(visit_data, billables, segments)

        assert result["visit_info"]["visit_id"] == "123"
        assert result["visit_info"]["client_name"] == "John Smith"
        assert result["visit_info"]["duration_minutes"] == 30
        assert len(result["tasks_performed"]) == 2
        assert result["client_condition"] == "stable"

    def test_note_with_adjusted_minutes(self):
        """Test that adjusted minutes are used when available."""
        visit_data = {"id": "123"}
        billables = [
            {"category": "MED_REMINDER", "description": "Medication", "minutes": 10, "adjusted_minutes": 15},
        ]
        segments = []

        result = generate_structured_note(visit_data, billables, segments)

        # Should use adjusted_minutes (15) not minutes (10)
        assert result["tasks_performed"][0]["duration_minutes"] == 15

    def test_note_with_no_billables(self):
        """Test note generation with no billable items."""
        visit_data = {"id": "123"}
        billables = []
        segments = [{"text": "Just checking in today."}]

        result = generate_structured_note(visit_data, billables, segments)

        assert result["visit_info"]["duration_minutes"] == 0
        assert result["tasks_performed"] == []


class TestNarrativeGeneration:
    """Tests for narrative note generation."""

    def test_basic_narrative(self):
        """Test basic narrative generation."""
        structured_data = {
            "visit_info": {
                "date": "2024-01-15",
                "duration_minutes": 30,
            },
            "tasks_performed": [
                {"description": "Medication reminder"},
                {"description": "Meal preparation"},
            ],
            "observations": "Client appeared in good spirits.",
            "risks_concerns": "None noted.",
        }

        result = generate_narrative(structured_data)

        assert "2024-01-15" in result
        assert "30 minutes" in result
        assert "Medication reminder" in result
        assert "Meal preparation" in result
        assert "good spirits" in result
        assert "stable condition" in result

    def test_narrative_with_concerns(self):
        """Test narrative with concerns noted."""
        structured_data = {
            "visit_info": {
                "date": "2024-01-15",
                "duration_minutes": 45,
            },
            "tasks_performed": [],
            "observations": "",
            "risks_concerns": "Fall risk mentioned; Dizziness reported",
        }

        result = generate_narrative(structured_data)

        assert "Fall risk" in result
        assert "Dizziness" in result

    def test_narrative_empty_tasks(self):
        """Test narrative when no tasks were performed."""
        structured_data = {
            "visit_info": {
                "date": "2024-01-15",
                "duration_minutes": 20,
            },
            "tasks_performed": [],
            "observations": "Visit completed without notable concerns.",
            "risks_concerns": "None noted.",
        }

        result = generate_narrative(structured_data)

        assert "Services provided" not in result
        assert "Visit completed" in result
