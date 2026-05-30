"""Shared platform-admin auth dependency for the admin package."""

import logging

from fastapi import Depends, HTTPException, status

from app.core.deps import get_current_user
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Ensure current user is a PLATFORM admin (not a business admin).
    Platform admins can approve businesses but CANNOT see client data (HIPAA).
    """
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    # Check if this is a platform admin (not associated with a business)
    # Platform admins have email ending in @palmtai.com
    if not current_user.email.endswith("@palmtai.com"):
        logger.warning(f"Non-platform user {current_user.id} attempted admin access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform admin access required"
        )
    return current_user
