"""Tests for billing rules engine."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'apps', 'api'))

from app.services.billing_rules import (
    detect_tasks_in_text,
    generate_billables_from_segments,
    consolidate_blocks,
    BillableBlock,
)


class TestTaskDetection:
    """Tests for task detection from text."""
    
    def test_detect_medication_reminder(self):
        """Test detecting medication-related tasks."""
        text = "Let me help you take your medication now."
        tasks = detect_tasks_in_text(text)
        assert any(t[0] == "MED_REMINDER" for t in tasks)
    
    def test_detect_meal_prep(self):
        """Test detecting meal preparation tasks."""
        text = "I'm going to prepare your breakfast."
        tasks = detect_tasks_in_text(text)
        assert any(t[0] == "MEAL_PREP" for t in tasks)
    
    def test_detect_hygiene(self):
        """Test detecting hygiene-related tasks."""
        text = "Let's help you with your bath today."
        tasks = detect_tasks_in_text(text)
        assert any(t[0] == "ADL_HYGIENE" for t in tasks)
    
    def test_detect_vitals(self):
        """Test detecting vital signs tasks."""
        text = "I need to check your blood pressure."
        tasks = detect_tasks_in_text(text)
        assert any(t[0] == "VITALS" for t in tasks)
    
    def test_no_detection_general_text(self):
        """Test that general conversation doesn't trigger specific tasks."""
        text = "The weather is nice today."
        tasks = detect_tasks_in_text(text)
        # Only companionship should match
        assert not any(t[0] in ["MED_REMINDER", "MEAL_PREP", "ADL_HYGIENE"] for t in tasks)


class TestBillableGeneration:
    """Tests for billable item generation."""
    
    def test_generate_billables_from_segments(self):
        """Test generating billables from transcript segments."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 300000, "text": "Let me help you with your medication."},
            {"id": "2", "start_ms": 300000, "end_ms": 600000, "text": "I'll prepare some breakfast now."},
            {"id": "3", "start_ms": 600000, "end_ms": 900000, "text": "How are you feeling today?"},
        ]
        
        billables = generate_billables_from_segments(
            segments,
            visit_start_ms=0,
            visit_end_ms=900000,
            min_block_minutes=1,
        )
        
        assert len(billables) > 0
        assert all("category" in b for b in billables)
        assert all("minutes" in b for b in billables)
    
    def test_generate_default_companionship(self):
        """Test that default companionship is created when no tasks detected."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 600000, "text": "The weather is nice."},
        ]
        
        billables = generate_billables_from_segments(
            segments,
            visit_start_ms=0,
            visit_end_ms=600000,
            min_block_minutes=5,
        )
        
        # Should have at least one billable (companionship fallback)
        assert len(billables) >= 1
    
    def test_minimum_block_duration(self):
        """Test that short blocks are flagged."""
        segments = [
            {"id": "1", "start_ms": 0, "end_ms": 60000, "text": "Take your pills."},  # 1 minute
        ]
        
        billables = generate_billables_from_segments(
            segments,
            visit_start_ms=0,
            visit_end_ms=60000,
            min_block_minutes=5,
        )
        
        # Short blocks should be flagged
        for b in billables:
            if b["minutes"] < 5:
                assert b["is_flagged"] is True


class TestBlockConsolidation:
    """Tests for consolidating adjacent blocks."""
    
    def test_consolidate_same_category(self):
        """Test consolidating adjacent blocks of same category."""
        blocks = [
            BillableBlock(
                code="MED_REMINDER",
                category="MED_REMINDER",
                description="Medication",
                start_ms=0,
                end_ms=120000,
                minutes=2,
                evidence=[],
            ),
            BillableBlock(
                code="MED_REMINDER",
                category="MED_REMINDER",
                description="Medication",
                start_ms=150000,
                end_ms=300000,
                minutes=2,
                evidence=[],
            ),
        ]
        
        consolidated = consolidate_blocks(blocks, min_gap_ms=60000)
        
        # Should be merged into one block
        assert len(consolidated) == 1
        assert consolidated[0].category == "MED_REMINDER"
    
    def test_no_consolidation_different_category(self):
        """Test that different categories are not consolidated."""
        blocks = [
            BillableBlock(
                code="MED_REMINDER",
                category="MED_REMINDER",
                description="Medication",
                start_ms=0,
                end_ms=300000,
                minutes=5,
                evidence=[],
            ),
            BillableBlock(
                code="MEAL_PREP",
                category="MEAL_PREP",
                description="Meal",
                start_ms=350000,
                end_ms=600000,
                minutes=4,
                evidence=[],
            ),
        ]
        
        consolidated = consolidate_blocks(blocks, min_gap_ms=60000)
        
        # Should remain separate
        assert len(consolidated) == 2
