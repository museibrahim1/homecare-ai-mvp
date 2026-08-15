"""Verify Apple / Google identity tokens for social login."""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx
from fastapi import HTTPException, status
from jose import jwt
from jose.exceptions import JOSEError

from app.core.config import settings

logger = logging.getLogger(__name__)

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
GOOGLE_ISSUERS = {
    "https://accounts.google.com",
    "accounts.google.com",
}
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"

_jwks_cache: dict[str, tuple[float, dict]] = {}
_JWKS_TTL_SECONDS = 3600


def _split_audiences(raw: str) -> list[str]:
    return [p.strip() for p in (raw or "").split(",") if p.strip()]


def _google_audiences() -> list[str]:
    ids = _split_audiences(settings.google_signin_client_ids)
    # Fall back to Calendar OAuth client id if dedicated sign-in list is empty
    if not ids and settings.google_client_id:
        ids = [settings.google_client_id.strip()]
    return ids


def _apple_audiences() -> list[str]:
    return _split_audiences(settings.apple_signin_client_ids) or ["com.palmcareai.app"]


def _fetch_jwks(url: str) -> dict:
    now = time.time()
    cached = _jwks_cache.get(url)
    if cached and cached[0] > now:
        return cached[1]
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.warning("JWKS fetch failed for %s: %s", url, e)
        if cached:
            return cached[1]
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign-in temporarily unavailable. Try again.",
        ) from e
    _jwks_cache[url] = (now + _JWKS_TTL_SECONDS, data)
    return data


def _rsa_key_for_token(token: str, jwks: dict) -> dict:
    try:
        headers = jwt.get_unverified_header(token)
    except JOSEError as e:
        raise HTTPException(status_code=401, detail="Sign-in failed. Try again.") from e
    kid = headers.get("kid")
    for key in jwks.get("keys") or []:
        if key.get("kid") == kid:
            return key
    # Refresh once if kid missing (key rotation)
    raise HTTPException(status_code=401, detail="Sign-in failed. Try again.")


def _decode_rs256(token: str, jwks_url: str, audiences: list[str], issuer: str | set[str]) -> dict[str, Any]:
    if not audiences:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Social sign-in is not configured.",
        )
    jwks = _fetch_jwks(jwks_url)
    try:
        key_data = _rsa_key_for_token(token, jwks)
    except HTTPException:
        _jwks_cache.pop(jwks_url, None)
        jwks = _fetch_jwks(jwks_url)
        key_data = _rsa_key_for_token(token, jwks)

    last_err: Exception | None = None
    for aud in audiences:
        try:
            options = {"verify_at_hash": False}
            decode_kwargs: dict[str, Any] = {
                "algorithms": ["RS256"],
                "audience": aud,
                "options": options,
            }
            if isinstance(issuer, str):
                decode_kwargs["issuer"] = issuer
            claims = jwt.decode(token, key_data, **decode_kwargs)
            if isinstance(issuer, set):
                tok_iss = claims.get("iss")
                if tok_iss not in issuer:
                    raise JOSEError("invalid issuer")
            return claims
        except JOSEError as e:
            last_err = e
            continue
    logger.info("Social token decode failed: %s", last_err)
    raise HTTPException(status_code=401, detail="Sign-in failed. Try again.") from last_err


@dataclass
class SocialClaims:
    provider: str
    provider_user_id: str
    email: Optional[str]
    email_verified: bool
    name: Optional[str]


def verify_apple_id_token(id_token: str, nonce: Optional[str] = None) -> SocialClaims:
    claims = _decode_rs256(
        id_token,
        APPLE_JWKS_URL,
        _apple_audiences(),
        APPLE_ISSUER,
    )
    if nonce:
        token_nonce = claims.get("nonce")
        # Clients may send raw nonce; Apple stores SHA256 hex of nonce in the token
        expected = hashlib.sha256(nonce.encode("utf-8")).hexdigest()
        if token_nonce not in (nonce, expected):
            raise HTTPException(status_code=401, detail="Sign-in failed. Try again.")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Sign-in failed. Try again.")

    email = (claims.get("email") or "").strip().lower() or None
    # Apple may send email_verified as bool or string "true"
    ev = claims.get("email_verified", True)
    email_verified = ev is True or ev == "true" or ev == True  # noqa: E712

    return SocialClaims(
        provider="apple",
        provider_user_id=str(sub),
        email=email,
        email_verified=bool(email_verified) if email else False,
        name=None,  # Apple puts name in the authorize response, not the id_token
    )


def verify_google_id_token(id_token: str, nonce: Optional[str] = None) -> SocialClaims:
    claims = _decode_rs256(
        id_token,
        GOOGLE_JWKS_URL,
        _google_audiences(),
        GOOGLE_ISSUERS,
    )
    if nonce and claims.get("nonce") and claims.get("nonce") != nonce:
        raise HTTPException(status_code=401, detail="Sign-in failed. Try again.")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Sign-in failed. Try again.")

    email = (claims.get("email") or "").strip().lower() or None
    email_verified = bool(claims.get("email_verified", False))
    name = (claims.get("name") or "").strip() or None

    return SocialClaims(
        provider="google",
        provider_user_id=str(sub),
        email=email,
        email_verified=email_verified,
        name=name,
    )


def exchange_google_auth_code(
    code: str,
    redirect_uri: str = "postmessage",
) -> str:
    """Exchange a GIS popup auth code for an ID token.

    Web Sign in with Google (oauth2.initCodeClient, ux_mode=popup) returns an
    authorization code with redirect_uri=postmessage. We redeem it server-side
    with the web client secret, then verify the ID token like a normal social login.
    """
    client_id = (settings.google_client_id or "").strip()
    client_secret = (settings.google_client_secret or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Google Sign In is not configured on the server.",
        )

    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
    except httpx.RequestError as exc:
        logger.warning("Google code exchange network error: %s", exc)
        raise HTTPException(status_code=502, detail="Google Sign In failed. Try again.") from exc

    if response.status_code != 200:
        err = {}
        try:
            err = response.json()
        except Exception:
            pass
        logger.warning(
            "Google code exchange failed status=%s error=%s",
            response.status_code,
            err.get("error"),
        )
        raise HTTPException(
            status_code=401,
            detail="Google Sign In failed. Try again.",
        )

    tokens = response.json()
    id_token = tokens.get("id_token")
    if not id_token or not isinstance(id_token, str):
        raise HTTPException(
            status_code=401,
            detail="Google Sign In did not return an identity token. Try again.",
        )
    return id_token


def verify_social_token(
    provider: str,
    id_token: str,
    nonce: Optional[str] = None,
) -> SocialClaims:
    p = (provider or "").strip().lower()
    if p == "apple":
        return verify_apple_id_token(id_token, nonce=nonce)
    if p == "google":
        return verify_google_id_token(id_token, nonce=nonce)
    raise HTTPException(status_code=400, detail="Unsupported sign-in provider.")


def resolve_full_name(
    request_full_name: Optional[str],
    token_name: Optional[str],
    email: Optional[str],
) -> str:
    """Never return empty — users.full_name is NOT NULL."""
    for candidate in (request_full_name, token_name):
        if candidate and candidate.strip():
            return candidate.strip()[:255]
    if email and "@" in email:
        local = email.split("@", 1)[0].strip()
        if local:
            return local[:255]
    return "PalmCare User"
