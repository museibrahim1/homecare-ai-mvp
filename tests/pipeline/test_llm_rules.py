"""Product intent and extraction guardrails must stay in LLM prompts."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "worker"))

from libs.llm_rules import (
    EXTRACTION_GUARDRAILS,
    PRODUCT_INTENT,
    get_product_guardrails_for_prompt,
    get_rules_for_prompt,
)


class TestProductGuardrails:
    def test_product_intent_names_four_deliverables(self):
        text = PRODUCT_INTENT.lower()
        assert "care plan" in text or "care-plan" in text
        assert "billable" in text
        assert "note" in text
        assert "contract" in text

    def test_guardrails_protect_spoken_schedule(self):
        text = EXTRACTION_GUARDRAILS.lower()
        assert "spoken schedule" in text
        assert "to be determined" in text or "tbd" in text
        assert "prior authorization" in text or "formal" in text

    def test_prompt_helpers_include_guardrails(self):
        block = get_product_guardrails_for_prompt()
        assert "WHAT PALMCARE IS BUILDING" in block
        assert "HARD EXTRACTION GUARDRAILS" in block
        assert "stated_weekly_hours" in block

        full = get_rules_for_prompt()
        assert "WHAT PALMCARE IS BUILDING" in full
        assert "YOUR AGENCY'S BUSINESS RULES" in full
        assert full.index("WHAT PALMCARE IS BUILDING") < full.index("YOUR AGENCY'S BUSINESS RULES")
