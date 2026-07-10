#!/usr/bin/env python3
"""Publish to the PALM LinkedIn profile (personal member, w_member_social scope).

Uses credentials in the repo .env:
  LINKEDIN_ACCESS_TOKEN  -> member access token (60-day, from OAuth re-auth)
  LINKEDIN_PERSON_ID     -> OpenID `sub` of the member (urn:li:person:<id>)

Two media modes:
  - image:    an image post (1080x1350 / 1200x1200 PNG or JPG)
  - document: a native PDF "document" carousel (highest-engagement LinkedIn format)

LinkedIn suppresses posts that carry an external link in the body, so the body text
is posted link-free and the signup link is added as the FIRST COMMENT on the post
(matching the approved content plan).

Manual usage:
  python3 scripts/social/post_to_linkedin.py --image w1-imsg-contract.png \
      --text "..." --comment "palmcareai.com/register — free to start"
  python3 scripts/social/post_to_linkedin.py --document palm-linkedin-carousel.pdf \
      --title "2 hours of typing, deleted" --text "..." --comment "..."
  python3 scripts/social/post_to_linkedin.py --image foo.png --text "..." --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
import urllib.parse
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

API = "https://api.linkedin.com/v2"
TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
PERSON_ID = os.getenv("LINKEDIN_PERSON_ID")
LOCAL_MEDIA_DIR = PROJECT_ROOT / "apps/web/public/marketing/social"


class PostError(RuntimeError):
    pass


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {TOKEN}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }


def _check(resp: requests.Response, what: str) -> dict:
    if resp.status_code >= 400:
        raise PostError(f"{what} failed ({resp.status_code}): {resp.text[:400]}")
    if not resp.text:
        return {}
    try:
        return resp.json()
    except ValueError:
        return {}


def _resolve(name: str) -> Path:
    p = Path(name)
    if p.is_file():
        return p
    candidate = LOCAL_MEDIA_DIR / p.name
    if candidate.is_file():
        return candidate
    raise PostError(f"file not found: {name} (looked in cwd and {LOCAL_MEDIA_DIR})")


def _author() -> str:
    return f"urn:li:person:{PERSON_ID}"


def _register_upload(recipe: str) -> tuple[str, str]:
    """Register an upload for an image or document; return (upload_url, asset_urn)."""
    body = {
        "registerUploadRequest": {
            "recipes": [recipe],
            "owner": _author(),
            "serviceRelationships": [
                {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
            ],
        }
    }
    r = requests.post(f"{API}/assets?action=registerUpload", headers=_headers(), json=body, timeout=60)
    data = _check(r, "registerUpload")
    value = data["value"]
    upload_url = value["uploadMechanism"][
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]["uploadUrl"]
    asset = value["asset"]
    return upload_url, asset


def _upload_bytes(upload_url: str, file_path: Path, content_type: str) -> None:
    with open(file_path, "rb") as fh:
        r = requests.put(
            upload_url,
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": content_type},
            data=fh.read(),
            timeout=300,
        )
    if r.status_code >= 400:
        raise PostError(f"media upload failed ({r.status_code}): {r.text[:300]}")


def _create_ugc(text: str, asset: str, media_category: str, title: str | None) -> str:
    media_obj = {"status": "READY", "media": asset}
    if title:
        media_obj["title"] = {"text": title}
    body = {
        "author": _author(),
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": media_category,  # IMAGE or DOCUMENT
                "media": [media_obj],
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    r = requests.post(f"{API}/ugcPosts", headers=_headers(), json=body, timeout=60)
    data = _check(r, "ugcPosts create")
    urn = data.get("id") or r.headers.get("x-restli-id")
    if not urn:
        raise PostError(f"no post URN returned: {data} / headers={dict(r.headers)}")
    return urn


def _comment(post_urn: str, text: str) -> dict:
    body = {"actor": _author(), "object": post_urn, "message": {"text": text}}
    encoded = urllib.parse.quote(post_urn, safe="")
    r = requests.post(
        f"{API}/socialActions/{encoded}/comments", headers=_headers(), json=body, timeout=60
    )
    return _check(r, "first comment")


def _create_ugc_text(text: str) -> str:
    """Create a text-only member post (shareMediaCategory NONE)."""
    body = {
        "author": _author(),
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    r = requests.post(f"{API}/ugcPosts", headers=_headers(), json=body, timeout=60)
    data = _check(r, "ugcPosts create (text)")
    urn = data.get("id") or r.headers.get("x-restli-id")
    if not urn:
        raise PostError(f"no post URN returned: {data} / headers={dict(r.headers)}")
    return urn


def post_text(text: str, comment: str | None = None) -> dict:
    """Publish a text-only LinkedIn post (no media)."""
    urn = _create_ugc_text(text)
    print(f"  post URN: {urn}")
    result = {"post_urn": urn}
    if comment:
        try:
            _comment(urn, comment)
            result["comment"] = "posted"
        except PostError as e:
            result["comment_error"] = str(e)
            print(f"  first-comment WARN (post is live): {e}", file=sys.stderr)
    return result


def post_image(text: str, image: str, comment: str | None = None) -> dict:
    path = _resolve(image)
    ct = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    upload_url, asset = _register_upload("urn:li:digitalmediaRecipe:feedshare-image")
    _upload_bytes(upload_url, path, ct)
    urn = _create_ugc(text, asset, "IMAGE", None)
    print(f"  post URN: {urn}")
    result = {"post_urn": urn}
    if comment:
        try:
            _comment(urn, comment)
            result["comment"] = "posted"
        except PostError as e:
            result["comment_error"] = str(e)
            print(f"  first-comment WARN (post is live): {e}", file=sys.stderr)
    return result


def post_document(text: str, document: str, title: str, comment: str | None = None) -> dict:
    path = _resolve(document)
    upload_url, asset = _register_upload("urn:li:digitalmediaRecipe:feedshare-document")
    _upload_bytes(upload_url, path, "application/pdf")
    urn = _create_ugc(text, asset, "DOCUMENT", title)
    print(f"  post URN: {urn}")
    result = {"post_urn": urn}
    if comment:
        try:
            _comment(urn, comment)
            result["comment"] = "posted"
        except PostError as e:
            result["comment_error"] = str(e)
            print(f"  first-comment WARN (post is live): {e}", file=sys.stderr)
    return result


def require_env() -> None:
    missing = [k for k, v in {"LINKEDIN_ACCESS_TOKEN": TOKEN, "LINKEDIN_PERSON_ID": PERSON_ID}.items() if not v]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)} (re-auth LinkedIn)")


def verify_token() -> dict:
    r = requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=20,
    )
    return _check(r, "userinfo")


def main() -> int:
    ap = argparse.ArgumentParser(description="Publish to PALM LinkedIn")
    ap.add_argument("--text", required=True, help="Post body (no external link)")
    ap.add_argument("--image", help="Image filename/path")
    ap.add_argument("--document", help="PDF filename/path (document carousel)")
    ap.add_argument("--title", default="", help="Title for a document post")
    ap.add_argument("--comment", help="Text posted as the first comment (put the link here)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    require_env()
    if args.image and args.document:
        raise SystemExit("Provide only one of --image or --document")

    if args.dry_run:
        info = verify_token()
        media = args.image or args.document or "(text-only)"
        print("DRY RUN — nothing posted.")
        print(f"  token member: {info.get('name')} ({info.get('sub')})")
        print(f"  author urn  : {_author()}")
        print(f"  media       : {media}{' -> ' + str(_resolve(media)) if (args.image or args.document) else ''}")
        print(f"  body        : {args.text[:80]}...")
        print(f"  first comment: {args.comment}")
        return 0

    try:
        if args.image:
            res = post_image(args.text, args.image, args.comment)
        elif args.document:
            res = post_document(args.text, args.document, args.title or "PALM", args.comment)
        else:
            res = post_text(args.text, args.comment)
    except PostError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    print(f"LinkedIn OK: {res}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
