from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import (
    verify_password, create_access_token,
    check_account_lockout, record_failed_login, clear_login_attempts
)
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse
from app.services.audit import log_action

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
