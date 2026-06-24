"""Apple Push Notification service (APNs token-based, HTTP/2).

Fully env-gated: if the APNs credentials aren't configured (Apple Developer
enrollment is still pending), every call is a safe no-op. Once these env vars
are set the same code starts delivering:

    APNS_KEY_ID         - 10-char key ID for the .p8 auth key
    APNS_TEAM_ID        - Apple developer team ID
    APNS_BUNDLE_ID      - app bundle id (apns-topic), e.g. com.palmtai.PalmCareAI
    APNS_AUTH_KEY       - contents of the AuthKey_XXXX.p8 (\\n-escaped is fine)
    APNS_USE_SANDBOX    - "true" to target the sandbox gateway
"""

import os
import time
import json
import logging
from typing import Iterable

logger = logging.getLogger(__name__)

_PROD_HOST = "https://api.push.apple.com"
_SANDBOX_HOST = "https://api.development.push.apple.com"

# Cache the signed JWT — APNs accepts the same token for up to ~1h.
_token_cache = {"jwt": None, "issued_at": 0.0}


def is_configured() -> bool:
    return all(
        os.getenv(k)
        for k in ("APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID", "APNS_AUTH_KEY")
    )


def _auth_jwt() -> str | None:
    if not is_configured():
        return None
    now = time.time()
    if _token_cache["jwt"] and now - _token_cache["issued_at"] < 1800:
        return _token_cache["jwt"]
    try:
        import jwt  # PyJWT
    except Exception as e:
        logger.warning(f"APNs: PyJWT unavailable ({e}); push disabled")
        return None

    key = os.getenv("APNS_AUTH_KEY", "").replace("\\n", "\n")
    try:
        token = jwt.encode(
            {"iss": os.getenv("APNS_TEAM_ID"), "iat": int(now)},
            key,
            algorithm="ES256",
            headers={"kid": os.getenv("APNS_KEY_ID")},
        )
    except Exception as e:
        logger.warning(f"APNs: failed to sign auth token ({e}); push disabled")
        return None

    _token_cache.update({"jwt": token, "issued_at": now})
    return token


def send_push(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> dict:
    """Send an alert push to the given device tokens.

    Returns {"sent": int, "failed": int, "skipped": bool}. Never raises.
    """
    tokens = [t for t in tokens if t]
    if not tokens:
        return {"sent": 0, "failed": 0, "skipped": True}

    auth = _auth_jwt()
    if not auth:
        logger.info(f"APNs not configured; skipping push to {len(tokens)} device(s)")
        return {"sent": 0, "failed": 0, "skipped": True}

    host = _SANDBOX_HOST if os.getenv("APNS_USE_SANDBOX", "").lower() == "true" else _PROD_HOST
    topic = os.getenv("APNS_BUNDLE_ID")
    payload = {"aps": {"alert": {"title": title, "body": body}, "sound": "default"}}
    if data:
        payload.update(data)
    body_bytes = json.dumps(payload).encode("utf-8")

    try:
        import httpx
    except Exception as e:
        logger.warning(f"APNs: httpx unavailable ({e}); push disabled")
        return {"sent": 0, "failed": 0, "skipped": True}

    sent = failed = 0
    try:
        with httpx.Client(http2=True, timeout=10) as client:
            for token in tokens:
                try:
                    resp = client.post(
                        f"{host}/3/device/{token}",
                        headers={
                            "authorization": f"bearer {auth}",
                            "apns-topic": topic,
                            "apns-push-type": "alert",
                        },
                        content=body_bytes,
                    )
                    if resp.status_code == 200:
                        sent += 1
                    else:
                        failed += 1
                        logger.warning(f"APNs push failed ({resp.status_code}): {resp.text[:200]}")
                except Exception as e:
                    failed += 1
                    logger.warning(f"APNs push error: {e}")
    except Exception as e:
        # http2=True requires the `h2` package; degrade gracefully if missing.
        logger.warning(f"APNs client error ({e}); push disabled")
        return {"sent": sent, "failed": failed, "skipped": True}

    return {"sent": sent, "failed": failed, "skipped": False}
