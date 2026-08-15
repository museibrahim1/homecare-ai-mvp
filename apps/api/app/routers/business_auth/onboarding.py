"""Complete agency onboarding after social sign-up (User already exists)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.business import Business, BusinessUser
from app.schemas.auth import CompleteOnboardingRequest
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/complete-onboarding")
async def complete_onboarding(
    body: CompleteOnboardingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create Business + owner BusinessUser sharing User.id (social User-first path)."""
    if not body.consent:
        raise HTTPException(
            status_code=400,
            detail="You must accept the Terms, Privacy Policy, and AI data processing notice.",
        )

    existing = db.query(BusinessUser).filter(BusinessUser.id == current_user.id).first()
    if existing:
        business = db.query(Business).filter(Business.id == existing.business_id).first()
        return {
            "success": True,
            "already_complete": True,
            "business_id": str(existing.business_id),
            "business_name": business.name if business else None,
            "needs_onboarding": False,
        }

    agency = (body.agency_name or "").strip()
    if not agency:
        agency = (current_user.company_name or current_user.full_name or "").strip()
    if not agency and current_user.email:
        agency = current_user.email.split("@", 1)[0]
    if not agency:
        agency = "My Agency"
    agency = agency[:255]

    email = (current_user.email or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Account email is required to finish setup.")

    # Email uniqueness on business_users — should match users.email
    conflict = (
        db.query(BusinessUser)
        .filter(BusinessUser.email == email, BusinessUser.id != current_user.id)
        .first()
    )
    if conflict:
        raise HTTPException(
            status_code=409,
            detail="An agency account already uses this email. Sign in with email/password instead.",
        )

    business = Business(
        name=agency,
        entity_type="llc",
        state_of_incorporation="NE",
        address="",
        city="",
        state="NE",
        zip_code="",
        phone="",
        email=email,
        verification_status="approved",
        approved_at=datetime.now(timezone.utc),
    )
    db.add(business)
    db.flush()

    # CRITICAL: same UUID as User so needs_onboarding clears
    owner = BusinessUser(
        id=current_user.id,
        business_id=business.id,
        email=email,
        full_name=current_user.full_name,
        password_hash=None,
        role="owner",
        is_owner=True,
        email_verified=True,
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(owner)
    db.flush()

    current_user.company_name = agency
    if current_user.role == "caregiver":
        current_user.role = "user"

    try:
        from app.models.agency_settings import AgencySettings
        db.add(AgencySettings(
            user_id=current_user.id,
            settings_key=f"user_{current_user.id}",
            name=agency,
            address="",
            city="",
            state="NE",
            zip_code="",
            phone="",
            email=email,
        ))
    except Exception as e:
        logger.warning("AgencySettings on social onboard failed: %s", e)

    try:
        from app.models.subscription import Plan, Subscription, SubscriptionStatus
        plan = (
            db.query(Plan).filter(Plan.tier == "STARTER", Plan.is_active.is_(True)).first()
            or db.query(Plan).filter(Plan.is_active.is_(True)).order_by(Plan.monthly_price).first()
        )
        if plan:
            trial_end = datetime.now(timezone.utc) + timedelta(days=14)
            db.add(Subscription(
                business_id=business.id,
                plan_id=plan.id,
                status=SubscriptionStatus.TRIAL,
                billing_cycle="monthly",
                trial_ends_at=trial_end,
                current_period_start=datetime.now(timezone.utc),
                current_period_end=trial_end,
            ))
    except Exception as e:
        logger.warning("Trial subscription on social onboard failed: %s", e)

    log_action(
        db=db,
        user_id=current_user.id,
        action="social_onboarding_complete",
        entity_type="business",
        entity_id=business.id,
        description="Social user completed agency onboarding",
        changes={"agency_name": agency, "consent": True},
    )

    db.commit()
    return {
        "success": True,
        "already_complete": False,
        "business_id": str(business.id),
        "business_name": agency,
        "needs_onboarding": False,
    }
