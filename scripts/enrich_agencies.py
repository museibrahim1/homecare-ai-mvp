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


def format_phone(raw):
    # type: (str) -> Optional[str]
    """Format a raw phone string like '9073314075' into '(907) 331-4075'."""
    if not raw or raw == "-":
        return None
    cleaned = raw.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "").replace(".", "")
    if len(cleaned) == 11 and cleaned.startswith("1"):
        cleaned = cleaned[1:]
    if len(cleaned) == 10 and cleaned.isdigit():
        return f"({cleaned[:3]}) {cleaned[3:6]}-{cleaned[6:]}"
    return raw.strip() if raw.strip() else None


def derive_email_from_website(website):
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

def pull_cms_data():
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

def enrich_existing_leads(cms_agencies):
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


# ── Phase 3: Import new agencies via batch-add ───────────────────────

def import_new_agencies(cms_agencies):
    """Add agencies not yet in CRM via the batch-add endpoint."""
    print("\n" + "=" * 60)
    print("PHASE 3: Adding new agencies to CRM (phone-only, no email)...")
    print("=" * 60)

    if not CRON_SECRET:
        print("[ERROR] CRON_SECRET not set.")
        return {"error": "no_secret"}

    # Filter out government agencies
    gov_keywords = ["government", "state", "county", "federal", "veterans"]
    filtered = []
    gov_skipped = 0
    for ag in cms_agencies:
        ownership = (ag.get("ownership_type") or "").lower()
        if any(kw in ownership for kw in gov_keywords):
            gov_skipped += 1
            continue
        filtered.append(ag)

    print(f"  Total CMS agencies: {len(cms_agencies)}")
    print(f"  Government excluded: {gov_skipped}")
    print(f"  Private agencies to process: {len(filtered)}")

    batch_size = 200
    total_added = 0
    total_skipped = 0

    for i in range(0, len(filtered), batch_size):
        batch = filtered[i:i + batch_size]
        items = []
        for ag in batch:
            items.append({
                "provider_name": ag["provider_name"],
                "state": ag["state"],
                "city": ag.get("city"),
                "address": ag.get("address"),
                "zip_code": ag.get("zip_code"),
                "phone": ag.get("phone"),
                "ccn": ag.get("ccn"),
                "ownership_type": ag.get("ownership_type"),
            })

        payload = json.dumps(items).encode()
        try:
            req = urllib.request.Request(
                f"{API_BASE}/platform/sales/leads/internal/batch-add",
                data=payload,
                headers=HEADERS,
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                total_added += result.get("added", 0)
                total_skipped += result.get("skipped_duplicates", 0)
        except urllib.error.HTTPError as e:
            body = e.read().decode() if hasattr(e, 'read') else str(e)
            print(f"  [ERROR] Batch {i//batch_size + 1}: HTTP {e.code} — {body[:200]}")
        except Exception as e:
            print(f"  [ERROR] Batch {i//batch_size + 1}: {e}")

        if (i // batch_size + 1) % 10 == 0:
            pct = min(100, int((i + len(batch)) / len(filtered) * 100))
            print(f"  Progress: {i + len(batch)}/{len(filtered)} ({pct}%), {total_added} new, {total_skipped} existing")
        time.sleep(0.05)

    print(f"\nImport results: {total_added} new agencies added, {total_skipped} already existed")
    return {"added": total_added, "skipped_duplicates": total_skipped}


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

    # Phase 3: Import new agencies not yet in CRM
    import_result = import_new_agencies(cms_agencies)

    # Summary
    phones_from_cms = sum(1 for a in cms_agencies if a.get("phone"))
    print("\n" + "=" * 60)
    print("ENRICHMENT COMPLETE — SUMMARY")
    print("=" * 60)
    print(f"CMS agencies fetched:     {len(cms_agencies)}")
    print(f"  with phone numbers:     {phones_from_cms}")
    print(f"Existing leads updated:   {enrich_result.get('updated', 0)}")
    print(f"Already complete:         {enrich_result.get('skipped', 0)}")
    print(f"New agencies added:       {import_result.get('added', 0)}")
    print(f"Skipped (duplicates):     {import_result.get('skipped_duplicates', 0)}")

    # Save CMS data for reference
    output_path = os.path.join(os.path.dirname(__file__), "data", "cms_agencies_full.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(cms_agencies, f, indent=2)
    print(f"\nCMS data saved to: {output_path}")
    print(f"Total records: {len(cms_agencies)}")


if __name__ == "__main__":
    main()
