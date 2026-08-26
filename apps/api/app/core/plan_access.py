"""Plan-tier capability helpers (mobile-only vs full platform)."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User

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
    """True only for paid Platform/Enterprise (and promo complete) tiers."""
    normalized = (tier or "free").lower()
    return normalized in WEB_PLATFORM_TIERS


def is_ios_client(user_agent: Optional[str], palm_client: Optional[str]) -> bool:
    if (palm_client or "").lower() == "ios":
        return True
    ua = (user_agent or "").lower()
    return "palmc" in ua or "palmcare" in ua or ua.startswith("com.palmcareai")


def resolve_user_tier(db: Session, user: User) -> str:
    """Best-effort tier string for capability checks (mirrors visits usage)."""
    from app.core.demo_accounts import is_demo_email
    from app.models.business import BusinessUser
    from app.models.subscription import Subscription, SubscriptionStatus
    from app.core.config import settings

    if is_demo_email(getattr(user, "email", None)):
        return "enterprise"
    if getattr(settings, "beta_free_access", False):
        return "complete"
    email = (user.email or "").lower()
    role = user.role.value if hasattr(user.role, "value") else (user.role or "user")
    if role == "admin" and email.endswith("@palmtai.com"):
        return "enterprise"

    business_user = db.query(BusinessUser).filter(BusinessUser.email == user.email).first()
    if not business_user:
        return "free"

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.business_id == business_user.business_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
        )
        .first()
    )
    if sub and sub.plan is not None:
        tier = sub.plan.tier.value if hasattr(sub.plan.tier, "value") else str(sub.plan.tier)
        return (tier or "free").lower()
    return "free"


def require_web_platform(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Block PalmCare Mobile subscribers from web CRM APIs."""
    tier = resolve_user_tier(db, current_user)
    if is_mobile_only_tier(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "PalmCare Mobile is iPhone-only. Upgrade to PalmCare Platform in the app "
                "for web CRM, pipeline, and team features."
            ),
        )
    return current_user
