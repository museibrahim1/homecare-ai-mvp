"""Plan-tier capability helpers (mobile-only vs full platform)."""

from __future__ import annotations

from typing import Optional

MOBILE_ONLY_TIER = "mobile"

# Tiers that include the web CRM, team seats, and analytics.
WEB_PLATFORM_TIERS = frozenset({
    "complete",  # promo / beta_free_access label
    "starter",
    "growth",
    "professional",
    "enterprise",
})


def is_mobile_only_tier(tier: Optional[str]) -> bool:
    return (tier or "").lower() == MOBILE_ONLY_TIER


def tier_has_web_platform(tier: Optional[str]) -> bool:
    normalized = (tier or "free").lower()
    if normalized == "free":
        return True
    return normalized in WEB_PLATFORM_TIERS


def is_ios_client(user_agent: Optional[str], palm_client: Optional[str]) -> bool:
    if (palm_client or "").lower() == "ios":
        return True
    ua = (user_agent or "").lower()
    return "palmc" in ua or "palmcare" in ua or ua.startswith("com.palmcareai")
