#!/usr/bin/env python3
"""
Agency Email Finder v2 — Google-powered parallel web scraper.

Searches Google for each agency's contact email, visits their websites,
and extracts email addresses. Runs with 25 parallel workers.

Resumes from progress file if interrupted.

Usage:
    python3 -u scripts/find_agency_emails.py
"""

import json
import os
import re
import sys
import time
import random
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import requests
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False

# ── Config ────────────────────────────────────────────────────────────

API_BASE = os.getenv("API_BASE_URL", "https://api-production-a0a2.up.railway.app")
CRON_SECRET = os.getenv("CRON_SECRET", "")
HEADERS_API = {"X-Internal-Key": CRON_SECRET, "Content-Type": "application/json"}

MAX_WORKERS = 25
SAVE_EVERY = 100
PUSH_EVERY = 500
TIMEOUT = 12

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CMS_FILE = os.path.join(DATA_DIR, "cms_agencies_full.json")
RESULTS_FILE = os.path.join(DATA_DIR, "found_emails.json")
PROGRESS_FILE = os.path.join(DATA_DIR, "email_search_progress.json")

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

JUNK_DOMAINS = {
    "example.com", "test.com", "email.com", "domain.com", "placeholder.local",
    "sentry.io", "wixpress.com", "googleapis.com", "googlemail.com",
    "w3.org", "schema.org", "gravatar.com", "wordpress.org", "wordpress.com",
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
    "jquery.com", "cloudflare.com", "google.com", "gstatic.com",
    "bootstrapcdn.com", "fontawesome.com", "apache.org", "github.com",
    "youtube.com", "yelp.com", "bbb.org", "healthgrades.com",
    "medicare.gov", "cms.gov", "your-email.com", "youremail.com",
    "noreply.com", "mailchimp.com", "constantcontact.com", "hubspot.com",
    "squarespace.com", "wix.com", "godaddy.com", "weebly.com",
}

GOV_KEYWORDS = ["government", "county", "federal", "veterans"]

# ── Helpers ───────────────────────────────────────────────────────────

def rand_ua():
    return random.choice(USER_AGENTS)


def is_valid_email(email):
    email = email.lower().strip()
    if len(email) < 6 or len(email) > 80:
        return False
    parts = email.split("@")
    if len(parts) != 2:
        return False
    local, domain = parts
    if domain in JUNK_DOMAINS or any(domain.endswith("." + j) for j in JUNK_DOMAINS):
        return False
    if any(email.endswith(ext) for ext in [".png", ".jpg", ".gif", ".svg", ".css", ".js", ".webp"]):
        return False
    if any(x in email for x in ["noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster"]):
        return False
    if "test@" in email or "example" in domain or "sentry" in domain:
        return False
    return True


def extract_emails(text):
    if not text:
        return set()
    return {e.lower().strip() for e in EMAIL_RE.findall(text) if is_valid_email(e)}


def rank_email(email):
    """Lower = better priority."""
    e = email.lower()
    if e.startswith("info@"): return 0
    if e.startswith("contact@"): return 1
    if e.startswith("office@"): return 2
    if e.startswith("admin@"): return 3
    if e.startswith("referral"): return 4
    if e.startswith("intake"): return 5
    if e.startswith("help@"): return 6
    if e.startswith("support@"): return 7
    if e.startswith("hello@"): return 8
    return 10


def fetch(url, timeout=TIMEOUT):
    """GET a URL, return (html, final_url) or (None, None)."""
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": rand_ua()},
                            allow_redirects=True, verify=False)
        if resp.status_code == 200 and len(resp.text) > 200:
            return resp.text, str(resp.url)
    except Exception:
        pass
    return None, None


# ── Search engines ────────────────────────────────────────────────────

def google_search(query):
    """Search Google and return results page HTML."""
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.google.com/search?q={encoded}&num=10"
    html, _ = fetch(url)
    return html


def bing_search(query):
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.bing.com/search?q={encoded}&count=10"
    html, _ = fetch(url)
    return html


def duckduckgo_search(query):
    encoded = urllib.parse.quote_plus(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded}"
    html, _ = fetch(url)
    return html


def extract_result_urls(html):
    """Pull real website URLs out of search results HTML."""
    if not html:
        return []
    urls = set()
    skip = {"google.com", "bing.com", "microsoft.com", "duckduckgo.com",
            "facebook.com", "twitter.com", "linkedin.com", "youtube.com",
            "yelp.com", "bbb.org", "wikipedia.org", "instagram.com",
            "indeed.com", "glassdoor.com", "ziprecruiter.com",
            "yellowpages.com", "manta.com", "mapquest.com",
            "apple.com", "apps.apple.com"}

    # Parse href links
    href_re = re.compile(r'href="(https?://[^"]+)"')
    for u in href_re.findall(html):
        domain = urllib.parse.urlparse(u).netloc.lower().replace("www.", "")
        if not any(s in domain for s in skip):
            urls.add(u)

    # Google wraps links in /url?q= redirects
    goog_re = re.compile(r'/url\?q=(https?://[^&]+)')
    for u in goog_re.findall(html):
        decoded = urllib.parse.unquote(u)
        domain = urllib.parse.urlparse(decoded).netloc.lower().replace("www.", "")
        if not any(s in domain for s in skip):
            urls.add(decoded)

    return list(urls)[:8]


# ── Per-agency search logic ──────────────────────────────────────────

def find_email(agency):
    """Search for an agency's contact email. Returns (ccn, email) or (ccn, None)."""
    ccn = agency.get("ccn", "")
    name = agency.get("provider_name", "").strip()
    city = agency.get("city", "").strip()
    state = agency.get("state", "").strip()
    if not name:
        return ccn, None

    all_emails = set()

    # Build queries
    q1 = f'"{name}" {city} {state} email contact'
    q2 = f'{name} {state} home health agency contact email'

    # === Strategy 1: Google search (best results) ===
    for query in [q1, q2]:
        html = google_search(query)
        if html:
            emails = extract_emails(html)
            all_emails.update(emails)
            if all_emails:
                break

            # Visit top result websites
            urls = extract_result_urls(html)
            for url in urls[:3]:
                page, final = fetch(url, timeout=8)
                if page:
                    all_emails.update(extract_emails(page))
                    if all_emails:
                        break
                    # Try /contact page on the same site
                    if final:
                        base = re.sub(r'(https?://[^/]+).*', r'\1', final)
                        for path in ["/contact", "/contact-us", "/about-us", "/about"]:
                            cp, _ = fetch(base + path, timeout=6)
                            if cp:
                                all_emails.update(extract_emails(cp))
                            if all_emails:
                                break
                if all_emails:
                    break
        if all_emails:
            break

        time.sleep(random.uniform(0.3, 0.8))

    # === Strategy 2: Bing as fallback ===
    if not all_emails:
        html = bing_search(q1)
        if html:
            all_emails.update(extract_emails(html))
            if not all_emails:
                urls = extract_result_urls(html)
                for url in urls[:2]:
                    page, final = fetch(url, timeout=8)
                    if page:
                        all_emails.update(extract_emails(page))
                    if all_emails:
                        break

    # === Strategy 3: DuckDuckGo as last resort ===
    if not all_emails:
        html = duckduckgo_search(q2)
        if html:
            all_emails.update(extract_emails(html))

    # === Strategy 4: Domain guessing from name ===
    if not all_emails:
        cleaned = re.sub(r'\b(llc|inc|corp|ltd|co|home health|homehealth|home care|homecare|of|the|and|&|services?)\b',
                         '', name.lower(), flags=re.IGNORECASE)
        slug = re.sub(r'[^a-z0-9]', '', cleaned).strip()
        if slug and len(slug) >= 4:
            for domain_guess in [f"{slug}.com", f"{slug}homehealth.com", f"{slug}hh.com", f"{slug}homecare.com"]:
                for prefix in ["https://www.", "https://"]:
                    page, _ = fetch(f"{prefix}{domain_guess}", timeout=5)
                    if page and len(page) > 1000:
                        all_emails.update(extract_emails(page))
                    if all_emails:
                        break
                if all_emails:
                    break

    if all_emails:
        best = sorted(all_emails, key=rank_email)[0]
        return ccn, best

    return ccn, None


# ── CRM push ─────────────────────────────────────────────────────────

def push_to_crm(found):
    if not CRON_SECRET or not found:
        return 0
    items = [{"ccn": ccn, "contact_email": email} for ccn, email in found.items()]
    updated = 0
    for i in range(0, len(items), 200):
        batch = items[i:i+200]
        try:
            req = urllib.request.Request(
                f"{API_BASE}/platform/sales/leads/internal/batch-enrich",
                data=json.dumps(batch).encode(),
                headers=HEADERS_API,
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                r = json.loads(resp.read())
                updated += r.get("updated", 0)
        except Exception as e:
            print(f"  [PUSH ERROR] {e}")
    return updated


# ── Main ──────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("PALMCARE AI — Agency Email Finder v2 (Google-powered)")
    print("=" * 70)

    if HAS_BS4:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    if not os.path.exists(CMS_FILE):
        print(f"[FATAL] {CMS_FILE} not found. Run enrich_agencies.py first.")
        sys.exit(1)

    agencies = json.load(open(CMS_FILE))
    private = [a for a in agencies
               if not any(kw in (a.get("ownership_type", "") or "").lower() for kw in GOV_KEYWORDS)]
    print(f"Total private agencies: {len(private)}")

    # Resume
    searched = set()
    found = {}
    if os.path.exists(PROGRESS_FILE):
        try:
            p = json.load(open(PROGRESS_FILE))
            searched = set(p.get("searched", []))
            found = p.get("found", {})
            print(f"Resuming: {len(searched)} searched, {len(found)} emails found previously")
        except Exception:
            pass

    todo = [a for a in private if a.get("ccn") and a["ccn"] not in searched]
    print(f"Remaining to search: {len(todo)}")
    print(f"Workers: {MAX_WORKERS}")
    print()

    if not todo:
        print("All done! Pushing final emails...")
        if found:
            n = push_to_crm(found)
            print(f"CRM updated: {n} leads enriched")
        return

    t0 = time.time()
    done = 0
    new_found = 0

    def save():
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PROGRESS_FILE, "w") as f:
            json.dump({"searched": list(searched), "found": found}, f)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futs = {pool.submit(find_email, a): a for a in todo}
        for fut in as_completed(futs):
            ag = futs[fut]
            ccn = ag.get("ccn", "")
            searched.add(ccn)
            done += 1
            try:
                _, email = fut.result()
                if email:
                    found[ccn] = email
                    new_found += 1
            except Exception:
                pass

            if done % 50 == 0:
                elapsed = time.time() - t0
                rate = done / max(elapsed, 1)
                eta = (len(todo) - done) / max(rate, 0.01) / 60
                pct = (len(searched)) / len(private) * 100
                print(f"  [{len(searched)}/{len(private)}] ({pct:.1f}%) "
                      f"Emails: {len(found)} (+{new_found} new) | "
                      f"{rate:.1f}/s | ETA: {eta:.0f}min")

            if done % SAVE_EVERY == 0:
                save()

            if new_found > 0 and new_found % PUSH_EVERY == 0:
                print(f"\n  >> Pushing {len(found)} emails to CRM...")
                n = push_to_crm(found)
                print(f"  >> Updated {n} leads\n")

    save()

    # Final push
    if found:
        print(f"\nFinal push: {len(found)} emails to CRM...")
        n = push_to_crm(found)
        print(f"Updated {n} leads")

    # Save clean results
    ccn_map = {a["ccn"]: a for a in private if a.get("ccn")}
    results = []
    for ccn, email in found.items():
        ag = ccn_map.get(ccn, {})
        results.append({
            "ccn": ccn,
            "provider_name": ag.get("provider_name", ""),
            "state": ag.get("state", ""),
            "city": ag.get("city", ""),
            "phone": ag.get("phone", ""),
            "email": email,
        })
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print("COMPLETE")
    print("=" * 70)
    print(f"Searched:    {len(searched)}")
    print(f"Emails:      {len(found)}")
    print(f"Hit rate:    {len(found)/max(len(searched),1)*100:.1f}%")
    print(f"Time:        {elapsed/60:.1f} min")


if __name__ == "__main__":
    main()
