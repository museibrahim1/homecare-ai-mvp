#!/usr/bin/env python3
"""Deploy the Railway web service from the latest GitHub commit on main.

Uses RAILWAY_API_TOKEN + RAILWAY_PROJECT_ID (same secrets as health-watch).
Triggers serviceInstanceDeploy with latestCommit=true so Railway builds the
HEAD of the connected branch instead of restarting the previous image.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

RAILWAY_GRAPHQL = "https://backboard.railway.com/graphql/v2"
TOKEN = os.getenv("RAILWAY_API_TOKEN") or os.getenv("RAILWAY_TOKEN", "")
PROJECT_ID = os.getenv("RAILWAY_PROJECT_ID", "")
COMMIT_SHA = os.getenv("DEPLOY_COMMIT_SHA", "").strip() or None
SERVICE_NAME_HINTS = ("web", "frontend", "next", "palmcare-web", "apps-web")


def gql(query: str, variables: dict | None = None) -> dict:
    req = urllib.request.Request(
        RAILWAY_GRAPHQL,
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"Railway HTTP {e.code}: {body[:800]}") from e
    if payload.get("errors"):
        raise SystemExit(f"Railway GraphQL errors: {json.dumps(payload['errors'], indent=2)[:1200]}")
    return payload.get("data") or {}


def main() -> int:
    if not TOKEN or not PROJECT_ID:
        print("Missing RAILWAY_API_TOKEN or RAILWAY_PROJECT_ID", file=sys.stderr)
        return 1

    data = gql(
        """
        query($projectId: String!) {
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
                        latestDeployment { id status createdAt meta { commitHash } }
                      }
                    }
                  }
                }
              }
            }
            services {
              edges { node { id name } }
            }
          }
        }
        """,
        {"projectId": PROJECT_ID},
    )
    project = data.get("project")
    if not project:
        print(f"No project for id={PROJECT_ID}", file=sys.stderr)
        return 1

    print(f"Project: {project.get('name')}")

    services = {
        (edge.get("node") or {}).get("id"): (edge.get("node") or {}).get("name")
        for edge in (project.get("services") or {}).get("edges") or []
    }
    for sid, name in services.items():
        print(f"  service: {name} ({sid})")

    env_id = None
    env_name = None
    web_service_id = None
    web_service_name = None
    latest = None

    for env_edge in (project.get("environments") or {}).get("edges") or []:
        env = env_edge.get("node") or {}
        name = (env.get("name") or "").lower()
        if name in {"production", "prod"} or env_id is None:
            env_id = env.get("id")
            env_name = env.get("name")
            for si_edge in (env.get("serviceInstances") or {}).get("edges") or []:
                si = si_edge.get("node") or {}
                svc_name = (si.get("serviceName") or services.get(si.get("serviceId")) or "").lower()
                if any(h in svc_name for h in SERVICE_NAME_HINTS):
                    web_service_id = si.get("serviceId")
                    web_service_name = si.get("serviceName") or services.get(web_service_id) or svc_name
                    latest = si.get("latestDeployment")

    if not env_id or not web_service_id:
        print("Could not resolve production environment + web service", file=sys.stderr)
        return 1

    print(f"Environment: {env_name} ({env_id})")
    print(f"Web service: {web_service_name} ({web_service_id})")
    if latest:
        meta = latest.get("meta") or {}
        print(
            f"Current deploy: status={latest.get('status')} "
            f"created={latest.get('createdAt')} commit={meta.get('commitHash')}"
        )

    print(
        f"Requesting deploy of "
        f"{'commit ' + COMMIT_SHA if COMMIT_SHA else 'latest connected-branch commit'}"
    )

    # Prefer explicit commit when provided; otherwise latestCommit on the connected branch.
    attempts = []
    if COMMIT_SHA:
        attempts.append(
            (
                "serviceInstanceDeploy+commitSha",
                """
                mutation($serviceId: String!, $environmentId: String!, $commitSha: String!) {
                  serviceInstanceDeploy(
                    serviceId: $serviceId
                    environmentId: $environmentId
                    commitSha: $commitSha
                    latestCommit: true
                  )
                }
                """,
                {
                    "serviceId": web_service_id,
                    "environmentId": env_id,
                    "commitSha": COMMIT_SHA,
                },
                "serviceInstanceDeploy",
            )
        )
        attempts.append(
            (
                "serviceInstanceDeployV2+commitSha",
                """
                mutation($serviceId: String!, $environmentId: String!, $commitSha: String!) {
                  serviceInstanceDeployV2(
                    serviceId: $serviceId
                    environmentId: $environmentId
                    commitSha: $commitSha
                  )
                }
                """,
                {
                    "serviceId": web_service_id,
                    "environmentId": env_id,
                    "commitSha": COMMIT_SHA,
                },
                "serviceInstanceDeployV2",
            )
        )
    attempts.append(
        (
            "serviceInstanceDeploy+latestCommit",
            """
            mutation($serviceId: String!, $environmentId: String!) {
              serviceInstanceDeploy(
                serviceId: $serviceId
                environmentId: $environmentId
                latestCommit: true
              )
            }
            """,
            {"serviceId": web_service_id, "environmentId": env_id},
            "serviceInstanceDeploy",
        )
    )

    last_err: Exception | None = None
    for label, query, variables, result_key in attempts:
        try:
            print(f"Trying {label}…")
            result = gql(query, variables)
            deploy_id = result.get(result_key)
            print(f"Triggered deploy via {label}: {deploy_id}")
            return 0
        except SystemExit as e:
            last_err = e
            print(f"{label} failed: {e}")
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"{label} failed: {e}")

    print(f"All deploy attempts failed. Last error: {last_err}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
