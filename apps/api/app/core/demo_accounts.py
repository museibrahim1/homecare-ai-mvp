"""Demo accounts that bypass paywalls and subscription gates."""

from __future__ import annotations

DEMO_EMAILS: frozenset[str] = frozenset(
    {
        "demo@agency.com",
        "demo-screenshots@palmtai.com",
    }
)


def is_demo_email(email: str | None) -> bool:
    if not email:
        return False
    return email.strip().lower() in DEMO_EMAILS
