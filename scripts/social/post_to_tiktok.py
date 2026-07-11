#!/usr/bin/env python3
"""Publish video to the PALM TikTok account via the Content Posting API.

Uses credentials in the repo .env (from the TikTok developer app "PALM"):
  TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
  TIKTOK_REDIRECT_URI     -> must match a redirect URI registered in the app
  TIKTOK_ACCESS_TOKEN     -> filled in by `token` / `refresh` commands
  TIKTOK_REFRESH_TOKEN    -> filled in by `token` / `refresh` commands

One-time setup (in the TikTok developer portal, App details):
  1. Add the "Content Posting API" product to the app.
  2. Add scopes: user.info.basic, video.publish (and/or video.upload).
  3. Register the redirect URI that matches TIKTOK_REDIRECT_URI.

Auth flow (run once to mint tokens):
  python3 scripts/social/post_to_tiktok.py auth-url
    -> open the printed URL, log in, approve. TikTok redirects to your
       redirect URI with ?code=XXXX. Copy that code (the page itself may 404,
       the code in the address bar is what matters).
  python3 scripts/social/post_to_tiktok.py token --code XXXX
    -> exchanges the code and writes the tokens back into .env.

Posting:
  python3 scripts/social/post_to_tiktok.py post \
      --video marketing/launch/palm-app-launch-9x16.mp4 \
      --caption "..." --privacy SELF_ONLY

Notes:
  - Until the app passes TikTok's audit, video.publish is limited: posts can
    only go to the authorized creator's own account and privacy is forced to
    SELF_ONLY (private). Run `creator-info` to see the privacy levels the API
    will accept for this token.
  - FILE_UPLOAD (used here) uploads the bytes directly, so no domain
    verification is needed (unlike PULL_FROM_URL).
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"
load_dotenv(ENV_PATH)

AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/"
API = "https://open.tiktokapis.com/v2"
LOCAL_MEDIA_DIR = PROJECT_ROOT / "apps/web/public/marketing/social"

CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY")
CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET")
REDIRECT_URI = os.getenv("TIKTOK_REDIRECT_URI", "https://palmcareai.com/tiktok/callback")
ACCESS_TOKEN = os.getenv("TIKTOK_ACCESS_TOKEN")
REFRESH_TOKEN = os.getenv("TIKTOK_REFRESH_TOKEN")

SCOPES = "user.info.basic,video.publish,video.upload"


class PostError(RuntimeError):
    pass


def _check(resp: requests.Response, what: str) -> dict:
    try:
        data = resp.json()
    except ValueError:
        data = {}
    err = (data.get("error") or {})
    code = err.get("code")
    if resp.status_code >= 400 or (code and code not in ("ok", "", None)):
        raise PostError(f"{what} failed ({resp.status_code}): {resp.text[:500]}")
    return data


def _resolve(name: str) -> Path:
    p = Path(name)
    if p.is_file():
        return p
    candidate = LOCAL_MEDIA_DIR / p.name
    if candidate.is_file():
        return candidate
    raise PostError(f"file not found: {name} (looked in cwd and {LOCAL_MEDIA_DIR})")


def _update_env(values: dict[str, str]) -> None:
    lines = ENV_PATH.read_text().splitlines()
    keys = set(values)
    out = []
    seen = set()
    for line in lines:
        if "=" in line and not line.lstrip().startswith("#"):
            k = line.split("=", 1)[0].strip()
            if k in keys:
                out.append(f"{k}={values[k]}")
                seen.add(k)
                continue
        out.append(line)
    for k in keys - seen:
        out.append(f"{k}={values[k]}")
    ENV_PATH.write_text("\n".join(out) + "\n")


def require_client() -> None:
    missing = [k for k, v in {
        "TIKTOK_CLIENT_KEY": CLIENT_KEY,
        "TIKTOK_CLIENT_SECRET": CLIENT_SECRET,
    }.items() if not v]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)} (check .env)")


# ------------------------------------------------------------------ OAuth
def cmd_auth_url() -> int:
    require_client()
    params = {
        "client_key": CLIENT_KEY,
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "state": "palm_launch",
    }
    url = AUTH_BASE + "?" + urllib.parse.urlencode(params)
    print("Open this URL, log in as the PALM TikTok account, and approve:\n")
    print(url)
    print(f"\nAfter approving you land on {REDIRECT_URI}?code=...&state=...")
    print("Copy the `code` value, then run:")
    print("  python3 scripts/social/post_to_tiktok.py token --code <CODE>")
    return 0


def cmd_token(code: str) -> int:
    require_client()
    r = requests.post(
        f"{API}/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_key": CLIENT_KEY,
            "client_secret": CLIENT_SECRET,
            "code": urllib.parse.unquote(code),
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
        },
        timeout=60,
    )
    data = _check(r, "token exchange")
    access = data.get("access_token")
    refresh = data.get("refresh_token")
    if not access:
        raise PostError(f"no access_token in response: {data}")
    _update_env({
        "TIKTOK_ACCESS_TOKEN": access,
        "TIKTOK_REFRESH_TOKEN": refresh or "",
    })
    print(f"Tokens saved to .env. Scopes: {data.get('scope')}. "
          f"Expires in {data.get('expires_in')}s.")
    return 0


def cmd_refresh() -> int:
    require_client()
    if not REFRESH_TOKEN:
        raise SystemExit("TIKTOK_REFRESH_TOKEN not set — run the token command first.")
    r = requests.post(
        f"{API}/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_key": CLIENT_KEY,
            "client_secret": CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": REFRESH_TOKEN,
        },
        timeout=60,
    )
    data = _check(r, "token refresh")
    _update_env({
        "TIKTOK_ACCESS_TOKEN": data.get("access_token", ""),
        "TIKTOK_REFRESH_TOKEN": data.get("refresh_token", REFRESH_TOKEN),
    })
    print("Access token refreshed and saved to .env.")
    return 0


def _auth_headers() -> dict:
    if not ACCESS_TOKEN:
        raise SystemExit("TIKTOK_ACCESS_TOKEN not set — complete the auth flow first.")
    return {"Authorization": f"Bearer {ACCESS_TOKEN}"}


def cmd_creator_info() -> int:
    r = requests.post(
        f"{API}/post/publish/creator_info/query/",
        headers={**_auth_headers(), "Content-Type": "application/json; charset=UTF-8"},
        timeout=60,
    )
    data = _check(r, "creator_info query")
    d = data.get("data", {})
    print(f"  creator      : {d.get('creator_nickname')} (@{d.get('creator_username')})")
    print(f"  privacy opts : {d.get('privacy_level_options')}")
    print(f"  max duration : {d.get('max_video_post_duration_sec')}s")
    return 0


# ------------------------------------------------------------------ Publish
def cmd_post(video: str, caption: str, privacy: str, dry_run: bool) -> int:
    path = _resolve(video)
    size = path.stat().st_size

    if dry_run:
        print("DRY RUN — nothing posted.")
        print(f"  video   : {path} ({size} bytes)")
        print(f"  caption : {caption[:80]}{'...' if len(caption) > 80 else ''}")
        print(f"  privacy : {privacy}")
        print(f"  token   : {'set' if ACCESS_TOKEN else 'MISSING (run auth flow)'}")
        return 0

    headers = {**_auth_headers(), "Content-Type": "application/json; charset=UTF-8"}
    init_body = {
        "post_info": {
            "title": caption,
            "privacy_level": privacy,
            "disable_duet": False,
            "disable_comment": False,
            "disable_stitch": False,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": size,
            "chunk_size": size,
            "total_chunk_count": 1,
        },
    }
    r = requests.post(
        f"{API}/post/publish/video/init/", headers=headers, json=init_body, timeout=60
    )
    data = _check(r, "publish init").get("data", {})
    publish_id = data.get("publish_id")
    upload_url = data.get("upload_url")
    if not upload_url:
        raise PostError(f"no upload_url returned: {data}")

    with open(path, "rb") as fh:
        blob = fh.read()
    up = requests.put(
        upload_url,
        headers={
            "Content-Type": "video/mp4",
            "Content-Length": str(size),
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        },
        data=blob,
        timeout=300,
    )
    if up.status_code >= 400:
        raise PostError(f"video upload failed ({up.status_code}): {up.text[:300]}")
    print(f"  uploaded {size} bytes, publish_id={publish_id}")

    for _ in range(40):
        s = requests.post(
            f"{API}/post/publish/status/fetch/",
            headers=headers,
            json={"publish_id": publish_id},
            timeout=60,
        )
        sd = _check(s, "status fetch").get("data", {})
        status = sd.get("status")
        print(f"  status: {status}")
        if status in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            print(f"TikTok OK: publish_id={publish_id} ({status})")
            return 0
        if status == "FAILED":
            raise PostError(f"publish failed: {sd}")
        time.sleep(5)
    print(f"Still processing. publish_id={publish_id}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Publish video to PALM TikTok")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("auth-url")
    t = sub.add_parser("token")
    t.add_argument("--code", required=True)
    sub.add_parser("refresh")
    sub.add_parser("creator-info")
    p = sub.add_parser("post")
    p.add_argument("--video", required=True)
    p.add_argument("--caption", required=True)
    p.add_argument("--privacy", default="SELF_ONLY",
                   help="PUBLIC_TO_EVERYONE (audited apps) / SELF_ONLY / MUTUAL_FOLLOW_FRIENDS")
    p.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        if args.cmd == "auth-url":
            return cmd_auth_url()
        if args.cmd == "token":
            return cmd_token(args.code)
        if args.cmd == "refresh":
            return cmd_refresh()
        if args.cmd == "creator-info":
            return cmd_creator_info()
        if args.cmd == "post":
            return cmd_post(args.video, args.caption, args.privacy, args.dry_run)
    except PostError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
