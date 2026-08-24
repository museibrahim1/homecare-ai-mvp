"""Tests for demo account helpers."""

from app.core.demo_accounts import DEMO_EMAILS, is_demo_email


def test_demo_emails_include_agency_and_screenshots():
    assert "demo@agency.com" in DEMO_EMAILS
    assert "demo-screenshots@palmtai.com" in DEMO_EMAILS


def test_is_demo_email_case_insensitive():
    assert is_demo_email("Demo@Agency.com")
    assert is_demo_email(" demo@agency.com ")
    assert not is_demo_email("other@agency.com")
    assert not is_demo_email(None)
