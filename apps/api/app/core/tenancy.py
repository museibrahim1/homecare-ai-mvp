"""Agency tenancy helpers.

Assessments, clients, and documents are owned by `clients.created_by`.
Customers can end up with more than one User row for the same person
(mixed-case email, Google/Apple vs password, or a teammate on the same
business). Listing only `created_by == current_user.id` makes their past
work look deleted.

These helpers keep isolation at the agency: same person (case-insensitive
email) plus teammates on the same `businesses` row. They never cross
businesses.
"""

from __future__ import annotations

from typing import Iterable
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.business import Business, BusinessUser
from app.models.caregiver import Caregiver
from app.models.client import Client
from app.models.user import User
from app.models.visit import Visit


def normalize_email(email: str | None) -> str:
    return (email or "").strip().lower()


def resolve_business_id(db: Session, user: User | None) -> UUID | None:
    """The `businesses.id` this account belongs to, or None.

    Two shapes of account map to the same agency:

    * Owners registered through `/auth/business/register` get a `business_users`
      row. Emails are stored lowercase there, but a `users.email` can differ in
      case (social sign-in, older rows), so match case-insensitively.
    * Team invites create a `users` row carrying `company_name` and no
      `business_users` row at all, so fall back to the agency of that name.

    Callers that skip the fallback silently treat paying teammates as if they
    had no subscription.
    """
    if user is None:
        return None

    email = normalize_email(getattr(user, "email", None))
    if email:
        business_user = (
            db.query(BusinessUser)
            .filter(func.lower(BusinessUser.email) == email)
            .first()
        )
        if business_user:
            return business_user.business_id

    company = (getattr(user, "company_name", None) or "").strip()
    if company:
        business = (
            db.query(Business)
            .filter(func.lower(Business.name) == company.lower())
            .first()
        )
        if business:
            return business.id

    return None


def find_users_by_email(db: Session, email: str | None) -> list[User]:
    """All User rows whose email matches, ignoring case."""
    key = normalize_email(email)
    if not key:
        return []
    return db.query(User).filter(func.lower(User.email) == key).all()


def find_user_by_email(db: Session, email: str | None) -> User | None:
    """Pick the User row for this email.

    If mixed-case duplicates exist, prefer the account that already has
    clients so login/social sign-in lands on the agency with data.
    """
    matches = find_users_by_email(db, email)
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]

    def _score(user: User) -> tuple[int, str]:
        n = db.query(Client.id).filter(Client.created_by == user.id).count()
        created = user.created_at.isoformat() if user.created_at else ""
        return (n, created)

    return sorted(matches, key=_score, reverse=True)[0]


def visible_user_ids(db: Session, user: User) -> list[UUID]:
    """User IDs whose clients the current user is allowed to see."""
    ids: set[UUID] = {user.id}
    email = normalize_email(user.email)

    if email:
        for twin in find_users_by_email(db, email):
            ids.add(twin.id)

        business = (
            db.query(BusinessUser)
            .filter(func.lower(BusinessUser.email) == email)
            .first()
        )
        if business:
            team_emails = [
                normalize_email(row[0])
                for row in db.query(BusinessUser.email)
                .filter(BusinessUser.business_id == business.business_id)
                .all()
                if row[0]
            ]
            if team_emails:
                mates = (
                    db.query(User.id)
                    .filter(func.lower(User.email).in_(team_emails))
                    .all()
                )
                ids.update(row[0] for row in mates)

    return list(ids)


def owned_by_visible_users(db: Session, user: User):
    """SQLAlchemy filter: Client.created_by is in the current agency."""
    return Client.created_by.in_(visible_user_ids(db, user))


def owned_caregivers(db: Session, user: User):
    """SQLAlchemy filter: Caregiver.created_by is in the current agency."""
    return Caregiver.created_by.in_(visible_user_ids(db, user))


def get_user_visit(db: Session, visit_id: UUID, current_user: User) -> Visit:
    """Load a visit only if it belongs to the current user's agency."""
    visit = (
        db.query(Visit)
        .join(Client, Visit.client_id == Client.id)
        .filter(Visit.id == visit_id, owned_by_visible_users(db, current_user))
        .first()
    )
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit not found",
        )
    return visit


def iter_visible_client_ids(db: Session, user: User) -> Iterable[UUID]:
    rows = db.query(Client.id).filter(owned_by_visible_users(db, user)).all()
    return [row[0] for row in rows]
