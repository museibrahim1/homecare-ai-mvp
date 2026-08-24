#!/usr/bin/env python3
"""Post-upload TestFlight steps for PALM iOS builds.

Run on a Mac after Xcode Cloud (or local archive) uploads build 18+.
Requires ASC_AUTH_KEY_PATH (or default Mac key path) and python3.11 + PyJWT.

Usage:
  python3.11 scripts/ios/release_testflight_build.py --build-number 18
  python3.11 scripts/ios/release_testflight_build.py --build-number 18 --dry-run

Steps (from project TestFlight checklist):
  1. Wait for build processingState VALID
  2. Set What to Test on beta build localization
  3. Remove stale betaAppReviewSubmissions, create new external review submission
  4. Attach build to Agencies external group
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "asc"))

from asc_api import get_all, req  # noqa: E402

APP_ID = "6766371988"
EXTERNAL_GROUP_ID = "5cac674b-59ab-4c60-95e1-3ee557c47c86"
DEFAULT_WHATS_NEW = (
    "Comfort Keepers demo prep: demo@agency.com bypasses paywall for recording and "
    "uploads. DEMO_EMAIL set in app bundle. Use demo@agency.com / demo1234 on web "
    "and iOS. Test: login, browse clients, Palm It record or MP3 upload, review "
    "note + contract on Patricia Martinez or Robert Williams."
)


def find_build(app_id: str, build_number: str) -> dict | None:
    builds = get_all(f"/v1/builds?filter[app]={app_id}&limit=20&sort=-uploadedDate")
    for b in builds:
        if str(b.get("attributes", {}).get("version")) == str(build_number):
            return b
    return None


def wait_for_valid(build_id: str, *, max_wait_sec: int = 1800) -> dict:
    deadline = time.time() + max_wait_sec
    while time.time() < deadline:
        b = req("GET", f"/v1/builds/{build_id}")
        state = b["data"]["attributes"].get("processingState")
        print(f"  processingState={state}")
        if state == "VALID":
            return b["data"]
        if state == "INVALID":
            raise RuntimeError(f"Build {build_id} is INVALID")
        time.sleep(30)
    raise TimeoutError(f"Build {build_id} not VALID after {max_wait_sec}s")


def set_whats_new(build_id: str, text: str, *, dry_run: bool) -> None:
    locs = req("GET", f"/v1/builds/{build_id}/betaBuildLocalizations")
    for loc in locs.get("data", []):
        loc_id = loc["id"]
        locale = loc["attributes"].get("locale")
        print(f"  set whatsNew on {locale} ({loc_id[:8]}…)")
        if dry_run:
            continue
        req(
            "PATCH",
            f"/v1/betaBuildLocalizations/{loc_id}",
            {
                "data": {
                    "type": "betaBuildLocalizations",
                    "id": loc_id,
                    "attributes": {"whatsNew": text},
                }
            },
        )


def cleanup_stale_submissions(*, dry_run: bool) -> None:
    subs = get_all(f"/v1/betaAppReviewSubmissions?filter[app]={APP_ID}")
    for sub in subs:
        state = sub["attributes"].get("state")
        sub_id = sub["id"]
        if state in {"WAITING_FOR_REVIEW", "IN_REVIEW", "APPROVED"}:
            print(f"  keep submission {sub_id[:8]}… state={state}")
            continue
        print(f"  delete stale submission {sub_id[:8]}… state={state}")
        if not dry_run:
            req("DELETE", f"/v1/betaAppReviewSubmissions/{sub_id}")


def submit_for_external_review(build_id: str, *, dry_run: bool) -> None:
    print("  create betaAppReviewSubmission")
    if dry_run:
        return
    req(
        "POST",
        "/v1/betaAppReviewSubmissions",
        {
            "data": {
                "type": "betaAppReviewSubmissions",
                "relationships": {
                    "build": {"data": {"type": "builds", "id": build_id}}
                },
            }
        },
    )


def attach_to_agencies_group(build_id: str, *, dry_run: bool) -> None:
    print(f"  attach build to external group {EXTERNAL_GROUP_ID[:8]}…")
    if dry_run:
        return
    req(
        "POST",
        f"/v1/betaGroups/{EXTERNAL_GROUP_ID}/relationships/builds",
        {"data": [{"type": "builds", "id": build_id}]},
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--build-number", required=True, help="CFBundleVersion / CURRENT_PROJECT_VERSION")
    parser.add_argument("--whats-new", default=DEFAULT_WHATS_NEW)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-wait", action="store_true")
    args = parser.parse_args()

    print(f"=== TestFlight release prep build {args.build_number} ===")
    build = find_build(APP_ID, args.build_number)
    if not build:
        print(f"No build found with version={args.build_number}. Upload may still be processing.")
        return 1
    build_id = build["id"]
    print(f"Found build {build_id} uploadedDate={build['attributes'].get('uploadedDate')}")

    if not args.skip_wait:
        print("Waiting for VALID…")
        wait_for_valid(build_id)

    print("Setting What to Test…")
    set_whats_new(build_id, args.whats_new, dry_run=args.dry_run)

    print("Cleaning stale beta review submissions…")
    cleanup_stale_submissions(dry_run=args.dry_run)

    print("Submitting for external beta review…")
    submit_for_external_review(build_id, dry_run=args.dry_run)

    print("Attaching to Agencies external group…")
    attach_to_agencies_group(build_id, dry_run=args.dry_run)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
