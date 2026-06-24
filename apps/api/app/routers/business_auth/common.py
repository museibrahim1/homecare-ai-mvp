"""
Shared auth helpers and constants for the business auth package.

Security-sensitive: hash_password / verify_password / create_access_token /
get_current_business_user are kept verbatim from the original single-module
router so the hardened authentication behavior is unchanged.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session
from jose import jwt

from app.core.config import settings
from app.models.business import BusinessUser
from app.core.security import get_password_hash, verify_password as _verify_password

logger = logging.getLogger(__name__)

# Required documents for verification (use lowercase strings to match PostgreSQL enum)
REQUIRED_DOCUMENTS = [
    'business_license',
    'home_care_license',
    'liability_insurance',
]


def hash_password(password: str) -> str:
    return get_password_hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _verify_password(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Issue a JWT that mirrors the lifetime configured in settings.

    Defaults to `settings.jwt_expiration_hours` (1h per HIPAA) so that
    business-side tokens don't outlive regular user tokens.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=settings.jwt_expiration_hours)
    )
    to_encode.update({
        "exp": expire,
        "iss": settings.jwt_issuer,
        "iat": datetime.now(timezone.utc),
    })
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_business_user(
    token: str,
    db: Session,
) -> BusinessUser:
    """Decode token and get current business user."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(BusinessUser).filter(BusinessUser.id == UUID(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        # Check if business is approved
        if user.business.verification_status != 'approved':
            raise HTTPException(
                status_code=403,
                detail=f"Business not approved. Status: {user.business.verification_status}"
            )

        return user
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
