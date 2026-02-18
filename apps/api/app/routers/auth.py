import secrets
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import (
    verify_password, create_access_token, get_password_hash,
    check_account_lockout, record_failed_login, clear_login_attempts,
    _get_redis,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse
from app.services.audit import log_action
from app.services.email import email_service

logger = logging.getLogger(__name__)

PASSWORD_RESET_EXPIRY_HOURS = 1

# Rate limit settings
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 10  # max requests per window

# Fallback in-memory rate limiter (used only when Redis is unavailable)
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(key: str) -> None:
    """Raise 429 if rate limit exceeded. Uses Redis when available."""
    r = _get_redis()
    if r is not None:
        try:
            redis_key = f"ratelimit:{key}"
            count = r.incr(redis_key)
            if count == 1:
                r.expire(redis_key, RATE_LIMIT_WINDOW)
            if count > RATE_LIMIT_MAX:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please wait a moment and try again.",
                )
            return
        except HTTPException:
            raise
        except Exception:
            pass  # fall through to in-memory

    # In-memory fallback
    now = time.time()
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[key]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment and try again.",
        )
    _rate_limit_store[key].append(now)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    HIPAA Compliance:
    - Account lockout after 5 failed attempts
    - Audit logging of all login attempts
    - Generic error messages to prevent user enumeration
    """
    email = request.email.lower().strip()
    client_ip = req.client.host if req.client else "unknown"
    
    # Rate limiting by IP
    _check_rate_limit(f"login:{client_ip}")
    
    # HIPAA: Check if account is locked
    is_locked, seconds_remaining = check_account_lockout(email)
    if is_locked:
        log_action(
            db=db, user_id=None, action="login_blocked_lockout", 
            entity_type="security", entity_id=None,
            description=f"Login blocked for {email} - account locked",
            changes={"email": email, "ip": client_ip, "seconds_remaining": seconds_remaining},
            ip_address=client_ip
        )
        minutes = (seconds_remaining or 900) // 60
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to too many failed attempts. Try again in {minutes} minutes.",
        )
    
    user = db.query(User).filter(User.email == email).first()
    
    # HIPAA: Generic error to prevent user enumeration
    if not user or not verify_password(request.password, user.hashed_password):
        # Record failed attempt
        is_now_locked, lock_duration = record_failed_login(email)
        
        log_action(
            db=db, user_id=None, action="login_failed", 
            entity_type="security", entity_id=None,
            description=f"Failed login attempt for {email}",
            changes={"email": email, "user_exists": user is not None, "locked": is_now_locked},
            ip_address=client_ip
        )
        
        if is_now_locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked due to too many failed attempts. Try again in {(lock_duration or 900) // 60} minutes.",
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        log_action(
            db=db, user_id=user.id, action="login_failed_inactive", 
            entity_type="security", entity_id=user.id,
            description=f"Inactive account login attempt: {email}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    # Clear failed attempts on successful login
    clear_login_attempts(email)
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # HIPAA: Audit log successful login
    log_action(
        db=db, user_id=user.id, action="user_login", 
        entity_type="user", entity_id=user.id,
        description=f"Successful login: {email}",
        ip_address=client_ip
    )
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout")
async def logout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Logout current user — clears Google tokens so they must reconnect on next login."""
    # Disconnect Gmail / Google Calendar so user must re-authenticate each session
    if getattr(current_user, 'google_calendar_connected', False):
        current_user.google_calendar_connected = False
        current_user.google_calendar_access_token = None
        current_user.google_calendar_refresh_token = None
        current_user.google_calendar_token_expiry = None
        db.commit()

    return {"message": "Successfully logged out"}


@router.post("/logout-all-devices")
async def logout_all_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Force logout from all devices.
    
    Sets force_logout_at to now — any token issued before this timestamp
    will be rejected by get_current_user, forcing re-authentication on
    every device.
    """
    current_user.force_logout_at = datetime.now(timezone.utc)
    
    # Also clear Google tokens
    if getattr(current_user, 'google_calendar_connected', False):
        current_user.google_calendar_connected = False
        current_user.google_calendar_access_token = None
        current_user.google_calendar_refresh_token = None
        current_user.google_calendar_token_expiry = None
    
    db.commit()
    
    return {
        "success": True,
        "message": "All sessions have been invalidated. You will need to sign in again on all devices.",
    }


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """
    Request a password reset. Sends an email with a reset link.
    
    Always returns success to prevent email enumeration attacks.
    """
    client_ip = req.client.host if req.client else "unknown"
    _check_rate_limit(f"forgot:{client_ip}")
    
    email = request.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    if user and user.is_active:
        # Generate a secure reset token
        reset_token = secrets.token_urlsafe(48)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)
        db.commit()
        
        # Build reset URL
        import os
        app_url = os.getenv("APP_URL", "https://app.palmtai.com")
        reset_url = f"{app_url}/reset-password?token={reset_token}"
        
        # Send reset email
        try:
            reset_result = email_service.send_password_reset(
                user_email=user.email,
                user_name=user.full_name,
                reset_url=reset_url,
            )
            if reset_result.get("success"):
                logger.info(f"Password reset email sent to {email}")
            else:
                logger.error(f"Password reset email FAILED for {email}: {reset_result.get('error')}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
    else:
        # Log but don't reveal whether user exists
        logger.info(f"Password reset requested for unknown/inactive email: {email}")
    
    # Always return success to prevent email enumeration
    return {
        "success": True,
        "message": "If an account exists with that email, a password reset link has been sent.",
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """
    Reset password using a valid reset token.
    """
    client_ip = req.client.host if req.client else "unknown"
    _check_rate_limit(f"reset:{client_ip}")
    
    # Use row-level lock to prevent race condition (token reuse)
    user = db.query(User).filter(
        User.password_reset_token == request.token
    ).with_for_update().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )
    
    # Check if token has expired
    if user.password_reset_expires is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link. Please request a new one.",
        )
    
    expires = user.password_reset_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires:
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one.",
        )
    
    # Validate new password length
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )
    
    # Atomically: clear token + update password + invalidate sessions
    user.hashed_password = get_password_hash(request.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.force_logout_at = datetime.now(timezone.utc)
    
    db.commit()
    
    logger.info(f"Password successfully reset for {user.email}")
    
    return {
        "success": True,
        "message": "Password has been reset successfully. You can now sign in with your new password.",
    }
