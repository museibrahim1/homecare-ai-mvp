#!/usr/bin/env python3
"""
PalmCare daily analytics puller.

Pulls what we can from Cloudflare, Meta (FB/IG/Threads), App Store Connect,
and optionally PostHog / Google (when credentials are present). Writes a JSON
snapshot under marketing/analytics/daily/YYYY-MM-DD.json for the morning review.

Usage:
  python3.11 scripts/analytics/daily_report.py
  python3.11 scripts/analytics/daily_report.py --days 7

Env (loaded from repo .env without shell-sourcing):
  CF_API_TOKEN, CF_ZONE_PALMCAREAI
  META_PAGE_ID, META_PAGE_ACCESS_TOKEN, META_IG_BUSINESS_ID
  META_THREADS_USER_ID, META_THREADS_USER_TOKEN
  ASC_* (via scripts/asc/asc_api.py)
  POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID (optional; default project 507047)
  GOOGLE_SERVICE_ACCOUNT_JSON or GSC_REFRESH_TOKEN + GOOGLE_CLIENT_* (optional)
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "marketing" / "analytics" / "daily"
ASC_DIR = ROOT / "scripts" / "asc"
ASC_REPORT_REQUEST_ID = "2400a8e7-f7c3-43af-a44f-4d0d00629172"
POSTHOG_HOST = "https://us.posthog.com"
DEFAULT_POSTHOG_PROJECT = "507047"

# ASC report IDs we care about for daily review (from ONGOING request).
ASC_FOCUS_REPORTS = {
    "App Downloads Standard": "r3-2400a8e7-f7c3-43af-a44f-4d0d00629172",
    "App Sessions Standard": "r8-2400a8e7-f7c3-43af-a44f-4d0d00629172",
    "App Store Discovery and Engagement Standard": "r14-2400a8e7-f7c3-43af-a44f-4d0d00629172",
    "App Store Installation and Deletion Standard": "r6-2400a8e7-f7c3-43af-a44f-4d0d00629172",
    "App Crashes": "r2-2400a8e7-f7c3-43af-a44f-4d0d00629172",
}


def load_env(path: Path = ROOT / ".env") -> dict[str, str]:
    vals: dict[str, str] = {}
    if not path.exists():
        return vals
    for line in path.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def http_json(url: str, headers: dict | None = None, method: str = "GET", body: dict | None = None, timeout: int = 45):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return {"ok": True, "data": json.loads(raw) if raw else {}}
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}: {e.read().decode()[:500]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def section(name: str, status: str, payload: dict, note: str | None = None) -> dict:
    out = {"source": name, "status": status, **payload}
    if note:
        out["note"] = note
    return out


# --- Cloudflare -----------------------------------------------------------------


def pull_cloudflare(env: dict, days: int) -> dict:
    token = env.get("CF_API_TOKEN")
    zone = env.get("CF_ZONE_PALMCAREAI")
    if not token or not zone:
        return section("cloudflare", "missing_credentials", {}, "Set CF_API_TOKEN and CF_ZONE_PALMCAREAI")

    end = date.today()
    start = end - timedelta(days=days)
    query = """
    {
      viewer {
        zones(filter: {zoneTag: "%s"}) {
          httpRequests1dGroups(
            orderBy: [date_ASC]
            limit: 40
            filter: {date_geq: "%s", date_lt: "%s"}
          ) {
            dimensions { date }
            sum { requests cachedRequests threats pageViews bytes }
            uniq { uniques }
          }
        }
      }
    }
    """ % (zone, start.isoformat(), end.isoformat())

    res = http_json(
        "https://api.cloudflare.com/client/v4/graphql",
        headers={"Authorization": f"Bearer {token}"},
        method="POST",
        body={"query": query},
    )
    if not res["ok"]:
        return section("cloudflare", "error", {"error": res["error"]})
    data = res["data"]
    if data.get("errors"):
        msg = data["errors"][0].get("message", "unknown")
        hint = None
        if "analytics.read" in msg:
            hint = "Add Zone Analytics Read to CF_API_TOKEN in Cloudflare dashboard"
        return section("cloudflare", "permission_denied", {"error": msg}, hint)

    groups = (
        data.get("data", {})
        .get("viewer", {})
        .get("zones", [{}])[0]
        .get("httpRequests1dGroups", [])
    )
    totals = {
        "requests": 0,
        "pageViews": 0,
        "uniques": 0,
        "threats": 0,
        "cachedRequests": 0,
    }
    series = []
    for g in groups:
        s = g.get("sum", {})
        u = g.get("uniq", {})
        row = {
            "date": g.get("dimensions", {}).get("date"),
            "requests": s.get("requests", 0),
            "pageViews": s.get("pageViews", 0),
            "uniques": u.get("uniques", 0),
            "threats": s.get("threats", 0),
            "cachedRequests": s.get("cachedRequests", 0),
        }
        series.append(row)
        for k in totals:
            totals[k] += row.get(k, 0) or 0

    return section("cloudflare", "ok", {"days": days, "totals": totals, "series": series})


# --- Meta / Threads -------------------------------------------------------------


def pull_meta(env: dict, days: int) -> dict:
    page_id = env.get("META_PAGE_ID") or env.get("FACEBOOK_PAGE_ID")
    token = env.get("META_PAGE_ACCESS_TOKEN") or env.get("FACEBOOK_PAGE_TOKEN")
    ig_id = env.get("META_IG_BUSINESS_ID")
    if not page_id or not token:
        return section("meta", "missing_credentials", {})

    out: dict = {"facebook": {}, "instagram": {}, "threads": {}}

    page = http_json(
        f"https://graph.facebook.com/v21.0/{page_id}"
        f"?fields=name,fan_count,followers_count,link&access_token={urllib.parse.quote(token)}"
    )
    out["facebook"]["profile"] = page.get("data") if page["ok"] else {"error": page.get("error")}

    # Insights often need pages_read_engagement; record status clearly.
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    until = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    insights = http_json(
        f"https://graph.facebook.com/v21.0/{page_id}/insights"
        f"?metric=page_views_total,page_post_engagements"
        f"&period=day&since={since}&until={until}&access_token={urllib.parse.quote(token)}"
    )
    if insights["ok"] and "error" not in insights.get("data", {}):
        out["facebook"]["insights"] = insights["data"]
        out["facebook"]["insights_status"] = "ok"
    else:
        err = insights.get("error") or json.dumps(insights.get("data", {}))[:300]
        out["facebook"]["insights_status"] = "permission_or_metric_issue"
        out["facebook"]["insights_error"] = err

    if ig_id:
        ig = http_json(
            f"https://graph.facebook.com/v21.0/{ig_id}"
            f"?fields=username,followers_count,media_count&access_token={urllib.parse.quote(token)}"
        )
        out["instagram"]["profile"] = ig.get("data") if ig["ok"] else {"error": ig.get("error")}

    # Threads
    tid = env.get("META_THREADS_USER_ID")
    ttok = env.get("META_THREADS_USER_TOKEN")
    if tid and ttok:
        views = http_json(
            f"https://graph.threads.net/v1.0/{tid}/threads_insights"
            f"?metric=views&period=day&access_token={urllib.parse.quote(ttok)}"
        )
        likes = http_json(
            f"https://graph.threads.net/v1.0/{tid}/threads_insights"
            f"?metric=likes,replies,reposts,quotes,followers_count&period=day"
            f"&access_token={urllib.parse.quote(ttok)}"
        )
        recent = http_json(
            f"https://graph.threads.net/v1.0/{tid}/threads"
            f"?fields=id,text,timestamp,permalink&limit=5"
            f"&access_token={urllib.parse.quote(ttok)}"
        )
        out["threads"] = {
            "views": views.get("data") if views["ok"] else {"error": views.get("error")},
            "engagement": likes.get("data") if likes["ok"] else {"error": likes.get("error")},
            "recent": recent.get("data") if recent["ok"] else {"error": recent.get("error")},
            "status": "ok" if views["ok"] else "error",
        }
    else:
        out["threads"] = {"status": "missing_credentials"}

    status = "ok"
    if out["facebook"].get("insights_status") != "ok":
        status = "partial"
    return section(
        "meta",
        status,
        out,
        "FB/IG insights need pages_read_engagement + instagram_manage_insights. Threads works today.",
    )


# --- App Store Connect ----------------------------------------------------------


def pull_asc() -> dict:
    if str(ASC_DIR) not in sys.path:
        sys.path.insert(0, str(ASC_DIR))
    try:
        from asc_api import req  # type: ignore
    except Exception as e:
        return section("app_store_connect", "error", {"error": f"import asc_api failed: {e}"})

    focus = []
    for name, rid in ASC_FOCUS_REPORTS.items():
        try:
            inst = req("GET", f"/v1/analyticsReports/{rid}/instances?limit=5")
            instances = [
                {
                    "id": i["id"],
                    "processingDate": i.get("attributes", {}).get("processingDate"),
                    "granularity": i.get("attributes", {}).get("granularity"),
                }
                for i in inst.get("data", [])
            ]
            focus.append({"name": name, "reportId": rid, "instances": instances})
        except Exception as e:
            focus.append({"name": name, "reportId": rid, "error": str(e)[:300]})

    ready = sum(1 for f in focus if f.get("instances"))
    status = "ok" if ready else "waiting_for_first_dump"
    note = None
    if not ready:
        note = (
            f"ONGOING request {ASC_REPORT_REQUEST_ID} is live but instances are empty. "
            "Apple usually fills the first dump within 1–2 days."
        )
    return section(
        "app_store_connect",
        status,
        {"reportRequestId": ASC_REPORT_REQUEST_ID, "focusReports": focus, "instancesReady": ready},
        note,
    )


# --- PostHog (optional personal API key) ----------------------------------------


def pull_posthog(env: dict, days: int) -> dict:
    key = env.get("POSTHOG_PERSONAL_API_KEY")
    project = env.get("POSTHOG_PROJECT_ID", DEFAULT_POSTHOG_PROJECT)
    if not key:
        return section(
            "posthog",
            "missing_credentials",
            {},
            "Add POSTHOG_PERSONAL_API_KEY (Project → Settings → Personal API keys, scope web_analytics:read). "
            "Until then, daily review pulls PostHog via Cursor MCP.",
        )

    headers = {"Authorization": f"Bearer {key}"}
    digest = http_json(
        f"{POSTHOG_HOST}/api/projects/{project}/web_analytics/weekly_digest/?days={days}&compare=true",
        headers=headers,
    )
    if not digest["ok"]:
        return section("posthog", "error", {"error": digest["error"]})
    return section("posthog", "ok", {"days": days, "digest": digest["data"]})


# --- Google Search Console / GA4 (optional) -------------------------------------


def pull_google(env: dict, days: int) -> dict:
    sa = env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    refresh = env.get("GSC_REFRESH_TOKEN") or env.get("GOOGLE_REFRESH_TOKEN")
    if not sa and not refresh:
        return section(
            "google",
            "missing_credentials",
            {},
            "Need a service account JSON path (GOOGLE_SERVICE_ACCOUNT_JSON) with GSC + GA4 access, "
            "or OAuth refresh token (GSC_REFRESH_TOKEN) plus GOOGLE_CLIENT_ID/SECRET. "
            "Site property: sc-domain:palmcareai.com (or URL-prefix).",
        )
    # Credential path exists but full client not wired yet in this first ship.
    return section(
        "google",
        "not_implemented",
        {"hasServiceAccount": bool(sa), "hasRefreshToken": bool(refresh), "days": days},
        "Credentials detected; wire google-api-python-client next. Manual GSC/GA4 still required until then.",
    )


# --- Main -----------------------------------------------------------------------



def strip_secrets(obj):
    """Remove tokens from Meta Graph paging URLs before writing snapshots to git."""
    secret_keys = {"access_token", "token", "api_key", "apikey", "client_secret", "refresh_token"}

    def scrub_url(s: str) -> str:
        if "access_token=" not in s and "token=" not in s.lower():
            return s
        try:
            parts = urllib.parse.urlsplit(s)
            if not parts.query:
                return s
            kept = [
                (k, v)
                for k, v in urllib.parse.parse_qsl(parts.query, keep_blank_values=True)
                if k.lower() not in secret_keys
            ]
            return urllib.parse.urlunsplit(
                (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(kept), parts.fragment)
            )
        except Exception:
            return "[redacted_url]"

    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in ("previous", "next") and isinstance(v, str) and (
                "access_token=" in v or "graph.facebook.com" in v or "graph.threads.net" in v
            ):
                out[k] = "[redacted_paging_url]"
            else:
                out[k] = strip_secrets(v)
        return out
    if isinstance(obj, list):
        return [strip_secrets(v) for v in obj]
    if isinstance(obj, str):
        return scrub_url(obj)
    return obj


def build_report(days: int) -> dict:
    env = load_env()
    generated = datetime.now(timezone.utc).isoformat()
    sources = [
        pull_posthog(env, days),
        pull_cloudflare(env, days),
        pull_meta(env, days),
        pull_asc(),
        pull_google(env, days),
    ]
    summary = {
        "ok": [s["source"] for s in sources if s["status"] == "ok"],
        "partial": [s["source"] for s in sources if s["status"] == "partial"],
        "blocked": [
            s["source"]
            for s in sources
            if s["status"] in ("missing_credentials", "permission_denied", "error", "not_implemented", "waiting_for_first_dump")
        ],
    }
    return {
        "generatedAt": generated,
        "reportDate": date.today().isoformat(),
        "lookbackDays": days,
        "summary": summary,
        "sources": {s["source"]: s for s in sources},
        "reviewPrompt": (
            "Open the daily canvas, compare channel mix vs prior day, check organic search "
            "landing pages, GSC query gaps (manual until Google API is wired), and pick one SEO action."
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PalmCare daily analytics pull")
    parser.add_argument("--days", type=int, default=7, help="Lookback window (default 7)")
    parser.add_argument("--stdout", action="store_true", help="Print JSON to stdout")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report = strip_secrets(build_report(args.days))
    payload = json.dumps(report, indent=2) + "\n"
    out_path = OUT_DIR / f"{report['reportDate']}.json"
    out_path.write_text(payload)
    latest = OUT_DIR / "latest.json"
    latest.write_text(payload)

    print(f"Wrote {out_path}")
    print("OK:", ", ".join(report["summary"]["ok"]) or "(none)")
    print("Partial:", ", ".join(report["summary"]["partial"]) or "(none)")
    print("Blocked:", ", ".join(report["summary"]["blocked"]) or "(none)")
    if args.stdout:
        print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
