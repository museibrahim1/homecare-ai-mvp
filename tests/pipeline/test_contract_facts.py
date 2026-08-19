"""Tests for quoted rate/hours extraction used by contract generation."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.contract_facts import (
    apply_in_scope_home_need_fallback,
    clip_client_field,
    extract_stated_hourly_rate,
    extract_stated_weekly_hours,
    grounded_home_need_services,
    prefer_private_pay_rate,
    sanitize_identified_services,
    sanitize_recommended_schedule,
    sanitize_care_plan_goals,
    is_admin_checklist_care_goal,
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

    def test_hours_per_week_phrase(self):
        text = "She needs about 10 hours a week of companion care."
        assert extract_stated_weekly_hours(text) == 10.0

    def test_hours_per_day_times_days(self):
        text = "We want 4 hours a day, 5 days a week."
        assert extract_stated_weekly_hours(text) == 20.0

    def test_no_schedule_returns_none(self):
        assert extract_stated_weekly_hours("She is lonely since her husband died.") is None


class TestSanitizeRecommendedSchedule:
    def test_strips_tbd_zero_hour_rows_and_keeps_stated(self):
        dirty = {
            "frequency": "To be determined following full assessment.",
            "total_hours_per_week": 0,
            "service_hours": [
                {
                    "service": "Personal Care",
                    "need_level": "To Be Determined",
                    "hours_per_week": 0,
                    "rationale": "Requires full Nebraska Care Management Program Assessment",
                },
                {
                    "service": "Meal Services",
                    "need_level": "To Be Determined",
                    "hours_per_week": 0,
                },
            ],
            "rationale": (
                "No schedule can be recommended without a completed assessment. "
                "Patricia Martinez requires a full in-person assessment before any "
                "care plan or schedule can be established."
            ),
        }
        cleaned = sanitize_recommended_schedule(dirty, stated_weekly_hours=20.0)
        assert cleaned["total_hours_per_week"] == 20.0
        assert "to be determined" not in (cleaned.get("frequency") or "").lower()
        assert cleaned["service_hours"]
        assert cleaned["service_hours"][0]["hours_per_week"] == 20.0
        assert cleaned.get("rationale") == ""

    def test_drops_zero_hour_rows_without_stated(self):
        dirty = {
            "frequency": "To be determined",
            "service_hours": [
                {"service": "Personal Care", "hours_per_week": 0, "need_level": "TBD"},
            ],
        }
        cleaned = sanitize_recommended_schedule(dirty, stated_weekly_hours=None)
        assert cleaned["service_hours"] == []
        assert cleaned.get("frequency") == ""


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


class TestSanitizeCarePlanGoals:
    def test_drops_nebraska_admin_checklist(self):
        goals = {
            "short_term": [
                "Complete full Nebraska Care Management Program Assessment within 5 business days of referral",
                "Maintain morning shower safety with standby assist",
            ],
            "maintenance_goals": [
                "Obtain Heritage Health managed care prior authorization for identified services",
            ],
        }
        cleaned = sanitize_care_plan_goals(goals)
        assert cleaned["short_term"] == ["Maintain morning shower safety with standby assist"]
        assert cleaned["maintenance_goals"] == []

    def test_keeps_visit_derived_goals(self):
        assert not is_admin_checklist_care_goal(
            "Support safe evening medication use without missed doses"
        )


INTERVIEW_SNIPPET = (
    "Hello, I'm Doctor Drossman. Out of role. "
    "Yeah, it is. Because I mean, you know, she can't do hardly anything around the house. "
    "We need some help. The kids have special needs."
)


class TestGroundedHomeNeedFallback:
    def test_extracts_housework_and_help_quotes(self):
        services = grounded_home_need_services(INTERVIEW_SNIPPET)
        names = [s["name"] for s in services]
        assert "Homemaker" in names
        assert "Companion Care" in names
        assert "around the house" in services[0]["evidence"].lower()

    def test_fills_empty_clinic_extract_for_in_scope_kind(self):
        data = apply_in_scope_home_need_fallback(
            {
                "services_identified": [],
                "care_plan_goals": {"short_term": [], "long_term": [], "maintenance": []},
                "eicna_assessment": {
                    "care_need_level": "LOW",
                    "rationale": "No in-home care need. Physician training, not a home care intake.",
                },
            },
            INTERVIEW_SNIPPET,
            "training_with_embedded_intake",
        )
        assert data["conversation_kind"] == "training_with_embedded_intake"
        assert data["home_need_fallback"] is True
        assert data["services_identified"]
        assert data["care_plan_goals"]["short_term"]
        assert "cannot manage around the house" in data["eicna_assessment"]["rationale"]
        assert data["eicna_assessment"]["care_need_level"] == "MODERATE"

    def test_does_not_fill_true_out_of_scope(self):
        data = apply_in_scope_home_need_fallback(
            {"services_identified": []},
            INTERVIEW_SNIPPET,
            "out_of_scope",
        )
        assert data.get("services_identified") == []
        assert not data.get("home_need_fallback")

    def test_replaces_ungrounded_llm_services(self):
        data = apply_in_scope_home_need_fallback(
            {
                "services_identified": [
                    {"name": "Personal Care", "evidence": "client needs daily assistance"}
                ],
                "care_plan_goals": {},
            },
            INTERVIEW_SNIPPET,
            "training_with_embedded_intake",
        )
        names = [s["name"] for s in data["services_identified"]]
        assert "Homemaker" in names
        assert "Personal Care" not in names
