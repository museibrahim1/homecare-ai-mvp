from typing import Generator, Optional
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User

security = HTTPBearer()


def get_db() -> Generator:
    """Database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    
    # Check if this token was issued before a forced logout
    force_logout_at = getattr(user, 'force_logout_at', None)
    if force_logout_at is not None:
        token_iat = payload.get("iat")
        if token_iat is not None:
            issued_at = datetime.fromtimestamp(token_iat, tz=timezone.utc)
            # Ensure force_logout_at is timezone-aware
            if force_logout_at.tzinfo is None:
                force_logout_at = force_logout_at.replace(tzinfo=timezone.utc)
            if issued_at < force_logout_at:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired — please sign in again",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def _is_ceo(user: User) -> bool:
    """Check if user is the platform CEO (@palmtai.com admin)."""
    return user.role == "admin" and user.email.endswith("@palmtai.com")


def _has_permission(user: User, permission: str) -> bool:
    """Check if a user has a specific permission."""
    if _is_ceo(user):
        return True
    if user.role in ("admin", "admin_team"):
        perms = getattr(user, "permissions", None) or []
        return "admin_full" in perms or permission in perms
    return False


def require_permission(permission: str):
    """FastAPI dependency that checks for a specific permission.

    CEO (@palmtai.com admin) always passes. Team members need
    the permission in their permissions list or 'admin_full'.
    """
    async def checker(user: User = Depends(get_current_user)) -> User:
        if _has_permission(user, permission):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission required: {permission}",
        )
    return checker


async def require_ceo_only(user: User = Depends(get_current_user)) -> User:
    """Restrict to CEO only (role=admin + @palmtai.com email)."""
    if not _is_ceo(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CEO access required",
        )
    return user
