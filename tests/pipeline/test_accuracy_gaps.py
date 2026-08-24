"""Accuracy tests for note kind wiring, billable recommendations, deep prompt."""

import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.billing import format_billable_description, generate_billables_from_transcript
from libs.contract_template import format_declined_services_list
from libs.llm import LLMService


class TestNoteUsesAuthoritativeKind:
    def test_forces_documentation_type_from_pipeline_kind(self, monkeypatch):
        service = LLMService(anthropic_api_key="test", model="claude-sonnet-4-6")

        def fake_call(system_prompt, user_prompt, json_response=True, max_tokens=3072):
            assert "AUTHORITATIVE documentation_type" in system_prompt
            assert "training_with_embedded_intake" in system_prompt
            assert "Do not reclassify" in system_prompt
            return '{"documentation_type":"home_care_visit","narrative":"wrong type","tasks_summary":[]}'

        monkeypatch.setattr(service, "_call_llm", fake_call)
        out = service.generate_visit_note(
            "Coach Michelle role play intake for Mom who is lonely.",
            {"client_name": "Test"},
            [],
            conversation_kind="training_with_embedded_intake",
        )
        assert out["documentation_type"] == "training_with_embedded_intake"


class TestBillableRecommendations:
    def test_description_includes_frequency(self):
        desc = format_billable_description(
            "Companionship",
            [
                {
                    "task": "Companionship",
                    "evidence": "provide the companionship",
                    "frequency": "Monday through Friday",
                }
            ],
        )
        assert "Monday through Friday" in desc
        assert "provide the companionship" in desc

    def test_intake_items_are_flagged_recommendations(self, monkeypatch):
        monkeypatch.setattr(
            "libs.billing.analyze_transcript_with_claude",
            lambda segments, conversation_kind=None: [
                {
                    "category": "COMPANIONSHIP",
                    "task": "Companionship",
                    "evidence": "provide the companionship",
                    "priority": "HIGH",
                    "frequency": "Monday through Friday",
                }
            ],
        )
        segments = [
            {
                "id": "1",
                "start_ms": 0,
                "end_ms": 60000,
                "text": "really want someone to provide the companionship",
            }
        ]
        result = generate_billables_from_transcript(
            segments,
            0,
            60000,
            conversation_kind="training_with_embedded_intake",
        )
        assert len(result) == 1
        assert result[0]["minutes"] == 0
        assert result[0]["is_recommendation"] is True
        assert result[0]["is_flagged"] is False
        assert "Recommended from assessment" in (result[0]["flag_reason"] or "")
        assert result[0]["frequency"] == "Monday through Friday"


class TestDeepPromptNoInventedRates:
    def test_deep_prompt_does_not_default_to_high_dollar_rates(self):
        # Read source of the deep method prompt via file snippet search
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "apps",
            "worker",
            "libs",
            "llm.py",
        )
        text = open(path).read()
        assert "DEFAULT TO HIGH" not in text
        assert "$35/hour" not in text
        assert "Do not default to HIGH" in text


class TestDeclinedMaidCopy:
    def test_maid_decline_preserves_light_housekeeping(self):
        text = format_declined_services_list(
            [
                {
                    "name": "Maid / Deep Cleaning Service",
                    "evidence": "So you don't offer maid service? No. No maid service",
                }
            ]
        )
        assert "Light Housekeeping" in text
        assert "not remove" in text.lower() or "does not remove" in text.lower()
