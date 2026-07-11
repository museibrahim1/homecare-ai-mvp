"""Shared App Store Connect API helper (official API, JWT auth)."""
import json
import time
import urllib.request
import urllib.error
import urllib.parse

import jwt  # PyJWT

KEY_ID = "N5LFW2CYVG"
ISSUER_ID = "18430c66-4e0a-4733-8058-efaef5e61ce0"
KEY_PATH = "/Users/musaibrahim/.appstoreconnect/private_keys/AuthKey_N5LFW2CYVG.p8"
BASE = "https://api.appstoreconnect.apple.com"

_token_cache = {"token": None, "exp": 0}


def token() -> str:
    now = int(time.time())
    if _token_cache["token"] and now < _token_cache["exp"] - 60:
        return _token_cache["token"]
    with open(KEY_PATH) as f:
        key = f.read()
    exp = now + 19 * 60
    t = jwt.encode(
        {"iss": ISSUER_ID, "iat": now, "exp": exp, "aud": "appstoreconnect-v1"},
        key,
        algorithm="ES256",
        headers={"kid": KEY_ID},
    )
    _token_cache.update(token=t, exp=exp)
    return t


def req(method: str, path: str, body: dict | None = None, retries: int = 3):
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(body).encode() if body is not None else None
    for attempt in range(retries):
        r = urllib.request.Request(url, data=data, method=method)
        r.add_header("Authorization", f"Bearer {token()}")
        if data:
            r.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            body_text = e.read().decode()
            if e.code == 429 and attempt < retries - 1:
                time.sleep(75)
                continue
            if e.code >= 500 and attempt < retries - 1:
                time.sleep(5)
                continue
            raise RuntimeError(f"{method} {url} -> {e.code}: {body_text[:500]}")


def get_all(path: str):
    """Follow pagination, return combined data list."""
    out = []
    url: str | None = path
    while url:
        page = req("GET", url)
        out.extend(page.get("data", []))
        url = page.get("links", {}).get("next")
    return out
