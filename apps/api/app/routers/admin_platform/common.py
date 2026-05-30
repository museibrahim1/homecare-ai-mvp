"""Shared auth dependency for the platform admin package."""

import logging

from fastapi import Depends, HTTPException

from app.core.deps import get_current_user
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure current user is a platform admin."""
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    if not current_user.email.endswith("@palmtai.com"):
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user
