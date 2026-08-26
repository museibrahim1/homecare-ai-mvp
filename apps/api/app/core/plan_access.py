"""Plan-tier capability helpers (lite Mobile CRM vs full Platform)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User

MOBILE_TIER = "mobile"

# Paid tiers that include web CRM (Mobile = lite caps; Platform+ = full).
WEB_CRM_TIERS = frozenset({
    "mobile",
    "complete",  # promo / beta_free_access label
    "starter",
    "growth",
    "professional",
    "enterprise",
})

TIER_DEFAULT_LIMITS = {
    "mobile": {"max_visits_per_month": 15, "max_clients": 30},
    "starter": {"max_visits_per_month": 30, "max_clients": 150},
    "complete": {"max_visits_per_month": 30, "max_clients": 150},
    "growth": {"max_visits_per_month": 30, "max_clients": 150},
    "professional": {"max_visits_per_month": 99999, "max_clients": 99999},
    "enterprise": {"max_visits_per_month": 99999, "max_clients": 99999},
    "free": {"max_visits_per_month": 2, "max_clients": 5},
}


def is_mobile_only_tier(tier: Optional[str]) -> bool:
    """Deprecated: Mobile includes lite web CRM. Always False for the web gate."""
    return False


def is_mobile_tier(tier: Optional[str]) -> bool:
    return (tier or "").lower() == MOBILE_TIER


def tier_has_web_platform(tier: Optional[str]) -> bool:
    """True when the tier may use the web CRM (lite or full)."""
    return (tier or "free").lower() in WEB_CRM_TIERS


def is_ios_client(user_agent: Optional[str], palm_client: Optional[str]) -> bool:
    if (palm_client or "").lower() == "ios":
        return True
    ua = (user_agent or "").lower()
    return "palmc" in ua or "palmcare" in ua or ua.startswith("com.palmcareai")


def resolve_user_tier(db: Session, user: User) -> str:
    """Best-effort tier string for capability checks."""
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


def get_tier_limits(db: Session, user: User) -> dict:
    """Return max_visits_per_month and max_clients for the user's plan."""
    from app.models.business import BusinessUser
    from app.models.subscription import Subscription, SubscriptionStatus

    tier = resolve_user_tier(db, user)
    defaults = TIER_DEFAULT_LIMITS.get(tier, TIER_DEFAULT_LIMITS["free"]).copy()

    business_user = db.query(BusinessUser).filter(BusinessUser.email == user.email).first()
    if not business_user:
        return {"tier": tier, **defaults}

    sub = (
        db.query(Subscription)
        .filter(
            Subscription.business_id == business_user.business_id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
        )
        .first()
    )
    if sub and sub.plan is not None:
        plan = sub.plan
        visits = getattr(plan, "max_visits_per_month", None)
        clients = getattr(plan, "max_clients", None)
        if visits is not None and int(visits) > 0:
            defaults["max_visits_per_month"] = int(visits)
        if clients is not None and int(clients) > 0:
            defaults["max_clients"] = int(clients)
    return {"tier": tier, **defaults}


def month_start_utc() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def require_web_platform(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Allow any paid CRM tier (including Mobile lite). Block free-only users."""
    tier = resolve_user_tier(db, current_user)
    if not tier_has_web_platform(tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Web CRM requires an active PalmCare subscription. "
                "Subscribe in the iPhone app to unlock Mobile lite CRM or Platform."
            ),
        )
    return current_user
