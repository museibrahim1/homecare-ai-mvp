"""Tests for pipeline efficiency helpers."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.pipeline_efficiency import (
    assessment_mode_instructions,
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

    def test_home_care_with_doctor_mention_is_not_out_of_scope(self):
        text = (
            "The doctor said she needs help at home. A caregiver will provide "
            "companionship Monday through Friday at twenty an hour. "
            "This is a home care intake and the service agreement is ready."
        )
        assert heuristic_conversation_kind(text) != "out_of_scope"

    def test_intake_role_play_training(self):
        text = (
            "This is coach Michelle coming to you live. Role play with my clients. "
            "Give a shout out. She needs companionship and home care Monday through Friday "
            "at eighteen an hour. Service agreement and intake paperwork today."
        )
        assert heuristic_conversation_kind(text) == "training_with_embedded_intake"

    def test_simulated_patient_interview_with_home_need_is_assessment(self):
        text = (
            "Hello, I'm Doctor Drossman. Out of role. She can't do hardly anything "
            "around the house. We need some help. The kids have special needs."
        )
        assert heuristic_conversation_kind(text) != "out_of_scope"
        assert heuristic_conversation_kind(text) == "training_with_embedded_intake"


class TestEmptyOutOfScope:
    def test_builds_empty_services_and_no_rate(self):
        text = "This clinic visit costs money. Not home care. Maybe $40 something else."
        data = empty_out_of_scope_assessment(text)
        assert data["conversation_kind"] == "out_of_scope"
        assert data["services_identified"] == []
        assert data["quoted_hourly_rate"] is None
        assert data["eicna_assessment"]["care_need_level"] == "LOW"


class TestAssessmentModeInstructions:
    def test_in_scope_forbids_empty_clinic_skip(self):
        text = assessment_mode_instructions("training_with_embedded_intake")
        assert "Do not relabel as out_of_scope" in text
        assert "around the house" in text

    def test_out_of_scope_has_no_override(self):
        assert assessment_mode_instructions("out_of_scope") == ""
