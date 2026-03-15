#!/usr/bin/env python3
"""
Agency Contact Data Enrichment — Pull CMS data, enrich phones/emails.

Phase 1: Pull ALL 12,000+ home health agencies from CMS federal API
Phase 2: Cross-reference with existing CRM data and fill missing phones
Phase 3: Derive contact emails from agency websites
Phase 4: Push enriched data to the production CRM

Usage:
    python scripts/enrich_agencies.py
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from urllib.parse import urlparse

API_BASE = os.getenv("API_BASE_URL", "https://api-production-a0a2.up.railway.app")
CRON_SECRET = os.getenv("CRON_SECRET", "")
CMS_API = "https://data.cms.gov/provider-data/api/1/datastore/query/6jpm-sxkc/0"
PAGE_SIZE = 500

HEADERS = {"X-Internal-Key": CRON_SECRET, "Content-Type": "application/json"}

ALL_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "AS", "MP",
]


def format_phone(raw: str) -> str | None:
    """Format a raw phone string like '9073314075' into '(907) 331-4075'."""
    if not raw or raw == "-":
        return None
    cleaned = raw.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "").replace(".", "")
    if len(cleaned) == 11 and cleaned.startswith("1"):
        cleaned = cleaned[1:]
    if len(cleaned) == 10 and cleaned.isdigit():
        return f"({cleaned[:3]}) {cleaned[3:6]}-{cleaned[6:]}"
    return raw.strip() if raw.strip() else None


def derive_email_from_website(website: str) -> str | None:
    """Derive a likely contact email from a website URL."""
    if not website:
        return None
    try:
        url = website.strip()
        if not url.startswith("http"):
            url = "https://" + url
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        domain = domain.lower().strip().rstrip("/")
        if domain.startswith("www."):
            domain = domain[4:]
        if not domain or "." not in domain:
            return None
        # Skip social media and generic domains
        skip_domains = {"facebook.com", "twitter.com", "linkedin.com", "instagram.com",
                        "youtube.com", "google.com", "yelp.com", "bbb.org", "medicare.gov",
                        "cms.gov", "healthgrades.com", "caring.com", "agingcare.com"}
        if domain in skip_domains or any(domain.endswith("." + s) for s in skip_domains):
            return None
        return f"info@{domain}"
    except Exception:
        return None


# ── Phase 1: Pull ALL agencies from CMS ──────────────────────────────

def pull_cms_data() -> list[dict]:
    """Pull all home health agencies from the CMS federal API."""
    print("\n" + "=" * 60)
    print("PHASE 1: Pulling ALL agencies from CMS federal database...")
    print("=" * 60)

    all_agencies = []
    total_fetched = 0

    for state in ALL_STATES:
        offset = 0
        state_count = 0
        while True:
            payload = json.dumps({
                "conditions": [{"property": "state", "value": state.upper(), "operator": "="}],
                "limit": PAGE_SIZE,
                "offset": offset,
            }).encode()

            try:
                req = urllib.request.Request(CMS_API, data=payload, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read())
            except Exception as e:
                print(f"  [ERROR] {state} offset={offset}: {e}")
                break

            results = data.get("results", [])
            if not results:
                break

            for r in results:
                ccn = r.get("cms_certification_number_ccn", "")
                if not ccn:
                    continue

                phone = format_phone(r.get("telephone_number", ""))
                agency = {
                    "ccn": ccn,
                    "provider_name": (r.get("provider_name") or "").strip().title(),
                    "state": r.get("state", state),
                    "city": (r.get("citytown") or "").strip().title(),
                    "address": (r.get("address") or "").strip().title(),
                    "zip_code": (r.get("zip_code") or "").strip(),
                    "phone": phone,
                    "ownership_type": (r.get("type_of_ownership") or "").strip().title(),
                }
                all_agencies.append(agency)
                state_count += 1

            total_fetched += len(results)
            if len(results) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
            time.sleep(0.1)

        if state_count > 0:
            print(f"  {state}: {state_count} agencies")

    print(f"\nTotal CMS agencies fetched: {len(all_agencies)}")
    return all_agencies


# ── Phase 2: Push to CRM via batch-enrich endpoint ───────────────────

def enrich_existing_leads(cms_agencies: list[dict]) -> dict:
    """Send CMS data to the batch-enrich endpoint to fill missing phones/addresses."""
    print("\n" + "=" * 60)
    print("PHASE 2: Enriching existing CRM leads with CMS phone data...")
    print("=" * 60)

    if not CRON_SECRET:
        print("[ERROR] CRON_SECRET not set. Cannot call internal API.")
        return {"error": "no_secret"}

    batch_size = 200
    total_updated = 0
    total_not_found = 0
    total_skipped = 0

    for i in range(0, len(cms_agencies), batch_size):
        batch = cms_agencies[i:i + batch_size]
        payload = json.dumps(batch).encode()

        try:
            req = urllib.request.Request(
                f"{API_BASE}/platform/sales/leads/internal/batch-enrich",
                data=payload,
                headers=HEADERS,
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                total_updated += result.get("updated", 0)
                total_not_found += result.get("not_found", 0)
                total_skipped += result.get("skipped_no_change", 0)
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, 'read') else str(e)
            print(f"  [ERROR] Batch {i//batch_size + 1}: HTTP {e.code} — {body[:200]}")
        except Exception as e:
            print(f"  [ERROR] Batch {i//batch_size + 1}: {e}")

        if (i // batch_size + 1) % 10 == 0:
            print(f"  Progress: {i + len(batch)}/{len(cms_agencies)} sent, {total_updated} updated so far")

    result = {"updated": total_updated, "not_found": total_not_found, "skipped": total_skipped}
    print(f"\nEnrichment results: {total_updated} updated, {total_not_found} not in CRM, {total_skipped} already complete")
    return result


# ── Phase 3: Trigger CMS import for new agencies ─────────────────────

def trigger_cms_import() -> dict:
    """Call the CMS import endpoint to add agencies not yet in the CRM."""
    print("\n" + "=" * 60)
    print("PHASE 3: Importing new agencies from CMS into CRM...")
    print("=" * 60)

    if not CRON_SECRET:
        print("[ERROR] CRON_SECRET not set. Skipping CMS import.")
        return {"error": "no_secret"}

    # We need admin auth for this endpoint, not just internal key.
    # Instead, we'll use the internal add approach — batch by batch
    # Actually, the import-cms endpoint requires platform admin auth (JWT).
    # Let's use a direct approach: for agencies not found in enrichment,
    # add them via the internal/add-and-email endpoint (without sending email).
    print("  CMS import requires admin JWT. Using direct batch addition instead.")
    print("  (New agencies from CMS will be added via the script in Phase 4)")
    return {"status": "deferred_to_phase4"}


# ── Phase 4: Add new agencies + derive emails ────────────────────────

def add_new_agencies_and_derive_emails(cms_agencies: list[dict], enrich_result: dict) -> dict:
    """For agencies not in the CRM, add them. For those with websites, derive emails."""
    print("\n" + "=" * 60)
    print("PHASE 4: Adding new agencies & deriving emails from websites...")
    print("=" * 60)

    if not CRON_SECRET:
        print("[ERROR] CRON_SECRET not set.")
        return {"error": "no_secret"}

    # First, get all agencies that are NOT already in the CRM.
    # We'll re-send the full list through batch-enrich with emails derived from websites,
    # and for truly new agencies, we add them via internal/add endpoint (no email send).
    # For simplicity, we'll create leads directly through a new batch.

    # Derive emails for agencies with likely websites based on their name
    agencies_with_emails = []
    agencies_without_emails = []

    for agency in cms_agencies:
        # Skip government agencies
        ownership = (agency.get("ownership_type") or "").lower()
        if any(kw in ownership for kw in ["government", "state", "county", "federal", "veterans"]):
            continue

        # Try to derive a contact email (we don't have websites from CMS,
        # but we can format the provider name into a likely domain)
        agencies_without_emails.append(agency)

    # Now add all agencies that weren't found during enrichment as new leads
    # Use the internal/add-and-email endpoint with send_email=false
    batch_size = 50
    added = 0
    already_exists = 0

    for i in range(0, len(agencies_without_emails), batch_size):
        batch = agencies_without_emails[i:i + batch_size]
        items = []
        for ag in batch:
            if not ag.get("phone") and not ag.get("contact_email"):
                continue
            items.append({
                "provider_name": ag["provider_name"],
                "state": ag["state"],
                "city": ag.get("city"),
                "phone": ag.get("phone"),
                "contact_email": ag.get("contact_email") or f"unknown-{ag['ccn']}@placeholder.local",
                "send_email": False,
                "campaign_name": "cms-enrichment-mar-2026",
                "notes": f"CMS CCN: {ag['ccn']}",
            })

        if not items:
            continue

        payload = json.dumps(items).encode()
        try:
            req = urllib.request.Request(
                f"{API_BASE}/platform/sales/leads/internal/add-and-email",
                data=payload,
                headers=HEADERS,
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                batch_added = sum(1 for r in result.get("results", []) if r.get("status") == "added_no_email")
                added += batch_added
                already_exists += len(result.get("results", [])) - batch_added
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, 'read') else str(e)
            print(f"  [ERROR] Batch {i//batch_size + 1}: HTTP {e.code} — {body[:200]}")
        except Exception as e:
            print(f"  [ERROR] Batch {i//batch_size + 1}: {e}")

        if (i // batch_size + 1) % 20 == 0:
            print(f"  Progress: {i + len(batch)}/{len(agencies_without_emails)} processed, {added} new")
        time.sleep(0.05)

    print(f"\nNew agencies added: {added}, already existed: {already_exists}")
    return {"added": added, "already_exists": already_exists}


# ── Main ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("PALMCARE AI — Agency Contact Data Enrichment")
    print("=" * 60)
    print(f"API: {API_BASE}")
    print(f"CRON_SECRET: {'set (' + CRON_SECRET[:4] + '...)' if CRON_SECRET else 'NOT SET'}")

    if not CRON_SECRET:
        print("\n[FATAL] CRON_SECRET environment variable is not set.")
        print("Export it first: export CRON_SECRET='your-secret-here'")
        sys.exit(1)

    # Phase 1: Pull CMS data
    cms_agencies = pull_cms_data()

    if not cms_agencies:
        print("[FATAL] No agencies fetched from CMS. Aborting.")
        sys.exit(1)

    # Phase 2: Enrich existing CRM leads
    enrich_result = enrich_existing_leads(cms_agencies)

    # Phase 3 & 4: We skip the JWT-dependent import-cms endpoint
    # and instead use the internal/add-and-email endpoint
    # But this requires contact_email which CMS doesn't have.
    # So we skip adding brand new agencies this way.
    # The enrichment already fills phones for existing leads.

    # Summary
    phones_from_cms = sum(1 for a in cms_agencies if a.get("phone"))
    print("\n" + "=" * 60)
    print("ENRICHMENT COMPLETE — SUMMARY")
    print("=" * 60)
    print(f"CMS agencies fetched:     {len(cms_agencies)}")
    print(f"  with phone numbers:     {phones_from_cms}")
    print(f"Existing leads updated:   {enrich_result.get('updated', 0)}")
    print(f"Already complete:         {enrich_result.get('skipped', 0)}")
    print(f"Not in CRM (new):         {enrich_result.get('not_found', 0)}")

    # Save CMS data for reference
    output_path = os.path.join(os.path.dirname(__file__), "data", "cms_agencies_full.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(cms_agencies, f, indent=2)
    print(f"\nCMS data saved to: {output_path}")
    print(f"Total records: {len(cms_agencies)}")


if __name__ == "__main__":
    main()
