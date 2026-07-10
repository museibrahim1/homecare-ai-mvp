"""
httpOnly session cookie helpers.

The web app authenticates with an httpOnly cookie so the JWT never has to
live in localStorage (XSS can't exfiltrate it). The iOS app keeps using the
Authorization: Bearer header — both are accepted by get_current_user.

The cookie is first-party: the browser talks to the API through the Next.js
`/api/*` rewrite on the web app's own domain, so SameSite=Lax works in every
browser (no third-party cookie problems).
"""

import os
from typing import Optional

from fastapi import Response

from app.core.config import settings

SESSION_COOKIE_NAME = "palm_session"


def _secure() -> bool:
    # Secure cookies require HTTPS; local dev runs over plain http.
    return bool(os.getenv("RAILWAY_ENVIRONMENT"))


def set_session_cookie(response: Response, token: str, max_age_seconds: Optional[int] = None) -> None:
    """Attach the access token as an httpOnly session cookie."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age_seconds or settings.jwt_expiration_hours * 3600,
        httponly=True,
        secure=_secure(),
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=_secure(),
        samesite="lax",
        path="/",
    )
