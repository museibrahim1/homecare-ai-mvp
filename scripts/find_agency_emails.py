#!/usr/bin/env python3
"""
Agency Email Finder v4 — Fast Google-powered scraper.

Uses Startpage (Google proxy), Bing, and DuckDuckGo with connection pooling,
load distribution, and minimal HTTP calls per agency.

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
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

JUNK_DOMAINS = frozenset({
    "example.com", "test.com", "email.com", "domain.com", "sentry.io",
    "wixpress.com", "googleapis.com", "googlemail.com", "w3.org",
    "schema.org", "gravatar.com", "wordpress.org", "wordpress.com",
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
    "jquery.com", "cloudflare.com", "google.com", "gstatic.com",
    "bootstrapcdn.com", "fontawesome.com", "apache.org", "github.com",
    "youtube.com", "yelp.com", "bbb.org", "healthgrades.com",
    "medicare.gov", "cms.gov", "your-email.com", "youremail.com",
    "mailchimp.com", "constantcontact.com", "hubspot.com",
    "squarespace.com", "wix.com", "godaddy.com", "weebly.com",
    "sentry-next.wixpress.com", "placeholder.local", "noreply.com",
})

SKIP_HOSTS = frozenset({
    "google.com", "bing.com", "microsoft.com", "duckduckgo.com",
    "startpage.com", "facebook.com", "twitter.com", "linkedin.com",
    "youtube.com", "yelp.com", "bbb.org", "wikipedia.org",
    "instagram.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
    "yellowpages.com", "manta.com", "mapquest.com", "apple.com",
    "pinterest.com", "tiktok.com", "reddit.com", "amazon.com",
    "medicare.gov", "cms.gov", "caring.com", "agingcare.com",
})

GOV_KW = ["government", "county", "federal", "veterans"]
CONTACT_PATHS = ["/contact", "/contact-us", "/about-us", "/about"]

# Thread-local sessions for connection reuse
_local = threading.local()

def get_session():
    if not hasattr(_local, "session"):
        s = requests.Session()
        adapter = HTTPAdapter(
            pool_connections=10, pool_maxsize=10,
            max_retries=Retry(total=1, backoff_factor=0.2))
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        s.verify = False
        _local.session = s
    _local.session.headers["User-Agent"] = random.choice(UAS)
    return _local.session


# ── Helpers ───────────────────────────────────────────────────────────

def is_valid(email):
    email = email.lower().strip()
    if len(email) < 6 or len(email) > 80 or "@" not in email:
        return False
    domain = email.rsplit("@", 1)[1]
    if domain in JUNK_DOMAINS:
        return False
    if any(email.endswith(ext) for ext in (".png", ".jpg", ".gif", ".svg", ".css", ".js")):
        return False
    if any(x in email for x in ("noreply", "no-reply", "donotreply", "mailer-daemon",
                                 "postmaster", "unsubscribe", "bounce", "automated")):
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


def url_domain(url):
    return urllib.parse.urlparse(url).netloc.lower().replace("www.", "")


def filter_urls(urls):
    seen = set()
    out = []
    for u in urls:
        d = url_domain(u)
        if d in seen or any(s in d for s in SKIP_HOSTS):
            continue
        seen.add(d)
        out.append(u)
    return out[:4]


def extract_links(html):
    if not html:
        return []
    urls = []
    for u in re.findall(r'href="(https?://[^"]+)"', html):
        urls.append(u)
    for u in re.findall(r'/url\?q=(https?://[^&"]+)', html):
        urls.append(urllib.parse.unquote(u))
    return filter_urls(urls)


# ── Search engines ────────────────────────────────────────────────────

_engine_counter = 0
_counter_lock = threading.Lock()

def next_engine():
    """Round-robin across engines to distribute load."""
    global _engine_counter
    with _counter_lock:
        _engine_counter += 1
        return _engine_counter % 3  # 0=startpage, 1=bing, 2=ddg


def search_startpage(q):
    try:
        r = get_session().post("https://www.startpage.com/sp/search",
                               data={"query": q, "cat": "web"}, timeout=TIMEOUT)
        return r.text if r.status_code == 200 else None
    except Exception:
        return None


def search_bing(q):
    html, _ = fetch(f"https://www.bing.com/search?q={urllib.parse.quote_plus(q)}&count=10")
    return html


def search_ddg(q):
    html, _ = fetch(f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(q)}")
    return html


ENGINES = [search_startpage, search_bing, search_ddg]
ENGINE_NAMES = ["startpage", "bing", "ddg"]


# ── Per-agency search ─────────────────────────────────────────────────

def find_email(agency):
    ccn = agency.get("ccn", "")
    name = agency.get("provider_name", "").strip()
    city = agency.get("city", "").strip()
    state = agency.get("state", "").strip()
    if not name:
        return ccn, None

    q = f'"{name}" {city} {state} email contact'

    # Pick primary engine via round-robin to spread load
    primary = next_engine()
    order = [primary, (primary + 1) % 3, (primary + 2) % 3]

    for eng_idx in order:
        html = ENGINES[eng_idx](q)
        if not html:
            continue

        # Quick check: emails right in search results
        emails = extract_emails(html)
        if emails:
            return ccn, sorted(emails, key=rank)[0]

        # Visit top result websites
        urls = extract_links(html)
        for url in urls[:2]:
            page, final = fetch(url, timeout=7)
            if not page:
                continue
            emails = extract_emails(page)
            if emails:
                return ccn, sorted(emails, key=rank)[0]

            # Try /contact page
            if final:
                base = re.match(r'(https?://[^/]+)', final)
                if base:
                    for p in CONTACT_PATHS[:2]:
                        cp, _ = fetch(base.group(1) + p, timeout=5)
                        if cp:
                            emails = extract_emails(cp)
                            if emails:
                                return ccn, sorted(emails, key=rank)[0]

        time.sleep(random.uniform(0.1, 0.3))

    # Last resort: domain guessing
    cleaned = re.sub(
        r'\b(llc|inc|corp|ltd|co|home health|homehealth|home care|homecare|'
        r'of|the|and|&|services?|agency|group|care|health)\b',
        '', name.lower(), flags=re.IGNORECASE)
    slug = re.sub(r'[^a-z0-9]', '', cleaned).strip()
    if slug and len(slug) >= 3:
        for tpl in [f"https://www.{slug}.com", f"https://{slug}.com",
                    f"https://www.{slug}homehealth.com", f"https://www.{slug}homecare.com"]:
            page, final = fetch(tpl, timeout=5)
            if page and len(page) > 1000:
                emails = extract_emails(page)
                if emails:
                    return ccn, sorted(emails, key=rank)[0]
                if final:
                    base = re.match(r'(https?://[^/]+)', final)
                    if base:
                        cp, _ = fetch(base.group(1) + "/contact", timeout=5)
                        if cp:
                            emails = extract_emails(cp)
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
    print("PALMCARE AI — Agency Email Finder v4 (fast)")
    print("  Engines: Startpage/Bing/DDG round-robin + website crawl")
    print("  Workers: 25, connection pooling, minimal HTTP calls")
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
