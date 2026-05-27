#!/usr/bin/env python3
"""
Check and fix Resend domain verification status.
Lists domains, shows required DNS records, and attempts to verify.
"""

import os
import sys
import json
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

import requests

API_KEY = os.getenv("RESEND_API_KEY")
if not API_KEY:
    print("ERROR: RESEND_API_KEY not found")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}
BASE = "https://api.resend.com"


def list_domains():
    resp = requests.get(f"{BASE}/domains", headers=HEADERS)
    print(f"\n=== Domains (HTTP {resp.status_code}) ===")
    if resp.status_code == 200:
        data = resp.json()
        domains = data.get("data", data) if isinstance(data, dict) else data
        if not domains:
            print("  No domains found.")
            return []
        for d in domains:
            print(f"  ID: {d.get('id')}")
            print(f"  Name: {d.get('name')}")
            print(f"  Status: {d.get('status')}")
            print(f"  Region: {d.get('region')}")
            print(f"  Created: {d.get('created_at')}")
            records = d.get("records", [])
            if records:
                print(f"  DNS Records ({len(records)}):")
                for r in records:
                    print(f"    Type: {r.get('record')} | Name: {r.get('name')} | Value: {r.get('value')} | Status: {r.get('status')}")
            print()
        return domains
    else:
        print(f"  Error: {resp.text}")
        return []


def get_domain(domain_id):
    resp = requests.get(f"{BASE}/domains/{domain_id}", headers=HEADERS)
    print(f"\n=== Domain Detail (HTTP {resp.status_code}) ===")
    if resp.status_code == 200:
        d = resp.json()
        print(json.dumps(d, indent=2))
        return d
    else:
        print(f"  Error: {resp.text}")
        return None


def add_domain(name):
    resp = requests.post(f"{BASE}/domains", headers=HEADERS, json={"name": name})
    print(f"\n=== Add Domain '{name}' (HTTP {resp.status_code}) ===")
    if resp.status_code in (200, 201):
        d = resp.json()
        print(json.dumps(d, indent=2))
        return d
    else:
        print(f"  Error: {resp.text}")
        return None


def verify_domain(domain_id):
    resp = requests.post(f"{BASE}/domains/{domain_id}/verify", headers=HEADERS)
    print(f"\n=== Verify Domain (HTTP {resp.status_code}) ===")
    if resp.status_code == 200:
        print("  Verification triggered!")
        d = resp.json()
        print(json.dumps(d, indent=2))
        return d
    else:
        print(f"  Error: {resp.text}")
        return None


def list_api_keys():
    resp = requests.get(f"{BASE}/api-keys", headers=HEADERS)
    print(f"\n=== API Keys (HTTP {resp.status_code}) ===")
    if resp.status_code == 200:
        data = resp.json()
        keys = data.get("data", data) if isinstance(data, dict) else data
        for k in keys:
            print(f"  ID: {k.get('id')} | Name: {k.get('name')} | Created: {k.get('created_at')}")
    else:
        print(f"  Error: {resp.text}")


def main():
    print("=" * 60)
    print("Resend Domain Verification Check")
    print("=" * 60)

    domains = list_domains()

    if not domains:
        print("\nNo domains configured. Adding palmtai.com...")
        result = add_domain("palmtai.com")
        if result:
            domains = [result]

    for d in domains:
        domain_id = d.get("id")
        status = d.get("status", "")
        if domain_id and status != "verified":
            print(f"\nDomain '{d.get('name')}' is {status}. Getting DNS records...")
            detail = get_domain(domain_id)
            if detail:
                records = detail.get("records", [])
                if records:
                    print("\n" + "=" * 60)
                    print("DNS RECORDS TO ADD:")
                    print("=" * 60)
                    for r in records:
                        print(f"\n  Type:   {r.get('record', r.get('type', 'TXT'))}")
                        print(f"  Name:   {r.get('name')}")
                        print(f"  Value:  {r.get('value')}")
                        print(f"  TTL:    {r.get('ttl', 'Auto')}")
                        print(f"  Status: {r.get('status')}")

            print(f"\nAttempting verification for domain {domain_id}...")
            verify_domain(domain_id)
        elif status == "verified":
            print(f"\nDomain '{d.get('name')}' is already verified!")

    list_api_keys()


if __name__ == "__main__":
    main()
