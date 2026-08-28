#!/usr/bin/env python3
"""Watch production health, CI, and Railway logs; email Muse on new failures.

Runs from GitHub Actions every 10 minutes on weekdays (see
.github/workflows/production-health-watch.yml). Only alerts during
6:00 AM – 9:00 PM US Eastern, Monday through Friday.

Does NOT auto-fix. Each alert includes a ready-to-paste Cloud Agent prompt.

Usage:
  python scripts/monitoring/watch_production_health.py           # dry run
  python scripts/monitoring/watch_production_health.py --send
  python scripts/monitoring/watch_production_health.py --send --force-hours
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
except ImportError:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = Path(__file__).resolve().parent / ".health_watch_state.json"

API_BASE = os.getenv("PALM_API_BASE", "https://api-production-a0a2.up.railway.app").rstrip("/")
WEB_URL = os.getenv("PALM_WEB_URL", "https://palmcareai.com").rstrip("/")
WEB_RAILWAY_URL = os.getenv(
    "PALM_WEB_RAILWAY_URL", "https://web-production-11611.up.railway.app"
).rstrip("/")
GITHUB_REPO = os.getenv("GITHUB_REPOSITORY", "museibrahim1/homecare-ai-mvp")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RAILWAY_TOKEN = os.getenv("RAILWAY_API_TOKEN") or os.getenv("RAILWAY_TOKEN", "")
RAILWAY_PROJECT_ID = os.getenv("RAILWAY_PROJECT_ID", "")

ALERT_FROM = "PalmCare Monitoring <sales@send.palmtai.com>"
ALERT_TO = [
    e.strip()
    for e in os.getenv(
        "HEALTH_ALERT_TO",
        "museibrahim@palmtai.com",
    ).split(",")
    if e.strip()
]
REPLY_TO = "sales@palmtai.com"
UA = "Mozilla/5.0 PalmHealthWatch/1.0"
ET = ZoneInfo("America/New_York")

LOG_ERROR_PATTERNS = re.compile(
    r"(error|exception|traceback|critical|fatal|failed|panic|"
    r"status[=: ]5\d{2}|internal server error|unhandled)",
    re.IGNORECASE,
)

HEALTH_ENDPOINTS = [
    ("API", f"{API_BASE}/health", {"status": "healthy"}),
    ("API Redis", f"{API_BASE}/health/redis", {"status": "ok"}),
    ("API Celery", f"{API_BASE}/health/celery", {"status": "ok"}),
    ("API S3", f"{API_BASE}/health/s3", {"status": "ok"}),
]

HTTP_CHECKS = [
    ("Website", WEB_URL),
    ("Web (Railway)", WEB_RAILWAY_URL),
]

RAILWAY_GRAPHQL = "https://backboard.railway.com/graphql/v2"
FAILED_DEPLOY_STATUSES = {"FAILED", "CRASHED", "REMOVED", "CANCELLED"}


@dataclass
class Issue:
    kind: str
    title: str
    summary: str
    details: str
    fix_hint: str
    cloud_agent_prompt: str
    fingerprint: str = ""
    meta: dict = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.fingerprint:
            raw = f"{self.kind}|{self.title}|{self.summary}"
            self.fingerprint = hashlib.sha256(raw.encode()).hexdigest()[:16]


def _load_state() -> dict:
    if not STATE_PATH.exists():
        return {"alerted": {}, "last_run": None}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"alerted": {}, "last_run": None}


def _save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def _in_business_hours(now_et: datetime | None = None, force: bool = False) -> bool:
    if force:
        return True
    now_et = now_et or datetime.now(ET)
    if now_et.weekday() >= 5:
        return False
    start = now_et.replace(hour=6, minute=0, second=0, microsecond=0)
    end = now_et.replace(hour=21, minute=0, second=0, microsecond=0)
    return start <= now_et < end


def _http_json(url: str, headers: dict | None = None, timeout: int = 20) -> tuple[int, dict | str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body[:500]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body[:500]
    except Exception as e:
        return 0, str(e)


def _post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 30) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "User-Agent": UA,
            "Content-Type": "application/json",
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _send_email(subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        print("RESEND_API_KEY missing — cannot send alert", file=sys.stderr)
        return False
    try:
        _post_json(
            "https://api.resend.com/emails",
            {
                "from": ALERT_FROM,
                "to": ALERT_TO,
                "reply_to": REPLY_TO,
                "subject": subject,
                "html": html,
            },
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        )
        return True
    except Exception as e:
        print(f"ALERT SEND FAIL: {e}", file=sys.stderr)
        return False


def check_health_endpoints() -> list[Issue]:
    issues: list[Issue] = []
    for name, url, expected in HEALTH_ENDPOINTS:
        code, body = _http_json(url)
        if code == 0:
            issues.append(
                Issue(
                    kind="health",
                    title=f"{name} unreachable",
                    summary=f"Could not reach {url}",
                    details=str(body),
                    fix_hint="Check Railway service status for the API. Confirm DNS and that the container is running.",
                    cloud_agent_prompt=(
                        f"Investigate why {name} is unreachable at {url}. "
                        f"Check Railway deployment logs for the api service and fix the root cause."
                    ),
                    meta={"url": url},
                )
            )
            continue
        if code >= 400:
            issues.append(
                Issue(
                    kind="health",
                    title=f"{name} HTTP {code}",
                    summary=f"{url} returned HTTP {code}",
                    details=str(body)[:1200],
                    fix_hint="The API is up but returning errors. Check recent deploys and Railway logs.",
                    cloud_agent_prompt=(
                        f"Fix {name} returning HTTP {code} at {url}. "
                        f"Response: {str(body)[:400]}"
                    ),
                    meta={"url": url, "status_code": code},
                )
            )
            continue
        if isinstance(body, dict):
            for key, val in expected.items():
                if body.get(key) != val:
                    issues.append(
                        Issue(
                            kind="health",
                            title=f"{name} degraded ({key}={body.get(key)!r})",
                            summary=f"Expected {key}={val!r}, got {body.get(key)!r}",
                            details=json.dumps(body, indent=2),
                            fix_hint=(
                                f"Sub-service {name} is degraded. "
                                "Check Redis, Celery worker, or S3 credentials on Railway."
                            ),
                            cloud_agent_prompt=(
                                f"Fix degraded {name} at {url}. "
                                f"Expected {key}={val!r} but response was {json.dumps(body)}. "
                                "Inspect Railway env vars and worker/redis/storage services."
                            ),
                            meta={"url": url, "body": body},
                        )
                    )
    return issues


def check_http_sites() -> list[Issue]:
    issues: list[Issue] = []
    for name, url in HTTP_CHECKS:
        code, body = _http_json(url)
        if code == 0 or code >= 500:
            issues.append(
                Issue(
                    kind="site",
                    title=f"{name} down or error (HTTP {code or 'timeout'})",
                    summary=f"{url} is not healthy",
                    details=str(body)[:800],
                    fix_hint="Check Vercel/Railway web deploy and recent frontend builds.",
                    cloud_agent_prompt=(
                        f"Fix {name} at {url} — currently HTTP {code or 'unreachable'}. "
                        "Check the latest web deployment and CI frontend-build job."
                    ),
                    meta={"url": url, "status_code": code},
                )
            )
        elif code >= 400:
            issues.append(
                Issue(
                    kind="site",
                    title=f"{name} client error HTTP {code}",
                    summary=f"{url} returned {code}",
                    details=str(body)[:400],
                    fix_hint="May be a routing or auth redirect issue. Verify deployment config.",
                    cloud_agent_prompt=f"Investigate {name} returning HTTP {code} at {url}.",
                    meta={"url": url, "status_code": code},
                )
            )
    return issues


def check_github_ci() -> list[Issue]:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    if not token:
        return []

    issues: list[Issue] = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
    url = (
        f"https://api.github.com/repos/{GITHUB_REPO}/actions/runs"
        f"?branch=main&status=failure&per_page=15"
    )
    code, body = _http_json(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    if code != 200 or not isinstance(body, dict):
        return [
            Issue(
                kind="ci",
                title="Could not read GitHub Actions status",
                summary=f"GitHub API returned HTTP {code}",
                details=str(body)[:600],
                fix_hint="Verify GITHUB_TOKEN permissions in the workflow.",
                cloud_agent_prompt="Fix GitHub Actions token permissions for production health watch.",
            )
        ]

    seen_workflows: set[str] = set()
    for run in body.get("workflow_runs", []):
        created = run.get("created_at", "")
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except ValueError:
            continue
        if created_dt < cutoff:
            continue

        wf_name = run.get("name") or run.get("path") or "unknown"
        if wf_name in seen_workflows:
            continue
        seen_workflows.add(wf_name)

        run_id = run.get("id")
        run_url = run.get("html_url", "")
        conclusion = run.get("conclusion", "failure")
        head_sha = (run.get("head_sha") or "")[:7]

        issues.append(
            Issue(
                kind="ci",
                title=f"CI failed: {wf_name}",
                summary=f"{wf_name} failed on main ({head_sha}) — {conclusion}",
                details=(
                    f"Workflow: {wf_name}\n"
                    f"Run: {run_url}\n"
                    f"Commit: {head_sha}\n"
                    f"Started: {created}\n"
                    f"Event: {run.get('event')}"
                ),
                fix_hint=(
                    "Open the run URL, read the failing job log, and fix the root cause. "
                    "Common failures: pipeline tests, API tests, frontend build, Docker build."
                ),
                cloud_agent_prompt=(
                    f"Fix the failing GitHub Actions workflow '{wf_name}' on main in "
                    f"repo {GITHUB_REPO}. Run URL: {run_url}. "
                    f"Read the failing job logs and apply the smallest safe fix."
                ),
                meta={"run_id": run_id, "run_url": run_url, "workflow": wf_name},
            )
        )
    return issues


def _railway_graphql(query: str, variables: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {RAILWAY_TOKEN}"}
    return _post_json(
        RAILWAY_GRAPHQL,
        {"query": query, "variables": variables or {}},
        headers=headers,
    )


def check_railway() -> list[Issue]:
    if not RAILWAY_TOKEN or not RAILWAY_PROJECT_ID:
        return []

    issues: list[Issue] = []

    deploy_query = """
    query projectServices($projectId: String!) {
      project(id: $projectId) {
        name
        environments {
          edges {
            node {
              id
              name
              serviceInstances {
                edges {
                  node {
                    serviceId
                    serviceName
                    latestDeployment {
                      id
                      status
                      createdAt
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  """
    try:
        data = _railway_graphql(deploy_query, {"projectId": RAILWAY_PROJECT_ID})
    except Exception as e:
        return [
            Issue(
                kind="railway",
                title="Railway API unreachable",
                summary=str(e),
                details="Could not query Railway GraphQL API.",
                fix_hint="Verify RAILWAY_API_TOKEN and RAILWAY_PROJECT_ID GitHub secrets.",
                cloud_agent_prompt="Fix Railway API credentials for production health monitoring.",
            )
        ]

    project = (data.get("data") or {}).get("project")
    if not project:
        errors = data.get("errors")
        return [
            Issue(
                kind="railway",
                title="Railway project query failed",
                summary=str(errors or data)[:400],
                details=json.dumps(data, indent=2)[:1200],
                fix_hint="Confirm RAILWAY_PROJECT_ID matches the production project.",
                cloud_agent_prompt="Fix Railway project ID configuration for health monitoring.",
            )
        ]

    prod_env_id = None
    for env_edge in project.get("environments", {}).get("edges", []):
        env = env_edge.get("node") or {}
        if (env.get("name") or "").lower() in {"production", "prod"}:
            prod_env_id = env.get("id")
        if not prod_env_id:
            prod_env_id = env.get("id")

        for si_edge in env.get("serviceInstances", {}).get("edges", []):
            si = si_edge.get("node") or {}
            dep = si.get("latestDeployment") or {}
            status = (dep.get("status") or "").upper()
            svc = si.get("serviceName") or si.get("serviceId") or "service"
            if status in FAILED_DEPLOY_STATUSES:
                issues.append(
                    Issue(
                        kind="railway",
                        title=f"Railway deploy failed: {svc}",
                        summary=f"{svc} latest deployment status is {status}",
                        details=json.dumps(dep, indent=2),
                        fix_hint="Open Railway dashboard, read deploy/build logs, redeploy after fix.",
                        cloud_agent_prompt=(
                            f"Fix failed Railway deployment for service '{svc}' "
                            f"(status {status}). Read Railway build and runtime logs, "
                            "fix the error, and verify the service starts cleanly."
                        ),
                        meta={"service": svc, "deployment_id": dep.get("id"), "status": status},
                    )
                )

    if prod_env_id:
        log_query = """
        query envLogs($environmentId: String!, $limit: Int) {
          environmentLogs(environmentId: $environmentId, limit: $limit) {
            message
            severity
            timestamp
          }
        }
      """
        try:
            log_data = _railway_graphql(log_query, {"environmentId": prod_env_id, "limit": 80})
            logs = (log_data.get("data") or {}).get("environmentLogs") or []
            seen_msgs: set[str] = set()
            for entry in logs:
                msg = (entry.get("message") or "").strip()
                if not msg or not LOG_ERROR_PATTERNS.search(msg):
                    continue
                short = msg[:200]
                if short in seen_msgs:
                    continue
                seen_msgs.add(short)
                sev = (entry.get("severity") or "error").upper()
                issues.append(
                    Issue(
                        kind="log",
                        title=f"Railway log error ({sev})",
                        summary=short,
                        details=msg[:1500],
                        fix_hint="Trace this error in Railway logs and fix the underlying code or config.",
                        cloud_agent_prompt=(
                            f"Fix this production error seen in Railway logs:\n{msg[:800]}"
                        ),
                        meta={"severity": sev, "timestamp": entry.get("timestamp")},
                    )
                )
        except Exception:
            pass

    return issues


def collect_issues() -> list[Issue]:
    issues: list[Issue] = []
    issues.extend(check_health_endpoints())
    issues.extend(check_http_sites())
    issues.extend(check_github_ci())
    issues.extend(check_railway())
    return issues


def _issue_cleared(issue: Issue, active_fps: set[str]) -> bool:
    return issue["fingerprint"] not in active_fps


def reconcile_state(state: dict, active_issues: list[Issue]) -> tuple[list[Issue], dict]:
    active_fps = {i.fingerprint for i in active_issues}
    alerted: dict = state.get("alerted", {})

    # Drop cleared issues so we re-alert if they come back later.
    cleared = [fp for fp in list(alerted.keys()) if fp not in active_fps]
    for fp in cleared:
        del alerted[fp]

    new_issues: list[Issue] = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for issue in active_issues:
        if issue.fingerprint not in alerted:
            new_issues.append(issue)
            alerted[issue.fingerprint] = {
                "first_seen": now_iso,
                "last_seen": now_iso,
                "title": issue.title,
                "kind": issue.kind,
            }
        else:
            alerted[issue.fingerprint]["last_seen"] = now_iso

    state["alerted"] = alerted
    state["last_run"] = now_iso
    return new_issues, state


def build_alert_html(issues: list[Issue]) -> str:
    blocks = []
    for i, issue in enumerate(issues, 1):
        blocks.append(
            f"""
        <div style="border:1px solid #fecaca;background:#fff1f2;border-radius:12px;padding:16px;margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:12px;color:#b91c1c;text-transform:uppercase;letter-spacing:.04em;">
            {issue.kind}
          </p>
          <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#7f1d1d;">{i}. {issue.title}</p>
          <p style="margin:0 0 8px;color:#334155;"><strong>What broke:</strong> {issue.summary}</p>
          <p style="margin:0 0 8px;color:#334155;"><strong>What to fix:</strong> {issue.fix_hint}</p>
          <pre style="margin:0 0 12px;padding:12px;background:#f8fafc;border-radius:8px;font-size:12px;white-space:pre-wrap;color:#1e293b;">{issue.details[:1800]}</pre>
          <p style="margin:0 0 4px;font-size:13px;color:#0f766e;font-weight:600;">Cloud Agent command (paste this):</p>
          <pre style="margin:0;padding:12px;background:#ecfdf5;border:1px solid #99f6e4;border-radius:8px;font-size:12px;white-space:pre-wrap;color:#134e4a;">{issue.cloud_agent_prompt}</pre>
        </div>"""
        )

    return f"""\
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:640px;margin:0 auto;">
  <div style="background:#0f766e;color:#fff;border-radius:12px 12px 0 0;padding:20px;">
    <p style="margin:0;font-size:20px;font-weight:700;">PalmCare production alert</p>
    <p style="margin:8px 0 0;opacity:.9;">{len(issues)} issue(s) detected. Review below, then send the Cloud Agent prompt to fix.</p>
  </div>
  <div style="padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    {''.join(blocks)}
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">
      Automated watch runs every 10 minutes, Mon–Fri 6 AM–9 PM ET.
      You will not get repeat emails for the same issue until it clears and returns.
    </p>
  </div>
</div>"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Watch production health and alert on failures")
    parser.add_argument("--send", action="store_true", help="Send email alerts via Resend")
    parser.add_argument(
        "--force-hours",
        action="store_true",
        help="Run even outside Mon-Fri 6 AM–9 PM ET (for manual testing)",
    )
    args = parser.parse_args()

    if not _in_business_hours(force=args.force_hours):
        print("Outside monitoring window (Mon–Fri 6 AM–9 PM ET) — skipping")
        return 0

    state = _load_state()
    active = collect_issues()
    new_issues, state = reconcile_state(state, active)

    print(f"Active issues: {len(active)} | New alerts: {len(new_issues)}")
    for issue in active:
        flag = "NEW" if issue in new_issues else "known"
        print(f"  [{flag}] {issue.kind}: {issue.title}")

    if new_issues and args.send:
        subject = f"[PalmCare Alert] {new_issues[0].title}"
        if len(new_issues) > 1:
            subject += f" (+{len(new_issues) - 1} more)"
        ok = _send_email(subject, build_alert_html(new_issues))
        if not ok:
            return 1
        print(f"Sent alert email to {', '.join(ALERT_TO)}")
    elif new_issues:
        print("Dry run — would send alert for new issues above. Pass --send to email.")
    else:
        print("No new issues.")

    _save_state(state)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
