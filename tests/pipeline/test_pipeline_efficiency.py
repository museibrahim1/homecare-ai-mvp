"""Tests for pipeline efficiency helpers."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.pipeline_efficiency import (
    empty_out_of_scope_assessment,
    heuristic_conversation_kind,
    trim_transcript_for_llm,
)


class TestTrimTranscript:
    def test_short_text_unchanged(self):
        assert trim_transcript_for_llm("hello", max_chars=100) == "hello"

    def test_long_text_keeps_head_and_tail(self):
        text = "A" * 1000 + "MIDDLE" + "Z" * 1000
        out = trim_transcript_for_llm(text, max_chars=400)
        assert len(out) < len(text)
        assert out.startswith("A")
        assert out.endswith("Z")
        assert "omitted for speed" in out


class TestHeuristicKind:
    def test_clinic_interview_is_out_of_scope(self):
        text = (
            "Hello, I'm Doctor Drossman. Hi Doctor. Ms. Smith has diarrhea and IBS. "
            "Out of role. Am I supposed to not know you? Counseling is recommended. "
            "The physical exam can wait. Doctor, what about irritable bowel?"
        )
        assert heuristic_conversation_kind(text) == "out_of_scope"

    def test_intake_role_play_training(self):
        text = (
            "This is coach Michelle coming to you live. Role play with my clients. "
            "Give a shout out. She needs companionship and home care Monday through Friday "
            "at eighteen an hour. Service agreement and intake paperwork today."
        )
        assert heuristic_conversation_kind(text) == "training_with_embedded_intake"


class TestEmptyOutOfScope:
    def test_builds_empty_services_and_no_rate(self):
        text = "This clinic visit costs money. Not home care. Maybe $40 something else."
        data = empty_out_of_scope_assessment(text)
        assert data["conversation_kind"] == "out_of_scope"
        assert data["services_identified"] == []
        assert data["quoted_hourly_rate"] is None
        assert data["eicna_assessment"]["care_need_level"] == "LOW"
