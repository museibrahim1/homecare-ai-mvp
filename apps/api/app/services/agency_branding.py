"""Resolve the signed-in user's agency name and logo for profile surfaces."""

from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.tenancy import normalize_email, visible_user_ids
from app.models.agency_settings import AgencySettings
from app.models.business import Business, BusinessUser
from app.models.user import User


def resolve_agency_branding(db: Session, user: User) -> dict[str, Optional[str]]:
    """
    Return company_name, business_name, and agency_logo for /auth/me.

    Preference order for the display name:
      1. AgencySettings.name for a visible team member (skip generic sentinel)
      2. Business.name when the user belongs to a business
      3. User.company_name from signup / onboarding
    """
    company_name = (getattr(user, "company_name", None) or "").strip() or None
    business_name = company_name
    agency_logo: Optional[str] = None

    owner_ids = visible_user_ids(db, user)
    settings = (
        db.query(AgencySettings)
        .filter(AgencySettings.user_id.in_(owner_ids))
        .order_by(AgencySettings.updated_at.desc())
        .first()
    )
    if settings:
        settings_name = (settings.name or "").strip()
        if settings_name and settings_name != "Home Care Services Agency":
            business_name = settings_name
            company_name = company_name or settings_name
        if settings.logo:
            agency_logo = settings.logo

    email = normalize_email(user.email)
    if email:
        membership = (
            db.query(BusinessUser)
            .filter(func.lower(BusinessUser.email) == email)
            .first()
        )
        if membership:
            business = (
                db.query(Business)
                .filter(Business.id == membership.business_id)
                .first()
            )
            if business:
                if (business.name or "").strip():
                    # Prefer the live Business row when AgencySettings is still
                    # the generic sentinel or missing.
                    if not business_name or business_name == "Home Care Services Agency":
                        business_name = business.name.strip()
                    company_name = company_name or business.name.strip()
                if not agency_logo and getattr(business, "logo_url", None):
                    agency_logo = business.logo_url

    return {
        "company_name": company_name,
        "business_name": business_name,
        "agency_logo": agency_logo,
    }
