#!/usr/bin/env python3
"""
Agency Email Finder v5 — Brave Search + website crawl.

Uses Brave Search (works reliably, returns real Google-quality results)
with deep website crawling and strict email validation.

Usage:
    python3 -u scripts/find_agency_emails.py
"""

import json
import os
import re
import sys
import time
import random
import threading
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Config ────────────────────────────────────────────────────────────

API_BASE = os.getenv("API_BASE_URL", "https://api-production-a0a2.up.railway.app")
CRON_SECRET = os.getenv("CRON_SECRET", "")
HEADERS_API = {"X-Internal-Key": CRON_SECRET, "Content-Type": "application/json"}

MAX_WORKERS = 25
SAVE_EVERY = 200
PUSH_EVERY = 1000
TIMEOUT = 8

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CMS_FILE = os.path.join(DATA_DIR, "cms_agencies_full.json")
RESULTS_FILE = os.path.join(DATA_DIR, "found_emails.json")
PROGRESS_FILE = os.path.join(DATA_DIR, "email_search_progress.json")

UAS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

JUNK_DOMAINS = frozenset({
    # Search engine / tech artifacts
    "startmail.com", "startpage.com", "mastodon.social", "brave.com",
    "sentry.io", "wixpress.com", "sentry-next.wixpress.com",
    "googleapis.com", "googlemail.com", "gstatic.com", "google.com",
    "cloudflare.com", "jquery.com", "bootstrapcdn.com", "fontawesome.com",
    "apache.org", "github.com", "wordpress.org", "wordpress.com",
    "w3.org", "schema.org", "gravatar.com",
    # Social / general
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
    "youtube.com", "pinterest.com", "tiktok.com", "reddit.com",
    # Directories / aggregators
    "yelp.com", "bbb.org", "healthgrades.com", "caring.com", "agingcare.com",
    "seniorcarefinder.com", "providerwire.com", "helpforcare.com",
    "yellowpages.com", "manta.com", "indeed.com", "glassdoor.com",
    "ziprecruiter.com",
    # Placeholder / junk
    "example.com", "test.com", "email.com", "domain.com", "placeholder.local",
    "your-email.com", "youremail.com", "noreply.com", "mailchimp.com",
    "constantcontact.com", "hubspot.com", "squarespace.com", "wix.com",
    "godaddy.com", "weebly.com", "domainmarket.com", "mysite.com",
    "doe.com", "atom.com", "brandforce.com", "telepathy.com",
    "community.com", "valley.com", "evergreen.com", "micahrich.com",
    "ndiscovered.com", "newyorker.com", "latofonts.com",
    # Government
    "medicare.gov", "cms.gov", "hcai.ca.gov", "calrecycle.ca.gov",
})

SKIP_HOSTS = frozenset({
    "google.com", "bing.com", "microsoft.com", "duckduckgo.com",
    "startpage.com", "brave.com", "facebook.com", "twitter.com",
    "linkedin.com", "youtube.com", "yelp.com", "bbb.org",
    "wikipedia.org", "instagram.com", "indeed.com", "glassdoor.com",
    "ziprecruiter.com", "yellowpages.com", "manta.com", "mapquest.com",
    "apple.com", "pinterest.com", "tiktok.com", "reddit.com",
    "amazon.com", "medicare.gov", "cms.gov", "caring.com",
    "agingcare.com", "healthgrades.com", "seniorcarefinder.com",
})

GOV_KW = ["government", "county", "federal", "veterans"]
CONTACT_PATHS = ["/contact", "/contact-us", "/contactus", "/about-us",
                 "/about", "/contact.html", "/about.html"]

# ── Thread-local sessions ─────────────────────────────────────────────

_local = threading.local()

def get_session():
    if not hasattr(_local, "session"):
        s = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=10, pool_maxsize=10,
            max_retries=Retry(total=1, backoff_factor=0.3))
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        s.verify = False
        _local.session = s
    _local.session.headers["User-Agent"] = random.choice(UAS)
    return _local.session


# ── Helpers ───────────────────────────────────────────────────────────

def is_valid(email):
    email = email.lower().strip()
    if len(email) < 6 or len(email) > 70 or "@" not in email:
        return False
    local, domain = email.rsplit("@", 1)
    if domain in JUNK_DOMAINS:
        return False
    # Reject .gov emails (not the agency's own email)
    if domain.endswith(".gov"):
        return False
    # Reject broken TLDs / file extensions caught by regex
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    if not tld or len(tld) > 6 or not tld.isalpha():
        return False
    bad_tlds = {"png", "jpg", "gif", "svg", "css", "js", "webp", "ico", "pdf", "doc"}
    if tld in bad_tlds:
        return False
    # Reject system/marketing emails
    bad_prefixes = ("noreply", "no-reply", "donotreply", "mailer-daemon",
                    "postmaster", "unsubscribe", "bounce", "automated",
                    "test@", "webmaster", "root@", "abuse@")
    if any(email.startswith(p) for p in bad_prefixes):
        return False
    # Reject placeholder patterns
    if "sample" in email or "placeholder" in email or "example" in domain:
        return False
    # Must have at least one dot in domain
    if "." not in domain:
        return False
    return True


def extract_emails(text):
    if not text:
        return set()
    return {e.lower().strip() for e in EMAIL_RE.findall(text) if is_valid(e)}


def rank(e):
    e = e.lower()
    for i, prefix in enumerate(["info@", "contact@", "office@", "admin@",
                                 "referral", "intake", "hr@", "help@",
                                 "support@", "hello@"]):
        if e.startswith(prefix):
            return i
    return 15


def fetch(url, timeout=TIMEOUT):
    try:
        r = get_session().get(url, timeout=timeout, allow_redirects=True)
        if r.status_code == 200 and len(r.text) > 300:
            return r.text, str(r.url)
    except Exception:
        pass
    return None, None


def get_base(url):
    m = re.match(r'(https?://[^/]+)', url)
    return m.group(1) if m else None


def filter_urls(urls):
    seen = set()
    out = []
    for u in urls:
        d = urllib.parse.urlparse(u).netloc.lower().replace("www.", "")
        if d in seen or any(s in d for s in SKIP_HOSTS):
            continue
        seen.add(d)
        out.append(u)
    return out[:5]


def extract_links(html):
    """Extract real website URLs from search results HTML."""
    if not html:
        return []
    urls = []
    for u in re.findall(r'href="(https?://[^"]+)"', html):
        urls.append(u)
    return filter_urls(urls)


# ── Search engine ─────────────────────────────────────────────────────

def search_brave(q):
    """Brave Search returns real results as HTML."""
    try:
        r = get_session().get(
            f"https://search.brave.com/search?q={urllib.parse.quote_plus(q)}",
            timeout=TIMEOUT)
        return r.text if r.status_code == 200 else None
    except Exception:
        return None


def search_bing(q):
    html, _ = fetch(f"https://www.bing.com/search?q={urllib.parse.quote_plus(q)}&count=10")
    return html


def search_ddg(q):
    html, _ = fetch(f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(q)}")
    return html


# ── Website crawl ─────────────────────────────────────────────────────

def crawl_site(url):
    """Visit homepage and contact/about pages, extract emails."""
    emails = set()
    html, final = fetch(url, timeout=7)
    if not html:
        return emails

    emails.update(extract_emails(html))
    if emails:
        return emails

    base = get_base(final or url)
    if not base:
        return emails

    for path in CONTACT_PATHS:
        cp, _ = fetch(base + path, timeout=5)
        if cp:
            emails.update(extract_emails(cp))
        if emails:
            break

    return emails


# ── Per-agency search ─────────────────────────────────────────────────

def find_email(agency):
    ccn = agency.get("ccn", "")
    name = agency.get("provider_name", "").strip()
    city = agency.get("city", "").strip()
    state = agency.get("state", "").strip()
    if not name:
        return ccn, None

    q1 = f'{name} {city} {state} home health email contact'
    q2 = f'"{name}" {state} email'

    # === Brave Search (primary) ===
    for q in [q1, q2]:
        html = search_brave(q)
        if html:
            urls = extract_links(html)
            for url in urls[:3]:
                emails = crawl_site(url)
                if emails:
                    return ccn, sorted(emails, key=rank)[0]
        time.sleep(random.uniform(0.2, 0.5))

    # === Bing (fallback) ===
    html = search_bing(q1)
    if html:
        urls = extract_links(html)
        for url in urls[:2]:
            emails = crawl_site(url)
            if emails:
                return ccn, sorted(emails, key=rank)[0]

    # === DuckDuckGo (last resort) ===
    html = search_ddg(q1)
    if html:
        urls = extract_links(html)
        for url in urls[:2]:
            emails = crawl_site(url)
            if emails:
                return ccn, sorted(emails, key=rank)[0]

    # === Domain guessing ===
    cleaned = re.sub(
        r'\b(llc|inc|corp|ltd|co|home health|homehealth|home care|homecare|'
        r'of|the|and|&|services?|agency|group|care|health)\b',
        '', name.lower(), flags=re.IGNORECASE)
    slug = re.sub(r'[^a-z0-9]', '', cleaned).strip()
    if slug and len(slug) >= 3:
        for tpl in [f"https://www.{slug}.com", f"https://{slug}.com",
                    f"https://www.{slug}homehealth.com",
                    f"https://www.{slug}homecare.com",
                    f"https://www.{slug}hh.com",
                    f"https://www.{slug}health.com"]:
            emails = crawl_site(tpl)
            if emails:
                return ccn, sorted(emails, key=rank)[0]

    return ccn, None


# ── CRM push ─────────────────────────────────────────────────────────

def push_to_crm(found):
    if not CRON_SECRET or not found:
        return 0
    items = [{"ccn": c, "contact_email": e} for c, e in found.items()]
    updated = 0
    for i in range(0, len(items), 200):
        batch = items[i:i+200]
        try:
            req = urllib.request.Request(
                f"{API_BASE}/platform/sales/leads/internal/batch-enrich",
                data=json.dumps(batch).encode(), headers=HEADERS_API)
            with urllib.request.urlopen(req, timeout=120) as resp:
                r = json.loads(resp.read())
                updated += r.get("updated", 0)
        except Exception as e:
            print(f"  [PUSH ERR] {e}")
    return updated


# ── Main ──────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("PALMCARE AI — Agency Email Finder v5")
    print("  Engine: Brave Search → Bing → DDG → domain guess")
    print("  Validation: strict (no search page emails, no .gov, no placeholders)")
    print("=" * 70)

    if not os.path.exists(CMS_FILE):
        print(f"[FATAL] {CMS_FILE} not found"); sys.exit(1)

    agencies = json.load(open(CMS_FILE))
    private = [a for a in agencies
               if not any(kw in (a.get("ownership_type", "") or "").lower() for kw in GOV_KW)]
    print(f"Private agencies: {len(private)}")

    searched = set()
    found = {}
    if os.path.exists(PROGRESS_FILE):
        try:
            p = json.load(open(PROGRESS_FILE))
            searched = set(p.get("searched", []))
            found = p.get("found", {})
            print(f"Resuming: {len(searched)} searched, {len(found)} emails")
        except Exception:
            pass

    todo = [a for a in private if a.get("ccn") and a["ccn"] not in searched]
    print(f"Remaining: {len(todo)}")
    print()

    if not todo:
        print("All done!")
        if found:
            n = push_to_crm(found)
            print(f"CRM updated: {n}")
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
            ccn = futs[fut].get("ccn", "")
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
                hit = new_found / max(done, 1) * 100
                print(f"  [{len(searched)}/{len(private)}] "
                      f"Emails: {len(found)} (+{new_found} new, {hit:.0f}%) | "
                      f"{rate:.1f}/s | ETA: {eta:.0f}min")
                sys.stdout.flush()

            if done % SAVE_EVERY == 0:
                save()

            if new_found > 0 and new_found % PUSH_EVERY == 0:
                print(f"\n  >> Pushing {len(found)} emails to CRM...")
                n = push_to_crm(found)
                print(f"  >> Updated {n} leads\n")

    save()

    if found:
        print(f"\nFinal push: {len(found)} emails...")
        n = push_to_crm(found)
        print(f"Updated {n} leads")

    ccn_map = {a["ccn"]: a for a in private if a.get("ccn")}
    results = []
    for ccn, email in found.items():
        ag = ccn_map.get(ccn, {})
        results.append({
            "ccn": ccn, "provider_name": ag.get("provider_name", ""),
            "state": ag.get("state", ""), "city": ag.get("city", ""),
            "phone": ag.get("phone", ""), "email": email,
        })
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)

    elapsed = time.time() - t0
    print("\n" + "=" * 70)
    print("COMPLETE")
    print("=" * 70)
    print(f"Searched:   {len(searched)}")
    print(f"Emails:     {len(found)} ({new_found} new)")
    print(f"Hit rate:   {new_found/max(done,1)*100:.1f}%")
    print(f"Time:       {elapsed/60:.1f} min")


if __name__ == "__main__":
    main()
