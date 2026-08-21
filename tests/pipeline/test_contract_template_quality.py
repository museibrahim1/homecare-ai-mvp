"""Tests for contract template service frequency and declined services."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.contract_facts import extract_declined_services, merge_declined_services
from libs.contract_template import (
    format_declined_services_list,
    format_per_service_schedule,
    format_services_list,
    generate_contract_from_template,
)


class TestExtractDeclinedServices:
    def test_bathing_decline_detected(self):
        text = (
            "You can bathe yourself. She's like, I don't want anybody bathing me. "
            "I can wash myself."
        )
        declined = extract_declined_services(text)
        names = [d["name"].lower() for d in declined]
        assert any("bath" in n for n in names)
        assert declined[0]["evidence"]

    def test_no_decline_when_bathing_requested(self):
        text = "She needs help with bathing and showering every morning."
        assert extract_declined_services(text) == []


class TestFormatServices:
    def test_frequency_always_shown(self):
        text = format_services_list(
            [
                {
                    "name": "Companion Care",
                    "description": "Companionship",
                    "frequency": "Monday through Friday 8:30am to 7:00pm",
                }
            ]
        )
        assert "Companion Care" in text
        assert "Monday through Friday 8:30am to 7:00pm" in text
        assert "Frequency:" in text

    def test_missing_frequency_gets_explicit_placeholder(self):
        text = format_services_list([{"name": "Transportation", "description": "Trips"}])
        assert "Frequency:" in text
        assert "As needed" in text

    def test_per_service_schedule_lists_each_row(self):
        text = format_per_service_schedule(
            [
                {"name": "Companion Care", "frequency": "Mon-Fri 8:30am-7:00pm"},
                {"name": "Transportation", "frequency": "As needed"},
            ]
        )
        assert "Companion Care" in text
        assert "Mon-Fri 8:30am-7:00pm" in text
        assert "Transportation" in text


class TestDeclinedInContract:
    def test_declined_section_renders_bathing(self):
        text = format_declined_services_list(
            [
                {
                    "name": "Bathing / personal hygiene assistance",
                    "evidence": "I don't want anybody bathing me",
                }
            ]
        )
        assert "Bathing" in text
        assert "I don't want anybody bathing me" in text
        assert "not included" in text.lower() or "declined" in text.lower()

    def test_full_contract_includes_declined_and_frequencies(self):
        contract = generate_contract_from_template(
            contract_data={
                "services": [
                    {
                        "name": "Companion Care",
                        "description": "Companionship for mother",
                        "frequency": "Monday through Friday 8:30am to 7:00pm",
                    },
                    {
                        "name": "Transportation",
                        "description": "Salon and grocery trips",
                        "frequency": "Monday through Friday as needed",
                    },
                ],
                "declined_services": [
                    {
                        "name": "Bathing assistance",
                        "evidence": "I don't want anybody bathing me",
                    }
                ],
                "schedule": {
                    "care_need_level": "MODERATE",
                    "preferred_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    "preferred_times": "8:30am to 7:00pm",
                },
                "hourly_rate": 18.0,
                "weekly_hours": 52.5,
            },
            client_info={"full_name": "Mrs. King"},
            assessment_data={
                "client_profile": {"primary_diagnosis": "Diabetes"},
                "declined_services": [
                    {
                        "name": "Bathing assistance",
                        "evidence": "I don't want anybody bathing me",
                    }
                ],
            },
        )
        assert "Frequency: Monday through Friday 8:30am to 7:00pm" in contract
        assert "SERVICES NOT INCLUDED" in contract
        assert "Bathing assistance" in contract
        assert "I don't want anybody bathing me" in contract
        assert "PER-SERVICE SCHEDULE" in contract or "Companion Care" in contract
        assert "====" not in contract
        assert "Severity:" not in contract


class TestSanitizeContractPlainText:
    def test_strips_equals_banners_and_severity(self):
        from libs.contract_template import sanitize_contract_plain_text, format_list

        raw = (
            "Intro line\n"
            "================================================================================\n"
            "1. SERVICES TO BE PROVIDED\n"
            "================================================================================\n"
            "• Bathroom safety equipment (Severity: High)\n"
            "Signature: _______________________________\n"
        )
        cleaned = sanitize_contract_plain_text(raw)
        assert "====" not in cleaned
        assert "Severity:" not in cleaned
        assert "1. SERVICES TO BE PROVIDED" in cleaned
        assert "________________" in cleaned
        assert "Bathroom safety equipment" in cleaned

        listed = format_list([{"concern": "Pet safety", "severity": "Medium"}])
        assert listed == "• Pet safety"
        assert "Severity" not in listed


class TestMergeDeclined:
    def test_merge_keeps_unique_by_name(self):
        merged = merge_declined_services(
            [{"name": "Bathing", "evidence": "from llm"}],
            [{"name": "Bathing", "evidence": "from heuristic"}, {"name": "Toileting", "evidence": "no"}],
        )
        names = [m["name"] for m in merged]
        assert names.count("Bathing") == 1
        assert "Toileting" in names

    def test_merge_collapses_bathing_aliases(self):
        merged = merge_declined_services(
            [{"name": "Bathing / Personal Care", "evidence": "I don't want anybody bathing me"}],
            [{"name": "Bathing assistance", "evidence": "you can bathe yourself"}],
        )
        assert len(merged) == 1
        assert "bath" in merged[0]["name"].lower()
