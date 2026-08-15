"""Quality gates for grounded, reviewable billables."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.billing import (
    detect_tasks_in_text,
    evidence_appears_in_transcript,
    filter_grounded_claude_services,
    format_billable_description,
    generate_billables_from_transcript,
)


INTAKE_SNIPPET = (
    "really want someone to be there with her that provide the companionship. "
    "Take her to the hair salon, nail salon, pick up her groceries. "
    "She doesn't want the caregiver to cook for her but she wants help cook. "
    "she tidies up all of the areas of your mother needs. "
    "I don't want anybody bathing me."
)


class TestEvidenceGrounding:
    def test_exact_quote_matches(self):
        assert evidence_appears_in_transcript(
            "provide the companionship",
            INTAKE_SNIPPET,
        )

    def test_invented_quote_rejected(self):
        assert not evidence_appears_in_transcript(
            "client needs daily assistance with all ADLs",
            INTAKE_SNIPPET,
        )

    def test_empty_evidence_rejected(self):
        assert not evidence_appears_in_transcript("", INTAKE_SNIPPET)


class TestFilterClaudeServices:
    def test_drops_supervision_without_safety_need(self):
        services = [
            {
                "category": "COMPANIONSHIP",
                "task": "Companionship",
                "evidence": "provide the companionship",
                "priority": "HIGH",
                "frequency": "Mon-Fri",
            },
            {
                "category": "SUPERVISION",
                "task": "Supervision",
                "evidence": "we will supervise the intake process with Sharon",
                "priority": "MEDIUM",
                "frequency": "As needed",
            },
        ]
        kept = filter_grounded_claude_services(services, INTAKE_SNIPPET)
        cats = [s["category"] for s in kept]
        assert "COMPANIONSHIP" in cats
        assert "SUPERVISION" not in cats

    def test_keeps_supervision_when_cannot_leave_alone(self):
        text = "She cannot be left alone during the day. We need supervision while I work."
        services = [
            {
                "category": "SUPERVISION",
                "task": "Safety supervision",
                "evidence": "She cannot be left alone during the day",
                "priority": "HIGH",
                "frequency": "Daily",
            }
        ]
        kept = filter_grounded_claude_services(services, text)
        assert len(kept) == 1

    def test_drops_service_with_invented_evidence(self):
        services = [
            {
                "category": "PERSONAL_CARE",
                "task": "Bathing",
                "evidence": "Client needs daily assistance",
                "priority": "HIGH",
                "frequency": "Daily",
            }
        ]
        assert filter_grounded_claude_services(services, INTAKE_SNIPPET) == []


class TestBillableDescription:
    def test_description_uses_quote_not_task_count(self):
        desc = format_billable_description(
            "Companionship",
            [
                {
                    "task": "Companionship",
                    "evidence": "provide the companionship",
                    "priority": "HIGH",
                }
            ],
        )
        assert "tasks identified" not in desc.lower()
        assert "companionship" in desc.lower()
        assert "provide the companionship" in desc

    def test_multiple_tasks_joined_with_quotes(self):
        desc = format_billable_description(
            "Transportation",
            [
                {"task": "Hair salon trips", "evidence": "Take her to the hair salon"},
                {"task": "Grocery trips", "evidence": "pick up her groceries"},
            ],
        )
        assert "tasks identified" not in desc.lower()
        assert "hair salon" in desc.lower()
        assert "groceries" in desc.lower()


class TestKeywordSupervision:
    def test_bare_supervision_word_is_not_enough(self):
        tasks = detect_tasks_in_text(
            "Coach Michelle will supervise Sharon during the role play intake."
        )
        categories = [t[0] for t in tasks]
        assert "SUPERVISION" not in categories

    def test_cannot_be_left_alone_is_supervision(self):
        tasks = detect_tasks_in_text(
            "Mom cannot be left alone. We need safety monitoring while I work."
        )
        categories = [t[0] for t in tasks]
        assert "SUPERVISION" in categories


class TestGenerateWithGroundedClaude:
    def test_descriptions_never_say_tasks_identified(self, monkeypatch):
        services = [
            {
                "category": "COMPANIONSHIP",
                "task": "Companionship",
                "evidence": "provide the companionship",
                "priority": "HIGH",
                "frequency": "Monday through Friday",
            },
            {
                "category": "SUPERVISION",
                "task": "Supervision",
                "evidence": "supervise the role play training",
                "priority": "LOW",
                "frequency": "As needed",
            },
        ]
        monkeypatch.setattr(
            "libs.billing.analyze_transcript_with_claude",
            lambda segments: services,
        )
        segments = [
            {
                "id": "1",
                "start_ms": 0,
                "end_ms": 60000,
                "text": INTAKE_SNIPPET,
            }
        ]
        result = generate_billables_from_transcript(
            segments, visit_start_ms=0, visit_end_ms=60000, use_llm=True
        )
        cats = [r["category"] for r in result]
        assert "Companionship" in cats
        assert "Supervision" not in cats
        for item in result:
            assert "tasks identified" not in item["description"].lower()
            assert item.get("evidence")
