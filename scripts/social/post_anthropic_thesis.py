#!/usr/bin/env python3
"""Publish Muse's "unpopular opinion" thesis to LinkedIn and Threads.

Two things the general-purpose posters don't handle, added here:
  * LinkedIn text-only post (the reusable poster requires image/document media).
  * Threads thread-chaining: the post is ~1.4k chars and Threads caps a single
    post at 500, so it is published as a chain (each paragraph replies to the
    previous one) instead of being truncated.

Credentials come from the repo .env (same vars the other social scripts use):
  LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_ID
  META_THREADS_USER_TOKEN, META_THREADS_USER_ID (defaults to "me")

Usage:
  python scripts/social/post_anthropic_thesis.py                 # post to both
  python scripts/social/post_anthropic_thesis.py --platforms li  # LinkedIn only
  python scripts/social/post_anthropic_thesis.py --platforms th  # Threads only
  python scripts/social/post_anthropic_thesis.py --dry-run       # show, don't post

With no tokens present (e.g. a fresh cloud VM) it automatically dry-runs.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parents[2]
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT_ROOT / ".env")
except Exception:  # noqa: BLE001
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# ---------------------------------------------------------------- the content ---
POST_TEXT = (
    "SpaceX procures steel, fuel, launch pads, and years of physics that cannot "
    "be rushed. Every unit of output is a launch, bound by gravity and capital and "
    "time. Anthropic procures compute and produces intelligence, and that "
    "intelligence gets re-embedded into thousands of businesses simultaneously, "
    "improving every time the model gets better. One is bound by physical "
    "constraints. The other compounds.\n\n"
    "I did not read this thesis somewhere. I am the case study. Palm would not "
    "exist without Anthropic. I am one founder. I have no engineering team, no "
    "outside funding when I started, no runway to hire the fifteen people a "
    "documentation platform like this would normally take. What I had was Claude, "
    "doing the work of an engineering org so I could build the entire product "
    "myself, from the assessment engine to the contract generator.\n\n"
    "That is what nobody is pricing in when they compare these two companies. "
    "Palm's business depends entirely on the value Anthropic produces. Every "
    "assessment we turn into a care plan, every billable, every contract, all of "
    "it sits downstream of a model getting smarter month over month. Procurement "
    "used to mean buying parts. Now it means buying leverage. And the company "
    "selling leverage at that scale is worth more than the company selling "
    "launches.\n\n"
    "So why don't we just Palm It and make the world better with AI."
)

THREADS_LIMIT = 500

# ------------------------------------------------------------------- LinkedIn ---
LI_API = "https://api.linkedin.com/v2"
LI_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
LI_PERSON = os.getenv("LINKEDIN_PERSON_ID")


def _li_headers() -> dict:
    return {
        "Authorization": f"Bearer {LI_TOKEN}",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
    }


def linkedin_post_text(text: str) -> str:
    body = {
        "author": f"urn:li:person:{LI_PERSON}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    r = requests.post(f"{LI_API}/ugcPosts", headers=_li_headers(), json=body, timeout=60)
    if r.status_code >= 400:
        raise RuntimeError(f"LinkedIn post failed ({r.status_code}): {r.text[:400]}")
    urn = (r.json().get("id") if r.text else None) or r.headers.get("x-restli-id")
    if not urn:
        raise RuntimeError(f"LinkedIn: no post URN returned; headers={dict(r.headers)}")
    return urn


# --------------------------------------------------------------------- Threads ---
GRAPH_THREADS = "https://graph.threads.net/v1.0"
TH_TOKEN = os.getenv("META_THREADS_USER_TOKEN")
TH_USER = os.getenv("META_THREADS_USER_ID", "me")


def split_for_threads(text: str, limit: int = THREADS_LIMIT) -> list[str]:
    """Split into <=limit chunks, preferring paragraph then sentence boundaries."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    for para in paragraphs:
        if len(para) <= limit:
            chunks.append(para)
            continue
        sentences = para.replace(". ", ".\n").split("\n")
        current = ""
        for s in sentences:
            s = s.strip()
            if not s:
                continue
            candidate = f"{current} {s}".strip()
            if len(candidate) <= limit:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                current = s
        if current:
            chunks.append(current)
    # Add "(n/N)" markers so the chain reads as a thread.
    total = len(chunks)
    if total > 1:
        chunks = [f"{c} ({i}/{total})" for i, c in enumerate(chunks, 1)]
    return chunks


def _th_publish(text: str, reply_to_id: str | None) -> str:
    data = {"text": text, "media_type": "TEXT", "access_token": TH_TOKEN}
    if reply_to_id:
        data["reply_to_id"] = reply_to_id
    r = requests.post(f"{GRAPH_THREADS}/{TH_USER}/threads", data=data, timeout=120)
    if r.status_code >= 400 or "error" in r.json():
        raise RuntimeError(f"Threads container failed: {r.text[:400]}")
    creation_id = r.json()["id"]
    time.sleep(2)
    r2 = requests.post(
        f"{GRAPH_THREADS}/{TH_USER}/threads_publish",
        data={"creation_id": creation_id, "access_token": TH_TOKEN},
        timeout=120,
    )
    if r2.status_code >= 400 or "error" in r2.json():
        raise RuntimeError(f"Threads publish failed: {r2.text[:400]}")
    return r2.json()["id"]


def threads_post_chain(chunks: list[str]) -> list[str]:
    ids: list[str] = []
    reply_to = None
    for i, chunk in enumerate(chunks):
        pub_id = _th_publish(chunk, reply_to)
        ids.append(pub_id)
        reply_to = pub_id
        print(f"  Threads {i + 1}/{len(chunks)} published: {pub_id}")
        if i < len(chunks) - 1:
            time.sleep(3)
    return ids


# -------------------------------------------------------------------------- CLI ---
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--platforms", default="li,th", help="comma list: li,th")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    platforms = [p.strip().lower() for p in args.platforms.split(",") if p.strip()]
    chunks = split_for_threads(POST_TEXT)

    have_li = bool(LI_TOKEN and LI_PERSON)
    have_th = bool(TH_TOKEN)
    force_dry = args.dry_run or (("li" in platforms and not have_li) and ("th" in platforms and not have_th))

    print("=" * 64)
    print("PALM thesis post -> LinkedIn + Threads")
    print("=" * 64)
    print(f"LinkedIn body ({len(POST_TEXT)} chars):\n{POST_TEXT}\n")
    print(f"Threads chain ({len(chunks)} posts):")
    for i, c in enumerate(chunks, 1):
        print(f"  [{i}] ({len(c)} chars) {c}")
    print()

    if force_dry:
        if not (have_li or have_th):
            print("No LinkedIn/Threads tokens found. Dry run only.")
        else:
            print("Dry run requested.")
        print(f"  linkedin token: {'set' if have_li else 'MISSING'}")
        print(f"  threads token : {'set' if have_th else 'MISSING'}")
        print("\nNothing posted. Set the tokens and run without --dry-run to publish.")
        return 0

    rc = 0
    if "li" in platforms:
        if not have_li:
            print("LinkedIn: tokens missing, skipping.")
            rc = 1
        else:
            try:
                urn = linkedin_post_text(POST_TEXT)
                print(f"LinkedIn OK: {urn}")
            except Exception as e:  # noqa: BLE001
                print(f"LinkedIn ERROR: {e}", file=sys.stderr)
                rc = 1

    if "th" in platforms:
        if not have_th:
            print("Threads: token missing, skipping.")
            rc = 1
        else:
            try:
                ids = threads_post_chain(chunks)
                print(f"Threads OK: {len(ids)} posts, root={ids[0]}")
            except Exception as e:  # noqa: BLE001
                print(f"Threads ERROR: {e}", file=sys.stderr)
                rc = 1

    return rc


if __name__ == "__main__":
    raise SystemExit(main())
