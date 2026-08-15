"""Tests for quoted rate/hours extraction used by contract generation."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.contract_facts import (
    clip_client_field,
    extract_stated_hourly_rate,
    extract_stated_weekly_hours,
    prefer_private_pay_rate,
    sanitize_identified_services,
)


class TestStatedHourlyRate:
    def test_extracts_dollar_an_hour(self):
        text = "Yeah it would be $18 an hour. Okay. 18."
        assert extract_stated_hourly_rate(text) == 18.0

    def test_extracts_per_hour_slash(self):
        text = "Our private pay rate is $22/hour for companion care."
        assert extract_stated_hourly_rate(text) == 22.0

    def test_no_rate_returns_none(self):
        assert extract_stated_hourly_rate("She needs companionship and grocery trips.") is None

    def test_ignores_unrelated_dollar_amounts(self):
        text = "The deductible is $500 and the copay is $40."
        assert extract_stated_hourly_rate(text) is None


class TestStatedWeeklyHours:
    def test_weekday_shift_830_to_7(self):
        text = (
            "I'm looking for someone Monday through Friday. "
            "So 08:30 to about seven. 07:00? Yeah. Okay."
        )
        hours = extract_stated_weekly_hours(text)
        assert hours is not None
        # 8:30am-7:00pm x 5 weekdays = 52.5
        assert hours == 52.5

    def test_no_schedule_returns_none(self):
        assert extract_stated_weekly_hours("She is lonely since her husband died.") is None


class TestPreferPrivatePayRate:
    def test_quoted_rate_beats_agency_default(self):
        assert prefer_private_pay_rate(
            quoted_rate=18.0,
            agency_private_pay=28.0,
            agency_default=28.0,
            care_need_level="HIGH",
        ) == 18.0

    def test_agency_rate_when_nothing_quoted(self):
        assert prefer_private_pay_rate(
            quoted_rate=None,
            agency_private_pay=28.0,
            agency_default=24.0,
            care_need_level="HIGH",
        ) == 28.0

    def test_no_system_default_when_disabled(self):
        assert prefer_private_pay_rate(
            quoted_rate=None,
            agency_private_pay=None,
            agency_default=None,
            care_need_level="LOW",
            allow_system_default=False,
        ) is None


class TestOutOfScopeAssessment:
    def test_empty_out_of_scope_has_no_rate_or_hours(self):
        from libs.pipeline_efficiency import empty_out_of_scope_assessment

        data = empty_out_of_scope_assessment(
            "Doctor said counseling costs $40 an hour for IBS diarrhea physical exam."
        )
        assert data["quoted_hourly_rate"] is None
        assert data["stated_weekly_hours"] is None
        assert data["services_identified"] == []
        assert data["recommended_schedule"]["total_hours_per_week"] == 0


class TestSanitizeAgainstTranscript:
    def test_drops_evidence_not_in_transcript(self):
        services = [
            {
                "name": "Companion Care",
                "evidence": "she is lonely since her husband passed",
            },
            {
                "name": "Personal Care",
                "evidence": "Client needs daily assistance",
            },
        ]
        transcript = "she is lonely since her husband passed. No bathing help."
        cleaned = sanitize_identified_services(services, transcript_text=transcript)
        assert [s["name"] for s in cleaned] == ["Companion Care"]


class TestSanitizeServices:
    def test_drops_placeholder_personal_care_without_evidence(self):
        services = [
            {
                "name": "Personal Care/ADL Assistance",
                "evidence": "Client needs daily assistance",
                "description": "Assistance with bathing, dressing, and grooming",
            },
            {
                "name": "Companion Care",
                "evidence": "her husband died about six months ago and she's just kinda lonely",
                "description": "Companionship",
            },
        ]
        cleaned = sanitize_identified_services(services)
        names = [s["name"] for s in cleaned]
        assert names == ["Companion Care"]

    def test_keeps_personal_care_with_real_quote(self):
        services = [
            {
                "name": "Personal Care",
                "evidence": "She needs help getting in and out of the shower",
                "description": "Bathing assistance",
            }
        ]
        assert len(sanitize_identified_services(services)) == 1

    def test_does_not_invent_fallback_services(self):
        assert sanitize_identified_services([]) == []
        assert sanitize_identified_services(None) == []


class TestClipClientField:
    def test_clips_mobility_status_to_100(self):
        long = (
            "Independent — client stated she can do everything herself; "
            "no mobility aids mentioned and she walked around freely"
        )
        clipped = clip_client_field(long, "mobility_status")
        assert clipped == "Independent"
        assert len(clipped) <= 100

    def test_hard_truncates_when_no_separator(self):
        long = "x" * 150
        clipped = clip_client_field(long, "living_situation")
        assert len(clipped) <= 100
