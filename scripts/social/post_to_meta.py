#!/usr/bin/env python3
"""Publish marketing content to the PALM Facebook Page and Instagram (@palmcareai).

Uses the "PALM Social Publisher" Meta app credentials stored in the repo .env:
  META_PAGE_ID, META_PAGE_ACCESS_TOKEN  -> Facebook Page (non-expiring page token)
  META_IG_BUSINESS_ID                   -> Instagram Business account
  META_PAGE_ACCESS_TOKEN is also used for IG publishing (IG is linked to the Page).

Instagram's Content Publishing API can ONLY ingest media from a public https URL
(no direct file upload). Facebook can take either a local file or a URL. So:
  - Pass an https URL and it works for both platforms.
  - Pass a bare filename or local path: Facebook uploads the bytes directly; for
    Instagram the file is mapped to MEDIA_BASE_URL/<filename> (the file must be
    deployed/live at that URL at publish time).

Examples
  # Image to both FB + IG
  python scripts/social/post_to_meta.py \
      --platforms fb,ig \
      --image ad-square-how-it-works.png \
      --caption "From conversation to contract. ..."

  # Reel/video to both
  python scripts/social/post_to_meta.py \
      --platforms fb,ig --reel \
      --video ad-video-pipeline-9x16.mp4 \
      --caption "Talk. Don't type. ..."

  # Plain text status to the FB Page only
  python scripts/social/post_to_meta.py --platforms fb --caption "Hello world"

  # Validate without posting
  python scripts/social/post_to_meta.py --platforms fb,ig --image foo.png --caption "..." --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

GRAPH = "https://graph.facebook.com/v21.0"
GRAPH_THREADS = "https://graph.threads.net/v1.0"

PAGE_ID = os.getenv("META_PAGE_ID")
PAGE_TOKEN = os.getenv("META_PAGE_ACCESS_TOKEN")
IG_ID = os.getenv("META_IG_BUSINESS_ID")
THREADS_TOKEN = os.getenv("META_THREADS_USER_TOKEN")
THREADS_USER_ID = os.getenv("META_THREADS_USER_ID", "me")
# Where local marketing files are publicly served (for Instagram URL ingestion).
MEDIA_BASE_URL = os.getenv("META_MEDIA_BASE_URL", "https://palmcareai.com/marketing/social")
# Local dir that mirrors MEDIA_BASE_URL, used to attach local bytes to Facebook.
LOCAL_MEDIA_DIR = PROJECT_ROOT / "apps/web/public/marketing/social"


class PostError(RuntimeError):
    pass


def _check(resp: requests.Response, what: str) -> dict:
    try:
        data = resp.json()
    except ValueError:
        raise PostError(f"{what}: non-JSON response ({resp.status_code}): {resp.text[:300]}")
    if resp.status_code >= 400 or "error" in data:
        err = data.get("error", data)
        raise PostError(f"{what} failed: {err}")
    return data


def _is_url(s: str) -> bool:
    return s.startswith("http://") or s.startswith("https://")


def resolve_local(path_or_name: str) -> Path | None:
    """Return a local file Path for a bare name/relative path, else None."""
    p = Path(path_or_name)
    if p.is_file():
        return p
    candidate = LOCAL_MEDIA_DIR / p.name
    if candidate.is_file():
        return candidate
    return None


def public_url_for(path_or_name: str) -> str:
    """Resolve an https URL for Instagram ingestion."""
    if _is_url(path_or_name):
        return path_or_name
    name = Path(path_or_name).name
    return f"{MEDIA_BASE_URL.rstrip('/')}/{name}"


# --------------------------------------------------------------------------- FB
def fb_post_text(message: str) -> dict:
    r = requests.post(
        f"{GRAPH}/{PAGE_ID}/feed",
        data={"message": message, "access_token": PAGE_TOKEN},
        timeout=60,
    )
    return _check(r, "FB text post")


def fb_post_photo(image: str, caption: str) -> dict:
    local = resolve_local(image)
    data = {"caption": caption, "access_token": PAGE_TOKEN}
    if local is not None:
        with open(local, "rb") as fh:
            r = requests.post(
                f"{GRAPH}/{PAGE_ID}/photos",
                data=data,
                files={"source": fh},
                timeout=300,
            )
    else:
        data["url"] = public_url_for(image)
        r = requests.post(f"{GRAPH}/{PAGE_ID}/photos", data=data, timeout=120)
    return _check(r, "FB photo post")


def fb_post_video(video: str, caption: str) -> dict:
    local = resolve_local(video)
    data = {"description": caption, "access_token": PAGE_TOKEN}
    if local is not None:
        with open(local, "rb") as fh:
            r = requests.post(
                f"{GRAPH}/{PAGE_ID}/videos",
                data=data,
                files={"source": fh},
                timeout=600,
            )
    else:
        data["file_url"] = public_url_for(video)
        r = requests.post(f"{GRAPH}/{PAGE_ID}/videos", data=data, timeout=120)
    return _check(r, "FB video post")


# --------------------------------------------------------------------------- IG
def _ig_wait_ready(creation_id: str, timeout_s: int = 300) -> None:
    """Poll an IG media container until it is FINISHED (needed for video/reels)."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        r = requests.get(
            f"{GRAPH}/{creation_id}",
            params={"fields": "status_code,status", "access_token": PAGE_TOKEN},
            timeout=60,
        )
        data = _check(r, "IG container status")
        status = data.get("status_code")
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise PostError(f"IG container processing error: {data.get('status')}")
        time.sleep(5)
    raise PostError("IG container did not finish processing in time")


def ig_publish_image(image: str, caption: str) -> dict:
    url = public_url_for(image)
    r = requests.post(
        f"{GRAPH}/{IG_ID}/media",
        data={"image_url": url, "caption": caption, "access_token": PAGE_TOKEN},
        timeout=120,
    )
    container = _check(r, "IG image container")
    creation_id = container["id"]
    _ig_wait_ready(creation_id)
    r2 = requests.post(
        f"{GRAPH}/{IG_ID}/media_publish",
        data={"creation_id": creation_id, "access_token": PAGE_TOKEN},
        timeout=120,
    )
    return _check(r2, "IG image publish")


def ig_publish_reel(video: str, caption: str, share_to_feed: bool = True) -> dict:
    url = public_url_for(video)
    r = requests.post(
        f"{GRAPH}/{IG_ID}/media",
        data={
            "media_type": "REELS",
            "video_url": url,
            "caption": caption,
            "share_to_feed": "true" if share_to_feed else "false",
            "access_token": PAGE_TOKEN,
        },
        timeout=120,
    )
    container = _check(r, "IG reel container")
    creation_id = container["id"]
    _ig_wait_ready(creation_id, timeout_s=600)
    r2 = requests.post(
        f"{GRAPH}/{IG_ID}/media_publish",
        data={"creation_id": creation_id, "access_token": PAGE_TOKEN},
        timeout=120,
    )
    return _check(r2, "IG reel publish")


# ---------------------------------------------------------------------- Threads
def _th_wait_ready(creation_id: str, timeout_s: int = 300) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        r = requests.get(
            f"{GRAPH_THREADS}/{creation_id}",
            params={"fields": "status,error_message", "access_token": THREADS_TOKEN},
            timeout=60,
        )
        data = _check(r, "Threads container status")
        status = data.get("status")
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise PostError(f"Threads container error: {data.get('error_message')}")
        time.sleep(4)
    raise PostError("Threads container did not finish processing in time")


def threads_post(caption: str, image: str | None = None, video: str | None = None) -> dict:
    if not THREADS_TOKEN:
        raise PostError("META_THREADS_USER_TOKEN not set (complete Threads OAuth first)")
    data = {"text": caption, "access_token": THREADS_TOKEN}
    if image:
        data["media_type"] = "IMAGE"
        data["image_url"] = public_url_for(image)
    elif video:
        data["media_type"] = "VIDEO"
        data["video_url"] = public_url_for(video)
    else:
        data["media_type"] = "TEXT"
    r = requests.post(f"{GRAPH_THREADS}/{THREADS_USER_ID}/threads", data=data, timeout=120)
    container = _check(r, "Threads container")
    creation_id = container["id"]
    if image or video:
        _th_wait_ready(creation_id, timeout_s=600 if video else 300)
    r2 = requests.post(
        f"{GRAPH_THREADS}/{THREADS_USER_ID}/threads_publish",
        data={"creation_id": creation_id, "access_token": THREADS_TOKEN},
        timeout=120,
    )
    return _check(r2, "Threads publish")


# -------------------------------------------------------------------------- CLI
def require_env() -> None:
    missing = [k for k, v in {
        "META_PAGE_ID": PAGE_ID,
        "META_PAGE_ACCESS_TOKEN": PAGE_TOKEN,
    }.items() if not v]
    if missing:
        raise SystemExit(f"Missing env vars: {', '.join(missing)} (check .env)")


def main() -> int:
    ap = argparse.ArgumentParser(description="Publish to PALM Facebook Page + Instagram")
    ap.add_argument("--platforms", default="fb,ig",
                    help="Comma list: fb,ig,th (default fb,ig). th = Threads")
    ap.add_argument("--caption", required=True, help="Caption / message text")
    ap.add_argument("--image", help="Image filename, local path, or https URL")
    ap.add_argument("--video", help="Video filename, local path, or https URL")
    ap.add_argument("--reel", action="store_true",
                    help="Treat --video as a Reel (IG) / share to feed")
    ap.add_argument("--no-feed", action="store_true",
                    help="For reels, do NOT also share to the main IG feed")
    ap.add_argument("--dry-run", action="store_true",
                    help="Validate inputs and resolved URLs without posting")
    args = ap.parse_args()

    if args.image and args.video:
        raise SystemExit("Provide only one of --image or --video")

    platforms = [p.strip().lower() for p in args.platforms.split(",") if p.strip()]
    for p in platforms:
        if p not in ("fb", "ig", "th"):
            raise SystemExit(f"Unknown platform: {p}")

    require_env()
    if "ig" in platforms and not IG_ID:
        raise SystemExit("META_IG_BUSINESS_ID not set but 'ig' platform requested")
    if "th" in platforms and not THREADS_TOKEN and not args.dry_run:
        raise SystemExit("META_THREADS_USER_TOKEN not set but 'th' platform requested")

    media = args.image or args.video
    kind = "image" if args.image else ("video" if args.video else "text")

    if args.dry_run:
        print("DRY RUN — nothing will be posted.")
        print(f"  platforms : {platforms}")
        print(f"  kind      : {kind}{' (reel)' if args.reel else ''}")
        print(f"  caption   : {args.caption[:80]}{'...' if len(args.caption) > 80 else ''}")
        if media:
            local = resolve_local(media)
            print(f"  media     : {media}")
            print(f"  local file: {local if local else '(none — must be a public URL for FB upload)'}")
            print(f"  ig/th url : {public_url_for(media)}")
            if "ig" in platforms or "th" in platforms:
                _verify_public(public_url_for(media))
        print(f"  threads tok: {'set' if THREADS_TOKEN else 'MISSING (OAuth pending)'}")
        return 0

    results: dict[str, dict] = {}
    try:
        if "fb" in platforms:
            if kind == "image":
                results["fb"] = fb_post_photo(media, args.caption)
            elif kind == "video":
                results["fb"] = fb_post_video(media, args.caption)
            else:
                results["fb"] = fb_post_text(args.caption)
            print(f"FB OK: {results['fb']}")

        if "ig" in platforms:
            if kind == "image":
                results["ig"] = ig_publish_image(media, args.caption)
            elif kind == "video":
                results["ig"] = ig_publish_reel(
                    media, args.caption, share_to_feed=not args.no_feed)
            else:
                raise PostError("Instagram requires an --image or --video (no text-only posts)")
            print(f"IG OK: {results['ig']}")

        if "th" in platforms:
            results["th"] = threads_post(
                args.caption,
                image=media if kind == "image" else None,
                video=media if kind == "video" else None,
            )
            print(f"Threads OK: {results['th']}")
    except PostError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    print("\nDone.")
    return 0


def _verify_public(url: str) -> None:
    try:
        h = requests.head(url, timeout=20, allow_redirects=True)
        ok = h.status_code < 400
        print(f"  ig url HEAD: {h.status_code} {'OK' if ok else 'NOT REACHABLE'}")
        if not ok:
            print("  ^ Instagram cannot ingest this yet. Deploy the asset to the public URL first.")
    except requests.RequestException as e:
        print(f"  ig url HEAD: unreachable ({e})")


if __name__ == "__main__":
    raise SystemExit(main())
