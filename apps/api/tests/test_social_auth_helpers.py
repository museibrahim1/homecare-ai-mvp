"""Unit tests for social auth helpers (no network)."""
from app.core.social_auth import resolve_full_name


def test_resolve_full_name_prefers_request():
    assert resolve_full_name("  Ada Lovelace  ", "Token Name", "a@b.com") == "Ada Lovelace"


def test_resolve_full_name_token_then_email_local():
    assert resolve_full_name(None, "Token Name", "ada@b.com") == "Token Name"
    assert resolve_full_name("", "", "ada.lovelace@b.com") == "ada.lovelace"


def test_resolve_full_name_fallback_constant():
    assert resolve_full_name(None, None, None) == "PalmCare User"
    assert resolve_full_name("  ", "", "") == "PalmCare User"
