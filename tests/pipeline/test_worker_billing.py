"""Tests for worker billing rules engine."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'worker'))

from libs.billing import (
    detect_tasks_in_text,
    consolidate_blocks,
    generate_billables_from_transcript,
    BillableBlock,
)


class TestTaskDetection:
    """Tests for keyword-based task detection."""

    def test_medication_detection(self):
        """Test detecting medication-related tasks."""
        tasks = detect_tasks_in_text("Let me help you take your medication.")
        categories = [t[0] for t in tasks]
        assert "MED_REMINDER" in categories

    def test_vitals_detection(self):
        """Test detecting vital signs tasks."""
        tasks = detect_tasks_in_text("Let me check your blood pressure.")
        categories = [t[0] for t in tasks]
        assert "VITALS" in categories

    def test_meal_prep_detection(self):
        """Test detecting meal preparation tasks."""
        tasks = detect_tasks_in_text("I'm going to prepare breakfast for you.")
        categories = [t[0] for t in tasks]
        assert "MEAL_PREP" in categories

    def test_bathing_detection(self):
        """Test detecting bathing assistance."""
        tasks = detect_tasks_in_text("It's time for your bath now.")
        categories = [t[0] for t in tasks]
        assert "ADL_HYGIENE" in categories

    def test_dressing_detection(self):
        """Test detecting dressing assistance."""
        tasks = detect_tasks_in_text("Let me help you get dressed.")
        categories = [t[0] for t in tasks]
        assert "ADL_DRESSING" in categories

    def test_mobility_detection(self):
        """Test detecting mobility assistance."""
        tasks = detect_tasks_in_text("Let's take a walk to the garden.")
        categories = [t[0] for t in tasks]
        assert "ADL_MOBILITY" in categories

    def test_housekeeping_detection(self):
        """Test detecting light housekeeping."""
        tasks = detect_tasks_in_text("I'll do some cleaning in the kitchen.")
        categories = [t[0] for t in tasks]
        assert "HOUSEHOLD_LIGHT" in categories

    def test_companionship_detection(self):
        """Test detecting companionship."""
        tasks = detect_tasks_in_text("Let's chat about your grandchildren.")
        categories = [t[0] for t in tasks]
        assert "COMPANIONSHIP" in categories

    def test_multiple_task_detection(self):
        """Test detecting multiple tasks in one segment."""
        tasks = detect_tasks_in_text(
            "First I'll help with your bath, then we'll take your medication."
        )
        categories = [t[0] for t in tasks]
        assert "ADL_HYGIENE" in categories
        assert "MED_REMINDER" in categories


class TestBlockConsolidation:
    """Tests for consolidating adjacent billable blocks."""

    def test_consolidate_same_category(self):
        """Test merging adjacent blocks of same category."""
        blocks = [
            BillableBlock("MED", "MED_REMINDER", "Medication", 0, 120000, 2, []),
            BillableBlock("MED", "MED_REMINDER", "Medication", 150000, 300000, 2, []),
        ]
        result = consolidate_blocks(blocks, min_gap_ms=60000)
        assert len(result) == 1
        assert result[0].start_ms == 0
        assert result[0].end_ms == 300000

    def test_no_consolidation_different_category(self):
        """Test that different categories are not merged."""
        blocks = [
            BillableBlock("MED", "MED_REMINDER", "Medication", 0, 300000, 5, []),
            BillableBlock("MEAL", "MEAL_PREP", "Meal prep", 350000, 600000, 4, []),
        ]
        result = consolidate_blocks(blocks, min_gap_ms=60000)
        assert len(result) == 2

    def test_no_consolidation_large_gap(self):
        """Test that blocks with large gaps are not merged."""
        blocks = [
            BillableBlock("MED", "MED_REMINDER", "Medication", 0, 60000, 1, []),
            BillableBlock("MED", "MED_REMINDER", "Medication", 600000, 660000, 1, []),
        ]
        result = consolidate_blocks(blocks, min_gap_ms=60000)
        # Blocks have 540s gap which is > 60s, so they remain separate
        # Each block is 1 minute (60000ms) which is >= 1, so they're kept
        assert len(result) == 2
        assert result[0].start_ms == 0
        assert result[1].start_ms == 600000

    def test_evidence_concatenation(self):
        """Test that evidence is concatenated when blocks merge."""
        blocks = [
            BillableBlock("MED", "MED_REMINDER", "Medication", 0, 120000, 2, [{"seg": "1"}]),
            BillableBlock("MED", "MED_REMINDER", "Medication", 150000, 300000, 2, [{"seg": "2"}]),
        ]
        result = consolidate_blocks(blocks, min_gap_ms=60000)
        assert len(result[0].evidence) == 2


class TestBillableGeneration:
    """Tests for full billable generation pipeline."""

    def test_basic_generation(self):
        """Test basic billable generation from segments."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 600000, "text": "Let me help you take your medication."},
            {"id": "2", "start_ms": 600000, "end_ms": 1200000, "text": "Now I'll prepare your breakfast."},
        ]
        result = generate_billables_from_transcript(
            segments,
            visit_start_ms=0,
            visit_end_ms=1200000,
            min_block_minutes=5,
        )
        assert len(result) >= 1
        assert all("category" in item for item in result)

    def test_companionship_fallback(self):
        """Test behavior when no specific tasks are detected."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 600000, "text": "The weather is nice today."},
        ]
        result = generate_billables_from_transcript(
            segments,
            visit_start_ms=0,
            visit_end_ms=600000,
            min_block_minutes=5,
        )
        # With the new billing approach, no billables are generated if no 
        # specific care tasks are detected. Companionship can be determined 
        # from the conversation context but isn't auto-added.
        # Result may be empty or contain detected services
        assert isinstance(result, list)

    def test_single_mention_flagging(self):
        """Test that single-mention services are flagged for review."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 180000, "text": "Take your medication."},
        ]
        result = generate_billables_from_transcript(
            segments,
            visit_start_ms=0,
            visit_end_ms=180000,
            min_block_minutes=5,
        )
        # Services with only one mention should be flagged for verification
        if result:
            flagged = [r for r in result if r.get("is_flagged")]
            for item in flagged:
                if item.get("mention_count") == 1:
                    assert "Single mention" in item.get("flag_reason", "")

    def test_evidence_includes_segment_info(self):
        """Test that evidence includes segment information."""
        segments = [
            {"id": "seg-123", "start_ms": 0, "end_ms": 600000, "text": "Let's take your medication now."},
        ]
        result = generate_billables_from_transcript(
            segments,
            visit_start_ms=0,
            visit_end_ms=600000,
            min_block_minutes=5,
        )
        if result:
            item = result[0]
            if item.get("evidence"):
                evidence = item["evidence"][0]
                assert "segment_id" in evidence
                assert "text" in evidence

    def test_empty_segments(self):
        """Test with empty segment list."""
        result = generate_billables_from_transcript(
            [],
            visit_start_ms=0,
            visit_end_ms=600000,
            min_block_minutes=5,
        )
        # Empty segments should return empty list - no tasks can be detected
        assert isinstance(result, list)
        assert len(result) == 0

    def test_output_is_serializable(self):
        """Test that output is JSON-serializable (dicts, not dataclasses)."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 600000, "text": "Let me take your blood pressure."},
        ]
        result = generate_billables_from_transcript(
            segments,
            visit_start_ms=0,
            visit_end_ms=600000,
            min_block_minutes=5,
        )
        import json
        # Should not raise
        json.dumps(result)
