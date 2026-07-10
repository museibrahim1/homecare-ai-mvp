import os
import secrets
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

import pyotp

from app.core.cookies import set_session_cookie, clear_session_cookie
from app.core.rate_limit import get_client_ip
from app.core.deps import get_db, get_current_user
from app.core.security import (
    verify_password, create_access_token, get_password_hash,
    check_account_lockout, record_failed_login, clear_login_attempts,
    check_password_history, record_password_in_history,
    validate_password,
    _get_redis,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, Token, MFALoginRequest, RefreshRequest
from app.schemas.user import UserResponse
from app.services.audit import log_action
from app.services.email import email_service

logger = logging.getLogger(__name__)

PASSWORD_RESET_EXPIRY_HOURS = 1
REFRESH_TOKEN_EXPIRY_DAYS = 30


def _hash_refresh_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()


def _issue_refresh_token(user: User) -> str:
    """Create a new refresh token for the user (rotates any existing one).

    Caller is responsible for db.commit(). The plain token is returned to
    the client once and only its hash is stored.
    """
    token = secrets.token_urlsafe(48)
    user.refresh_token_hash = _hash_refresh_token(token)
    user.refresh_token_expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)
    return token

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
async def login(request: LoginRequest, req: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT token.
    
    HIPAA Compliance:
    - Account lockout after 5 failed attempts
    - Audit logging of all login attempts
    - Generic error messages to prevent user enumeration
    """
    email = request.email.lower().strip()
    client_ip = get_client_ip(req)

    # Hash for audit log JSON so we never persist the raw email in structured
    # fields, but still allow correlation across failed-login records.
    import hashlib as _hashlib
    email_hash = _hashlib.sha256(email.encode()).hexdigest()[:16]

    # Rate limiting by IP
    _check_rate_limit(f"login:{client_ip}")

    # HIPAA: Check if account is locked
    is_locked, seconds_remaining = check_account_lockout(email)
    if is_locked:
        log_action(
            db=db, user_id=None, action="login_blocked_lockout",
            entity_type="security", entity_id=None,
            description=f"Login blocked for {email} - account locked",
            changes={"email_hash": email_hash, "ip": client_ip, "seconds_remaining": seconds_remaining},
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
            changes={"email_hash": email_hash, "user_exists": user is not None, "locked": is_now_locked},
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
    
    # HIPAA: If MFA is enabled, require a second factor before issuing a token
    if getattr(user, "mfa_enabled", False) and user.mfa_secret:
        log_action(
            db=db, user_id=user.id, action="login_mfa_required",
            entity_type="user", entity_id=user.id,
            description="Login successful, MFA verification required",
            ip_address=client_ip,
        )
        mfa_token = create_access_token(
            data={"sub": str(user.id), "mfa_pending": True},
        )
        return Token(
            access_token="",
            token_type="bearer",
            requires_mfa=True,
            mfa_token=mfa_token,
        )
    
    # Admin team members get longer sessions (7 days) for activity tracking
    if getattr(user, "role", "") == "admin_team":
        expires = timedelta(days=7)
    else:
        expires = None  # uses default from settings
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=expires)
    refresh_token = _issue_refresh_token(user)

    # Track last login time
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # HIPAA: Audit log successful login
    log_action(
        db=db, user_id=user.id, action="user_login", 
        entity_type="user", entity_id=user.id,
        description=f"Successful login: {email}",
        ip_address=client_ip
    )

    # Notify CEO when a team member logs in
    if getattr(user, "role", "") == "admin_team":
        try:
            _notify_ceo_team_login(db, user, client_ip)
        except Exception as e:
            logger.warning(f"Failed to notify CEO of team login: {e}")
    
    # Web clients authenticate via httpOnly cookie (token never in localStorage)
    max_age = int(expires.total_seconds()) if expires else None
    set_session_cookie(response, access_token, max_age_seconds=max_age)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_session(
    request: RefreshRequest,
    req: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new access token.

    The refresh token is rotated on every use. Used by the mobile app so
    Face ID users stay signed in without long-lived access tokens.
    """
    client_ip = get_client_ip(req)
    _check_rate_limit(f"refresh:{client_ip}")

    token_hash = _hash_refresh_token(request.refresh_token)
    user = db.query(User).filter(User.refresh_token_hash == token_hash).first()

    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired — please sign in again",
    )
    if not user or not user.is_active:
        raise invalid
    expires_at = user.refresh_token_expires_at
    if not expires_at:
        raise invalid
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise invalid

    if getattr(user, "role", "") == "admin_team":
        expires = timedelta(days=7)
    else:
        expires = None
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=expires)
    new_refresh = _issue_refresh_token(user)
    user.last_active = datetime.now(timezone.utc)
    db.commit()

    max_age = int(expires.total_seconds()) if expires else None
    set_session_cookie(response, access_token, max_age_seconds=max_age)
    return Token(access_token=access_token, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    phone: str | None = None


@router.put("/me", response_model=UserResponse)
async def update_current_user_info(
    update: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the current user's own profile (name, phone)."""
    if update.full_name is not None:
        name = update.full_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        if len(name) > 200:
            raise HTTPException(status_code=422, detail="Name is too long")
        current_user.full_name = name
    if update.phone is not None:
        current_user.phone = update.phone.strip()[:30]
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/session/clear")
async def clear_session(response: Response):
    """Clear the httpOnly session cookie only.

    Used for implicit logouts (inactivity timeout, visiting /login while
    signed in). Unlike /auth/logout it does NOT revoke the refresh token or
    disconnect integrations. No auth required — clearing a cookie is harmless.
    """
    clear_session_cookie(response)
    return {"message": "Session cleared"}


@router.post("/logout")
async def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Logout current user. Admin Google Calendar stays connected for demo booking."""
    clear_session_cookie(response)
    is_platform_admin = (
        getattr(current_user, 'role', '') == 'admin'
        and (current_user.email or '').endswith('@palmtai.com')
    )
    if not is_platform_admin and getattr(current_user, 'google_calendar_connected', False):
        current_user.google_calendar_connected = False
        current_user.google_calendar_access_token = None
        current_user.google_calendar_refresh_token = None
        current_user.google_calendar_token_expiry = None

    current_user.refresh_token_hash = None
    current_user.refresh_token_expires_at = None
    db.commit()

    return {"message": "Successfully logged out"}


@router.post("/logout-all-devices")
async def logout_all_devices(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Force logout from all devices.
    
    Sets force_logout_at to now — any token issued before this timestamp
    will be rejected by get_current_user, forcing re-authentication on
    every device.
    """
    clear_session_cookie(response)
    current_user.force_logout_at = datetime.now(timezone.utc)
    current_user.refresh_token_hash = None
    current_user.refresh_token_expires_at = None

    is_platform_admin = (
        getattr(current_user, 'role', '') == 'admin'
        and (current_user.email or '').endswith('@palmtai.com')
    )
    if not is_platform_admin and getattr(current_user, 'google_calendar_connected', False):
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
    client_ip = get_client_ip(req)
    _check_rate_limit(f"forgot:{client_ip}")
    
    email = request.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    
    if user and user.is_active:
        # Generate a secure reset token
        reset_token = secrets.token_urlsafe(48)
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)
        db.commit()
        
        app_url = os.getenv("APP_URL", "https://palmcareai.com")
        reset_url = f"{app_url}/reset-password?token={reset_token}"
        
        # Send reset email
        try:
            reset_result = email_service.send_password_reset(
                user_email=user.email,
                user_name=user.full_name,
                reset_url=reset_url,
            )
            if reset_result.get("success"):
                logger.info("Password reset email sent successfully")
            else:
                logger.error(f"Password reset email FAILED: {reset_result.get('error')}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
    else:
        logger.info("Password reset requested for unknown/inactive account")
    
    # Always return success to prevent email enumeration
    return {
        "success": True,
        "message": "If an account exists with that email, a password reset link has been sent.",
    }


@router.post("/mfa/login", response_model=Token)
async def mfa_login(
    request: MFALoginRequest,
    req: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Complete login with MFA code.

    After a normal login returns requires_mfa=True, the client
    must submit email + password + mfa_code to this endpoint.
    """
    email = request.email.lower().strip()
    client_ip = get_client_ip(req)

    _check_rate_limit(f"mfa_login:{client_ip}")

    # Same lockout rules as /auth/login — the MFA path must not be a side door
    # around brute-force protection.
    is_locked, seconds_remaining = check_account_lockout(email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {seconds_remaining} seconds.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        record_failed_login(email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account",
        )

    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(request.mfa_code, valid_window=1):
        log_action(
            db=db, user_id=user.id, action="mfa_login_failed",
            entity_type="security", entity_id=user.id,
            description="Invalid MFA code during login",
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code",
        )

    clear_login_attempts(email)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = _issue_refresh_token(user)
    db.commit()

    log_action(
        db=db, user_id=user.id, action="user_login",
        entity_type="user", entity_id=user.id,
        description="Successful login with MFA",
        ip_address=client_ip,
    )

    set_session_cookie(response, access_token)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    """
    Reset password using a valid reset token.
    """
    client_ip = get_client_ip(req)
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
    
    # Same complexity policy as registration/change-password — a reset must
    # not be a path to a weaker password. Includes the breach (HIBP) check so a
    # reset can't set a known-compromised password.
    from fastapi.concurrency import run_in_threadpool
    from app.core.security import validate_password_secure
    is_valid, policy_error = await run_in_threadpool(
        validate_password_secure, request.new_password
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=policy_error,
        )
    
    # HIPAA: Prevent reuse of last 5 passwords
    if check_password_history(user, request.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot reuse any of your last 5 passwords.",
        )
    
    # Atomically: clear token + update password + invalidate sessions
    new_hash = get_password_hash(request.new_password)
    user.hashed_password = new_hash
    record_password_in_history(user, new_hash)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.force_logout_at = datetime.now(timezone.utc)
    
    db.commit()
    
    logger.info(f"Password successfully reset for user {user.id}")
    
    return {
        "success": True,
        "message": "Password has been reset successfully. You can now sign in with your new password.",
    }


def _notify_ceo_team_login(db: Session, team_user: User, ip: str):
    """Send a notification email to the CEO when a team member logs in."""
    ceo = db.query(User).filter(
        User.role == "admin", User.email.endswith("@palmtai.com")
    ).first()
    if not ceo:
        return

    now = datetime.now(timezone.utc)
    et_offset = timedelta(hours=-4)
    local_time = (now + et_offset).strftime("%I:%M %p ET on %B %d, %Y")
    perms = ", ".join(team_user.permissions or []) or "None"

    svc = email_service
    svc.send_email(
        to=ceo.email,
        subject=f"Team Login: {team_user.full_name} just signed in",
        html=f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: linear-gradient(135deg, #0d9488, #0f766e); border-radius: 12px; padding: 24px; color: white; margin-bottom: 20px;">
                <h2 style="margin: 0 0 8px 0; font-size: 18px;">Team Member Login</h2>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">{local_time}</p>
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Name</td>
                        <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">{team_user.full_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{team_user.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Permissions</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">{perms}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">IP Address</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-family: monospace;">{ip}</td>
                    </tr>
                </table>
            </div>
            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
                View team activity at <a href="https://palmcareai.com/admin/team" style="color: #0d9488;">palmcareai.com/admin/team</a>
            </p>
        </div>
        """,
        sender="PalmCare AI <noreply@send.palmtai.com>",
        reply_to="sales@palmtai.com",
    )


# =============================================================================
# ACCOUNT MANAGEMENT
# =============================================================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str  # Must be "DELETE MY ACCOUNT"


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password while logged in (requires current password)."""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    if req.current_password == req.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password.")

    if check_password_history(current_user, req.new_password):
        raise HTTPException(status_code=400, detail="You cannot reuse any of your last 5 passwords.")

    new_hash = get_password_hash(req.new_password)
    current_user.hashed_password = new_hash
    record_password_in_history(current_user, new_hash)
    db.commit()

    log_action(
        db=db, user_id=current_user.id, action="password_changed",
        entity_type="user", entity_id=current_user.id,
        description="Password changed via settings",
    )

    return {"success": True, "message": "Password changed successfully."}


@router.post("/delete-account")
async def delete_account(
    req: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently delete user account and all associated data."""
    if req.confirmation != "DELETE MY ACCOUNT":
        raise HTTPException(status_code=400, detail='Please type "DELETE MY ACCOUNT" to confirm.')

    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect.")

    is_platform_admin = (
        getattr(current_user, 'role', '') == 'admin'
        and (current_user.email or '').endswith('@palmtai.com')
    )
    if is_platform_admin:
        raise HTTPException(status_code=403, detail="Platform admin accounts cannot be deleted through self-service.")

    user_email = current_user.email
    user_name = current_user.full_name
    user_id = current_user.id

    try:
        from sqlalchemy import text as sa_text
        uid = str(user_id)

        def _safe(sql: str, params: dict | None = None) -> None:
            """Run one statement inside a SAVEPOINT.

            On Postgres a failed statement aborts the whole transaction, so each
            best-effort cleanup must be isolated — otherwise a single missing
            table or FK quirk would poison the final user delete (the cause of
            past HTTP 500s on this endpoint).
            """
            sp = db.begin_nested()
            try:
                db.execute(sa_text(sql), params or {"uid": uid})
                sp.commit()
            except Exception as e:  # noqa: BLE001 - cleanup is best-effort per row
                sp.rollback()
                logger.warning(f"delete-account: skipped [{sql[:50]}…]: {type(e).__name__}: {e}")

        # 1) Visit children must go before the visits themselves (non-nullable
        #    visit_id FKs with no cascade). Scope to visits this user owns.
        #    Order matters: transcript_segments/diarization_turns reference
        #    audio_assets, so audio_assets must be deleted AFTER them.
        visit_scope = "visit_id IN (SELECT id FROM visits WHERE caregiver_id = :uid)"
        for tbl in ("transcript_segments", "diarization_turns", "billable_items", "notes", "audio_assets"):
            _safe(f"DELETE FROM {tbl} WHERE {visit_scope}")
        _safe("DELETE FROM visits WHERE caregiver_id = :uid")

        # 2) Messaging: messages reference channels, so clear messages first.
        _safe("DELETE FROM messages WHERE sender_id = :uid")
        _safe("DELETE FROM messages WHERE channel_id IN (SELECT id FROM channels WHERE created_by = :uid)")
        _safe("DELETE FROM channels WHERE created_by = :uid")
        _safe("DELETE FROM notifications WHERE user_id = :uid")

        # 3) Other rows owned by this user (non-nullable FK → must delete).
        for tbl, col in [
            ("smart_notes", "user_id"),
            ("reminders", "user_id"),
            ("contract_templates", "owner_id"),
            ("tasks", "user_id"),
            ("agency_settings", "user_id"),
            ("usage_analytics", "user_id"),
            ("provider_engagement", "user_id"),
        ]:
            _safe(f"DELETE FROM {tbl} WHERE {col} = :uid")

        # 4) Nullify nullable references held by rows we keep.
        for tbl, col in [
            ("clients", "created_by"),
            ("caregivers", "created_by"),
            ("audit_logs", "user_id"),
            ("notes", "approved_by_id"),
            ("tasks", "assigned_to_id"),
            ("support_tickets", "submitted_by_id"),
            ("support_tickets", "assigned_to_id"),
            ("support_tickets", "resolved_by_id"),
            ("ticket_responses", "responder_id"),
        ]:
            _safe(f"UPDATE {tbl} SET {col} = NULL WHERE {col} = :uid")

        # 5) Tear down the linked business account so a "deleted" owner can no
        #    longer sign in via business auth. The BusinessUser shares this id.
        biz_row = db.execute(
            sa_text("SELECT business_id FROM business_users WHERE id = :uid OR email = :em"),
            {"uid": uid, "em": user_email},
        ).first()
        _safe("DELETE FROM business_users WHERE id = :uid OR email = :em", {"uid": uid, "em": user_email})
        if biz_row and biz_row[0]:
            biz_id = str(biz_row[0])
            remaining = db.execute(
                sa_text("SELECT COUNT(*) FROM business_users WHERE business_id = :bid"),
                {"bid": biz_id},
            ).scalar()
            # Only delete the business if no team members are left behind.
            if not remaining:
                _safe("DELETE FROM invoices WHERE business_id = :bid", {"bid": biz_id})
                _safe("DELETE FROM subscriptions WHERE business_id = :bid", {"bid": biz_id})
                _safe("DELETE FROM business_documents WHERE business_id = :bid", {"bid": biz_id})
                _safe("DELETE FROM businesses WHERE id = :bid", {"bid": biz_id})

        db.delete(current_user)
        db.commit()
        logger.info(f"Account deleted: {user_email} (id={user_id})")

    except Exception as e:
        db.rollback()
        logger.error(f"Account deletion failed for {user_email}: {e}")
        raise HTTPException(status_code=500, detail="Account deletion failed. Please contact support@palmtai.com.")

    try:
        email_service.send_email(
            to=user_email,
            subject="Your PalmCare AI Account Has Been Deleted",
            html=f"""
            <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
                <h2 style="color: #0f172a;">Account Deleted</h2>
                <p style="color: #475569;">Hi {user_name},</p>
                <p style="color: #475569;">Your PalmCare AI account and all associated data have been permanently deleted as requested.</p>
                <p style="color: #475569;">If this was a mistake or you'd like to come back, you can always create a new account at
                <a href="https://palmcareai.com/register" style="color: #0d9488;">palmcareai.com/register</a>.</p>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">&copy; 2026 Palm Technologies, INC.</p>
            </div>
            """,
            sender="PalmCare AI <support@send.palmtai.com>",
            reply_to="support@palmtai.com",
        )
    except Exception:
        pass

    return {"success": True, "message": "Your account has been permanently deleted."}
