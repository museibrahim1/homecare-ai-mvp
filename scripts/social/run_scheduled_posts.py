#!/usr/bin/env python3
"""Twice-daily social runner (AM + PM slots).

Traffic month: Aug 14 – Sep 13, 2026 (new creatives only).
Old Jul–Aug campaign calendars are retired.

AM slot (11:30 AM ET): date-specific Meta posts + LinkedIn on scheduled days.
PM slot (6:30 PM ET): rotating sep-pm library on Meta + LinkedIn.

AM Facebook photos: posted by this runner unless the Page already has a
natively scheduled (Meta Business Suite) or published post for the day. The
old local-Mac schedule_meta_fb.py flow is retired, so this is the default path.

Run via GitHub Actions twice daily. Dedupes per platform per date+slot in
.posted_log.json; re-running a partial day fills only the missing platforms.

Manual usage:
  python3 scripts/social/run_scheduled_posts.py --slot am
  python3 scripts/social/run_scheduled_posts.py --slot pm --dry-run
  python3 scripts/social/run_scheduled_posts.py --date 2026-08-14 --slot am
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from post_to_meta import (  # noqa: E402
    fb_page_has_post_on,
    fb_post_photo,
    fb_post_video,
    ig_publish_image,
    ig_publish_reel,
    threads_post,
    require_env as require_meta_env,
)
from post_to_linkedin import (  # noqa: E402
    post_image as li_post_image,
    post_document as li_post_document,
    require_env as require_li_env,
)

LOG_FILE = HERE / ".posted_log.json"

# --------------------------------------------------------------------------- Meta / LinkedIn / PM
# Source of truth for Aug 14 – Sep 13, 2026 traffic month. Old Jul campaign removed.
from sep2026_calendar import META, LINKEDIN, PM_DAILY  # noqa: E402

SIGNUP = "palmcareai.com/r/meta"
APP = "palmcareai.com/a/meta"
DEMO = "palmcareai.com/d/meta"
WEB = "palmcareai.com/w/meta"
BLOG = "palmcareai.com/b/meta"
LI_SIGNUP = "palmcareai.com/r/li"
LI_APP = "palmcareai.com/a/li"
LI_DEMO = "palmcareai.com/d/li"
LI_WEB = "palmcareai.com/w/li"

_CAMPAIGN_START = dt.date(2026, 8, 14)
_CAMPAIGN_END = dt.date(2026, 9, 13)


def _day_index(date_str: str) -> int:
    d = dt.date.fromisoformat(date_str)
    return (d - _CAMPAIGN_START).days


def _in_campaign(date_str: str) -> bool:
    d = dt.date.fromisoformat(date_str)
    return _CAMPAIGN_START <= d <= _CAMPAIGN_END


def _fmt_meta(caption: str) -> str:
    return caption.format(s=SIGNUP, a=APP, d=DEMO, w=WEB, b=BLOG)


def get_meta_am(date: str) -> tuple[str, str] | None:
    if date in META:
        return META[date]
    return None


def get_meta_pm(date: str) -> tuple[str, str] | None:
    if not _in_campaign(date):
        return None
    img, caption, _ = PM_DAILY[_day_index(date) % len(PM_DAILY)]
    return img, caption


def get_linkedin_am(date: str) -> tuple[str, str, str, str] | None:
    if date not in LINKEDIN:
        return None
    kind, media, _title, body, comment = LINKEDIN[date]
    return kind, media, body, comment


def get_linkedin_pm(date: str) -> tuple[str, str, str] | None:
    if not _in_campaign(date):
        return None
    img, _, li_body = PM_DAILY[_day_index(date) % len(PM_DAILY)]
    return img, li_body, f"{LI_APP} · Demo: {LI_DEMO}"


def load_log() -> dict:
    if LOG_FILE.is_file():
        return json.loads(LOG_FILE.read_text())
    return {}


def save_log(log: dict) -> None:
    LOG_FILE.write_text(json.dumps(log, indent=2))


def threads_safe(caption: str, limit: int = 500) -> str:
    """Threads caps posts at 500 chars (FB/IG don't). Trim safely if needed:
    first drop the trailing hashtag line, then hard-truncate at a word boundary."""
    if len(caption) <= limit:
        return caption
    lines = caption.rstrip().split("\n")
    while lines and lines[-1].lstrip().startswith("#"):
        lines.pop()
    trimmed = "\n".join(lines).rstrip()
    if len(trimmed) <= limit:
        return trimmed
    cut = trimmed[: limit - 1]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip()


def run_meta(date: str, slot: str, dry: bool, prior: dict | None = None) -> dict | None:
    """Publish IG + FB + Threads. FB photos in the AM slot are only posted when
    the Page has no natively scheduled post for the day (Meta Business Suite
    scheduling was retired with the local Mac flow, so the runner is now the
    default FB path). Platforms already recorded in `prior` are skipped, so a
    re-run of a partial day fills the gaps without double-posting."""
    entry = get_meta_pm(date) if slot == "pm" else get_meta_am(date)
    if entry is None:
        return None
    media, caption = entry
    caption = _fmt_meta(caption)
    is_video = media.endswith(".mp4")
    if dry:
        platforms = ["IG Reel" if is_video else "IG", "Threads"]
        platforms.append("FB" if (slot == "pm" or is_video) else "FB (if no native post that day)")
        print(f"{date} {slot}: WOULD post {media} to {' + '.join(platforms)}:\n---\n{caption}\n---")
        return {"dry": True}
    require_meta_env()
    results: dict = dict(prior or {})
    if "ig" not in results:
        if is_video:
            ig = ig_publish_reel(media, caption)
            results["ig"] = ig.get("id")
            print(f"IG Reel OK: {results['ig']}")
        else:
            ig = ig_publish_image(media, caption)
            results["ig"] = ig.get("id")
            print(f"IG OK: {results['ig']}")
    else:
        print(f"IG already posted ({results['ig']}), skipping")
    if "fb" not in results:
        post_fb = slot == "pm" or is_video or not fb_page_has_post_on(date)
        if post_fb:
            try:
                fb = fb_post_video(media, caption) if is_video else fb_post_photo(media, caption)
                results["fb"] = fb.get("id")
                results.pop("fb_error", None)
                print(f"FB OK: {results['fb']}")
            except Exception as e:
                results["fb_error"] = str(e)[:200]
                print(f"FB WARN: {e}", file=sys.stderr)
        else:
            print("FB: page already has a post for this day, skipping AM photo")
    else:
        print(f"FB already posted ({results['fb']}), skipping")
    if "th" not in results:
        try:
            th = threads_post(threads_safe(caption), video=media) if is_video else threads_post(threads_safe(caption), image=media)
            results["th"] = th.get("id")
            results.pop("th_error", None)
            print(f"Threads OK: {results['th']}")
        except Exception as e:
            results["th_error"] = str(e)[:200]
            print(f"Threads WARN: {e}", file=sys.stderr)
    else:
        print(f"Threads already posted ({results['th']}), skipping")
    return results


def run_linkedin(date: str, slot: str, dry: bool, prior: dict | None = None) -> dict | None:
    entry = get_linkedin_pm(date) if slot == "pm" else get_linkedin_am(date)
    if entry is None:
        return None
    if prior and prior.get("post_urn"):
        print(f"LinkedIn already posted ({prior['post_urn']}), skipping")
        return prior
    if slot == "pm":
        media, body, comment = entry
        kind = "image"
    else:
        kind, media, body, comment = entry
    if dry:
        print(f"{date} {slot}: WOULD post {media} ({kind}) to LinkedIn:\n---\n{body}\n[first comment] {comment}\n---")
        return {"dry": True}
    require_li_env()
    if kind == "document":
        res = li_post_document(body, media, "PALM", comment)
    else:
        res = li_post_image(body, media, comment)
    print(f"LinkedIn OK: {res}")
    return res


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="YYYY-MM-DD (default: today)")
    ap.add_argument("--slot", choices=["am", "pm"], default="am", help="AM = date plan, PM = traffic rotation")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    date = args.date or dt.date.today().isoformat()
    log_key = f"{date}-{args.slot}"
    has_meta = (get_meta_pm(date) if args.slot == "pm" else get_meta_am(date)) is not None
    has_li = (get_linkedin_pm(date) if args.slot == "pm" else get_linkedin_am(date)) is not None
    if not has_meta and not has_li:
        print(f"{log_key}: nothing scheduled. Nothing to do.")
        return 0

    log = load_log()
    prior = log.get(log_key, {}) if not args.dry_run else {}
    if prior:
        print(f"{log_key}: partial or prior entry found, resuming (already posted platforms are skipped).")

    results: dict = {}
    meta_res = run_meta(date, args.slot, args.dry_run, prior.get("meta"))
    if meta_res is not None:
        results["meta"] = meta_res
    li_res = run_linkedin(date, args.slot, args.dry_run, prior.get("linkedin"))
    if li_res is not None:
        results["linkedin"] = li_res

    if not args.dry_run:
        log[log_key] = results
        save_log(log)
        print(f"{log_key}: done, logged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
