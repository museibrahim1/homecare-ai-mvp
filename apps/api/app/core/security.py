from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import re
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory store for login attempts (use Redis in production for multi-instance)
_login_attempts: dict = {}  # {email: {"count": int, "locked_until": datetime}}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def validate_password(password: str) -> Tuple[bool, str]:
    """
    HIPAA Compliance: Validate password meets security requirements.
    Returns (is_valid, error_message)
    """
    errors = []
    
    if len(password) < settings.password_min_length:
        errors.append(f"at least {settings.password_min_length} characters")
    
    if settings.password_require_uppercase and not re.search(r'[A-Z]', password):
        errors.append("one uppercase letter")
    
    if settings.password_require_lowercase and not re.search(r'[a-z]', password):
        errors.append("one lowercase letter")
    
    if settings.password_require_number and not re.search(r'\d', password):
        errors.append("one number")
    
    if settings.password_require_special and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("one special character")
    
    if errors:
        return False, f"Password must contain {', '.join(errors)}"
    
    return True, ""


def check_account_lockout(email: str) -> Tuple[bool, Optional[int]]:
    """
    HIPAA Compliance: Check if account is locked due to failed attempts.
    Returns (is_locked, seconds_remaining)
    """
    if email not in _login_attempts:
        return False, None
    
    attempt_data = _login_attempts[email]
    locked_until = attempt_data.get("locked_until")
    
    if locked_until and datetime.now(timezone.utc) < locked_until:
        remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds())
        return True, remaining
    
    return False, None


def record_failed_login(email: str) -> Tuple[bool, Optional[int]]:
    """
    HIPAA Compliance: Record failed login attempt.
    Returns (is_now_locked, seconds_until_unlock)
    """
    now = datetime.now(timezone.utc)
    
    if email not in _login_attempts:
        _login_attempts[email] = {"count": 0, "locked_until": None, "first_attempt": now}
    
    attempt_data = _login_attempts[email]
    
    # Reset if last attempt was over an hour ago
    if attempt_data.get("first_attempt") and (now - attempt_data["first_attempt"]).total_seconds() > 3600:
        attempt_data["count"] = 0
        attempt_data["first_attempt"] = now
    
    attempt_data["count"] += 1
    
    if attempt_data["count"] >= settings.max_login_attempts:
        lockout_until = now + timedelta(minutes=settings.lockout_duration_minutes)
        attempt_data["locked_until"] = lockout_until
        return True, settings.lockout_duration_minutes * 60
    
    return False, None


def clear_login_attempts(email: str) -> None:
    """Clear login attempts after successful login."""
    if email in _login_attempts:
        del _login_attempts[email]


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode.update({
        "exp": expire,
        "iss": settings.jwt_issuer,
        "iat": datetime.now(timezone.utc),
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
        )
        return payload
    except JWTError:
        return None
