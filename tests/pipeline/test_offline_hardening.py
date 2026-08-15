"""Hardening tests found by offline adversarial probing (no paid APIs)."""

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.billing import detect_tasks_in_text, generate_billables_from_transcript
from libs.contract_template import format_list, generate_contract_from_template
from libs.pipeline_efficiency import heuristic_conversation_kind


RUNS = Path(__file__).resolve().parents[2] / "scripts" / "sandbox" / "assessment-runs"


class TestContractTemplateHardening:
    def test_none_rate_and_hours_do_not_crash(self):
        text = generate_contract_from_template(
            {
                "hourly_rate": None,
                "weekly_hours": None,
                "services": [{"name": "Companion Care", "frequency": "Daily"}],
                "schedule": {},
            },
            {"full_name": "Test Client"},
        )
        assert "HOME CARE SERVICE AGREEMENT" in text
        assert "Companion Care" in text

    def test_empty_string_rate_does_not_crash(self):
        text = generate_contract_from_template(
            {
                "hourly_rate": "",
                "weekly_hours": "",
                "services": [],
                "schedule": {},
            },
            {"full_name": "Test Client"},
        )
        assert "HOME CARE SERVICE AGREEMENT" in text

    def test_string_secondary_conditions_not_character_joined(self):
        text = generate_contract_from_template(
            {"hourly_rate": 18, "weekly_hours": 10, "services": [], "schedule": {}},
            {"full_name": "Test Client"},
            assessment_data={
                "client_profile": {"secondary_conditions": "diabetes"},
                "services_identified": [],
            },
        )
        assert "diabetes" in text
        assert "d, i, a, b, e, t, e, s" not in text

    def test_format_list_string_is_one_bullet(self):
        assert format_list("falls risk") == "• falls risk"


class TestBillingHardening:
    def test_detect_tasks_none_text(self):
        assert detect_tasks_in_text(None) == []
        assert detect_tasks_in_text("") == []

    def test_billables_tolerate_none_segment_text(self):
        out = generate_billables_from_transcript(
            [{"id": "1", "start_ms": 0, "end_ms": 1000, "text": None}],
            0,
            1000,
            use_llm=False,
            conversation_kind="home_care_intake",
        )
        assert out == []

    def test_rules_fallback_marks_intake_as_recommendation_not_denied(self):
        out = generate_billables_from_transcript(
            [
                {
                    "id": "1",
                    "start_ms": 0,
                    "end_ms": 60000,
                    "text": (
                        "Needs companionship and light housekeeping "
                        "and meal preparation every day"
                    ),
                }
            ],
            0,
            60000,
            use_llm=False,
            conversation_kind="training_with_embedded_intake",
        )
        assert out, "rules should still find some care categories"
        for item in out:
            assert item.get("is_recommendation") is True
            assert item.get("is_flagged") is False
            assert "Recommended from assessment" in (item.get("flag_reason") or "")


class TestOutOfScopeBillablesEmpty:
    def test_out_of_scope_never_emits_rules_billables(self):
        """If Claude is down, keyword rules must not invent home-care billables
        from clinic/medical interview language."""
        out = generate_billables_from_transcript(
            [
                {
                    "id": "1",
                    "start_ms": 0,
                    "end_ms": 60000,
                    "text": (
                        "Doctor discusses diarrhea, medication, and counseling. "
                        "Physical exam can wait. She takes medicine every day."
                    ),
                }
            ],
            0,
            60000,
            use_llm=False,
            conversation_kind="out_of_scope",
        )
        assert out == []


class TestHeuristicUsesFullTranscript:
    def test_real_intake_role_play_transcript(self):
        path = RUNS / "assess1_transcript.txt"
        if not path.exists():
            return
        text = path.read_text(encoding="utf-8", errors="replace")
        assert heuristic_conversation_kind(text) == "training_with_embedded_intake"

    def test_real_clinic_interview_transcript(self):
        path = RUNS / "assess2_transcript.txt"
        if not path.exists():
            return
        text = path.read_text(encoding="utf-8", errors="replace")
        assert heuristic_conversation_kind(text) == "out_of_scope"
