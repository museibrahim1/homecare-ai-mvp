"""Shared OAuth helpers.

Google enforces its own registered redirect-URI list, but our token-exchange
endpoints must not depend on another system's configuration: a client-supplied
redirect_uri is only accepted if it points at an origin we control.
"""
from urllib.parse import urlparse

from fastapi import HTTPException, status

ALLOWED_REDIRECT_HOSTS = {"palmcareai.com", "www.palmcareai.com"}
DEV_HOSTS = {"localhost", "127.0.0.1"}


def validate_oauth_redirect_uri(redirect_uri: str) -> str:
    """Reject redirect URIs that don't point at an origin we control."""
    try:
        parsed = urlparse(redirect_uri)
    except Exception:
        parsed = None

    if parsed is not None:
        host = (parsed.hostname or "").lower()
        if parsed.scheme == "https" and host in ALLOWED_REDIRECT_HOSTS:
            return redirect_uri
        # Local development uses the Next dev server over plain http.
        if parsed.scheme == "http" and host in DEV_HOSTS:
            return redirect_uri

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported redirect URI.",
    )
