#!/usr/bin/env python3
"""Midwest + Washington outreach wave.

Purge unsubscribed CRM rows, import researched NE/IA/WA agencies,
send up to 100 tracked emails, and start sequencing.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import psycopg2
import resend
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

resend.api_key = (os.getenv("RESEND_API_KEY") or "").strip()
assert resend.api_key, "RESEND_API_KEY missing"

FROM_SALES = os.getenv("EMAIL_FROM_SALES", "Muse Ibrahim <sales@palmcareai.com>")
REPLY_TO = "museibrahim@palmtai.com"
SITE = "https://palmcareai.com"
API = (os.getenv("PUBLIC_API_URL") or "https://api-production-a0a2.up.railway.app").rstrip("/")
APP_URL = f"{SITE}/app?utm_source=email&utm_medium=email&utm_campaign=midwest_wa_wave&utm_content=app"
DEMO_URL = f"{SITE}/demo?utm_source=email&utm_medium=email&utm_campaign=midwest_wa_wave&utm_content=demo"
DAILY_CAP = 100
CAMPAIGN = "midwest-wa-demo-2026-08-25"
LOG_PATH = Path(__file__).resolve().parent / ".midwest_wa_wave_sends.json"

JUNK_DOMAINS = {
    "contoh.com",
    "freedommortgage.com",
    "bristolnews.com",
    "unicomsi.com",
    "stagheaddesigns.com",
    "example.com",
    "test.com",
    "sentry.io",
    "godaddy.com",
    "email.com",
    "domain.com",
    "brannans.com",
    "livingroomideas.com",
    "yourheights.com",
}
JUNK_LOCAL = {
    "noreply",
    "no-reply",
    "donotreply",
    "mailer-daemon",
    "postmaster",
    "filler",
    "placeholder",
    "email",
    "user",
    "test",
    "domains",
    "media",
    "mediarelations",
    "publicrelations",
    "communications",
    "compliance",
    "voe",
    "press",
    "pr",
    "newsroom",
}
# Substrings that mark placeholder / non-sales inboxes even on real domains.
JUNK_LOCAL_SUBSTR = (
    "childbirth",
    "mediarelation",
    "publicrelation",
)
JUNK_EMAILS = {
    "mike@harrison.com",  # crawl false positive
}


def get_db_url() -> str:
    raw = subprocess.check_output(
        ["railway", "variables", "--service", "api", "--json"], text=True
    )
    return json.loads(raw)["DATABASE_URL"]


def get_unsub_secret() -> str:
    return (
        os.getenv("UNSUBSCRIBE_SECRET")
        or os.getenv("CRON_SECRET")
        or os.getenv("JWT_SECRET")
        or "palmcare-unsubscribe-dev-secret"
    )


def make_unsub_token(email: str) -> str:
    norm = email.strip().lower()
    return hmac.new(get_unsub_secret().encode(), norm.encode(), hashlib.sha256).hexdigest()[:32]


def make_unsub_url(email: str) -> str:
    q = urlencode(
        {
            "email": email.strip().lower(),
            "token": make_unsub_token(email),
            "utm_source": "email",
            "utm_medium": "email",
            "utm_campaign": CAMPAIGN,
            "utm_content": "unsubscribe",
        }
    )
    return f"{SITE}/unsubscribe?{q}"


def make_unsub_headers(email: str) -> dict:
    api = f"{API}/platform/sales/leads/unsubscribe?" + urlencode(
        {"email": email.strip().lower(), "token": make_unsub_token(email)}
    )
    return {
        "List-Unsubscribe": f"<mailto:sales@palmtai.com?subject=unsubscribe>, <{api}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


def is_ok_email(email: str | None, suppressed: set[str]) -> bool:
    if not email or "@" not in email:
        return False
    e = email.strip().lower()
    local, _, dom = e.partition("@")
    if e in suppressed or e in JUNK_EMAILS or dom in JUNK_DOMAINS or local in JUNK_LOCAL:
        return False
    if any(x in dom for x in ("example.", "test.", "sentry.", "godaddy.")):
        return False
    if any(x in local for x in JUNK_LOCAL_SUBSTR):
        return False
    # Placeholder patterns: name@name.com, user@domain.com, email@email.com
    if local == dom.split(".")[0] and dom in {"email.com", "domain.com", "test.com", "example.com"}:
        return False
    if local in {"info", "contact", "hello"} and dom in {"email.com", "domain.com"}:
        return False
    return True


def enable_tracking() -> None:
    try:
        domains = resend.Domains.list()
        items = domains.get("data") if isinstance(domains, dict) else getattr(domains, "data", domains)
        for d in items or []:
            did = d["id"] if isinstance(d, dict) else d.id
            name = d.get("name") if isinstance(d, dict) else d.name
            try:
                resend.Domains.update({"id": did, "open_tracking": True, "click_tracking": True})
                print(f"tracking on: {name}")
            except Exception as exc:  # noqa: BLE001
                print(f"tracking skip {name}: {exc}")
    except Exception as exc:  # noqa: BLE001
        print(f"domain list err: {exc}")


def researched_seed() -> list[dict]:
    return [
        {"provider_name": "AmanaCare Omaha", "city": "Omaha", "state": "NE", "contact_email": "contact@amana-care.com", "phone": "(402) 509-1443", "website": "https://amana-care.com", "source": "web_research"},
        {"provider_name": "AmanaCare Lincoln", "city": "Lincoln", "state": "NE", "contact_email": "contact@amana-care.com", "phone": "(402) 440-5878", "website": "https://amana-care.com", "source": "web_research"},
        {"provider_name": "Loving Hearts And Helping Hands", "city": "Omaha", "state": "NE", "contact_email": "info@lovingheartsandhelpinghands.com", "phone": "(402) 960-8456", "website": "https://lovingheartsandhelpinghands.com", "source": "web_research"},
        {"provider_name": "Unity Home Care LLC", "city": "Omaha", "state": "NE", "contact_email": "unityhomeomaha@gmail.com", "phone": "(402) 203-8947", "website": "https://unityhomeomaha.com", "source": "web_research"},
        {"provider_name": "Doena Heart Home Health", "city": "Omaha", "state": "NE", "contact_email": "info@doenahearthomehealth.com", "phone": "(402) 850-9715", "website": "https://www.doenahearthomehealth.com", "source": "web_research"},
        {"provider_name": "Kellah Home Care LLC", "city": "Omaha", "state": "NE", "contact_email": "info@kellahhomecare.com", "phone": "(402) 706-6894", "website": "https://kellahhomecare.com", "source": "web_research"},
        {"provider_name": "Always Best Care Omaha", "city": "Omaha", "state": "NE", "contact_email": "alwaysbcare@gmail.com", "phone": "(402) 208-9371", "website": "https://alwaysbestcareservices.com", "source": "web_research"},
        {"provider_name": "Caretech Inc", "city": "Omaha", "state": "NE", "contact_email": "info@caretechinc.com", "phone": "(402) 697-5121", "website": "https://caretechinc.com", "source": "web_research"},
        {"provider_name": "Venus Home Care LLC", "city": "Omaha", "state": "NE", "contact_email": "venushc20@gmail.com", "phone": "(402) 812-8577", "website": "https://venushcare.com", "source": "web_research"},
        {"provider_name": "All Midlands Health Services", "city": "Omaha", "state": "NE", "contact_email": "tammy@allmidlands.com", "phone": "(402) 391-5554", "website": "https://allmidlands.com", "source": "web_research"},
        {"provider_name": "Home Nursing With Heart", "city": "Omaha", "state": "NE", "contact_email": "care@nursingwithheart.com", "source": "found_emails"},
        {"provider_name": "Freedom In Home Services, Llc", "city": "Omaha", "state": "NE", "contact_email": "info@freedominhome.com", "source": "found_emails"},
        {"provider_name": "Neighbors Keeper, Llc", "city": "Omaha", "state": "NE", "contact_email": "neighbors.keeperhomehealth@gmail.com", "source": "found_emails"},
        {"provider_name": "Adorn Senior Home Care, Llc", "city": "Omaha", "state": "NE", "contact_email": "contact@adornseniorhomecare.com", "source": "found_emails"},
        {"provider_name": "Tabitha Home Health Care", "city": "Lincoln", "state": "NE", "contact_email": "info@tabitha.org", "phone": "(402) 420-2273", "source": "web_research"},
        {"provider_name": "Interim Healthcare Lincoln", "city": "Lincoln", "state": "NE", "contact_email": "wehearyou@interimhealthcare.com", "source": "found_emails"},
        {"provider_name": "Iowa Home Care", "city": "Des Moines", "state": "IA", "contact_email": "contactus@iowahomecare.com", "website": "https://iowahomecare.com", "source": "web_research"},
        {"provider_name": "Visiting Angels Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@visitingangels.com", "phone": "(206) 439-2458", "website": "https://www.visitingangels.com/seattle/home", "source": "web_research"},
        {"provider_name": "Fedelta Home Care", "city": "Seattle", "state": "WA", "contact_email": "info@fedeltahomecare.com", "website": "https://fedeltahomecare.com", "source": "web_research"},
        {"provider_name": "Synergy HomeCare of Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@synergyhomecare.com", "website": "https://synergyhomecare.com", "source": "web_research"},
        {"provider_name": "Right at Home Seattle King County", "city": "Seattle", "state": "WA", "contact_email": "seattle@rightathome.net", "website": "https://rightathome.net", "source": "web_research"},
        {"provider_name": "Comfort Keepers Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@comfortkeepers.com", "website": "https://comfortkeepers.com", "source": "web_research"},
        {"provider_name": "Home Instead Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@homeinstead.com", "website": "https://homeinstead.com", "source": "web_research"},
        {"provider_name": "Senior Helpers Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@seniorhelpers.com", "website": "https://seniorhelpers.com", "source": "web_research"},
        {"provider_name": "Assisting Hands Home Care Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@assistinghands.com", "website": "https://assistinghands.com", "source": "web_research"},
        {"provider_name": "Always Best Care Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@abc-seniors.com", "website": "https://alwaysbestcare.com", "source": "web_research"},
        {"provider_name": "FirstLight HomeCare of Seattle", "city": "Seattle", "state": "WA", "contact_email": "seattle@firstlighthomecare.com", "website": "https://firstlighthomecare.com", "source": "web_research"},
        {"provider_name": "Careage Home Health", "city": "Bellevue", "state": "WA", "contact_email": "careagecare@gmail.com", "source": "found_emails"},
        {"provider_name": "Kline Galland Home Health", "city": "Seattle", "state": "WA", "contact_email": "emilyc@klinegalland.org", "source": "found_emails"},
        {"provider_name": "Sea Mar Home Health", "city": "Seattle", "state": "WA", "contact_email": "customerservice@seamar.com", "source": "found_emails"},
        {"provider_name": "Providence Home Services King County", "city": "Tukwila", "state": "WA", "contact_email": "homeservices@providence.org", "website": "https://www.providence.org", "source": "web_research"},
        {"provider_name": "EvergreenHealth Home Care", "city": "Kirkland", "state": "WA", "contact_email": "homecare@evergreenhealth.com", "website": "https://www.evergreenhealth.com", "source": "web_research"},
        {"provider_name": "Signature Healthcare at Home Bellevue", "city": "Bellevue", "state": "WA", "contact_email": "info@signatureathome.com", "website": "https://www.signatureathome.com", "source": "web_research"},
    ]


def build_email(name: str, city: str, state: str, email: str) -> tuple[str, str]:
    unsub = make_unsub_url(email)
    city_label = city or "your area"
    if state == "WA":
        subject = f"{name}: in-person PalmCare demo in Seattle on Sept 3"
        body = f"""
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">Hi {name} team,</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
I'm Muse Ibrahim, founder of PalmCare AI. I'll be in Seattle on <strong>September 3</strong> and can do a short in-person demo for your home health or in-home care team.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
PalmCare turns one visit recording into the care plan, billables, notes, and contract. Download the iPhone app, or book a demo on the site.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
<a href="{DEMO_URL}" style="color:#0d9488;font-weight:600;">Book a demo</a>
&nbsp;·&nbsp;
<a href="{APP_URL}" style="color:#0d9488;font-weight:600;">Get the App Store app</a>
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
Reply to this email or write me at <a href="mailto:{REPLY_TO}" style="color:#0d9488;">{REPLY_TO}</a> and we'll lock a time while I'm in town.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">Muse Ibrahim<br/>Founder, PalmCare AI<br/>{REPLY_TO}</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
Serving agencies in {city_label}, {state}. <a href="{unsub}" style="color:#94a3b8;">Unsubscribe</a>
</p>
"""
    else:
        subject = f"{name}: PalmCare demo + App Store download"
        body = f"""
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;">Hi {name} team,</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
I'm Muse Ibrahim, founder of PalmCare AI. We help home health and in-home care agencies in {city_label} finish paperwork the same day as the visit.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
Record the assessment once. PalmCare writes the care plan, billables, notes, and contract. Built for 50-state rules.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
<a href="{DEMO_URL}" style="color:#0d9488;font-weight:600;">Set up a demo</a>
&nbsp;·&nbsp;
<a href="{APP_URL}" style="color:#0d9488;font-weight:600;">Download on the App Store</a>
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">
Happy to walk your team through it live. Reply here or email <a href="mailto:{REPLY_TO}" style="color:#0d9488;">{REPLY_TO}</a>.
</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#334155;">Muse Ibrahim<br/>Founder, PalmCare AI</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
<a href="{unsub}" style="color:#94a3b8;">Unsubscribe</a>
</p>
"""
    html = f"<!doctype html><html><body style='margin:0;background:#f8fafc;padding:24px;'>{body}</body></html>"
    return subject, html


def main() -> None:
    enable_tracking()
    conn = psycopg2.connect(get_db_url(), connect_timeout=30)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute("SELECT lower(email) AS e FROM email_preferences WHERE outreach IS FALSE")
    suppressed = {r["e"] for r in cur.fetchall()}
    print("suppressed", sorted(suppressed))

    cur.execute(
        """
        DELETE FROM sales_leads
        WHERE unsubscribed IS TRUE
           OR status ILIKE %s
           OR (contact_email IS NOT NULL AND lower(contact_email) = ANY(%s))
        RETURNING provider_name, contact_email, status
        """,
        ("%bounc%", list(suppressed) or ["__none__"]),
    )
    deleted = cur.fetchall()
    conn.commit()
    print(f"purged from CRM: {len(deleted)}")

    items = researched_seed()
    found_path = ROOT / "scripts/data/found_emails.json"
    if found_path.exists():
        for r in json.loads(found_path.read_text()):
            st = (r.get("state") or "").upper()
            if st not in {"NE", "IA", "WA"}:
                continue
            email = (r.get("email") or "").strip().lower()
            if not is_ok_email(email, suppressed):
                continue
            items.append(
                {
                    "provider_name": r.get("provider_name") or "Home Health Agency",
                    "city": r.get("city") or "",
                    "state": st,
                    "contact_email": email,
                    "phone": r.get("phone"),
                    "source": "found_emails",
                    "ccn": r.get("ccn"),
                }
            )

    wa_path = ROOT / "scripts/data/cms_wa_home_health.json"
    if wa_path.exists():
        for r in json.loads(wa_path.read_text()):
            items.append(
                {
                    "provider_name": (r.get("provider_name") or "").title(),
                    "city": (r.get("citytown") or "").title(),
                    "state": "WA",
                    "address": (r.get("address") or "").title(),
                    "zip_code": r.get("zip_code"),
                    "phone": r.get("telephone_number"),
                    "ccn": r.get("cms_certification_number_ccn"),
                    "contact_email": None,
                    "source": "cms_wa",
                }
            )

    full_path = ROOT / "scripts/data/cms_agencies_full.json"
    if full_path.exists():
        for r in json.loads(full_path.read_text()):
            st = (r.get("state") or "").upper()
            if st not in {"NE", "IA"}:
                continue
            items.append(
                {
                    "provider_name": (r.get("provider_name") or "").title(),
                    "city": (r.get("city") or "").title(),
                    "state": st,
                    "address": r.get("address"),
                    "zip_code": r.get("zip_code"),
                    "phone": r.get("phone"),
                    "ccn": r.get("ccn"),
                    "contact_email": None,
                    "source": "cms_full",
                }
            )

    added = updated = 0
    for item in items:
        name = (item.get("provider_name") or "").strip()
        st = (item.get("state") or "").upper()
        city = (item.get("city") or "").strip()
        email = (item.get("contact_email") or "").strip().lower() or None
        if email and not is_ok_email(email, suppressed):
            email = None
        if not name or not st:
            continue
        if email and email in suppressed:
            continue

        cur.execute(
            """
            SELECT id, contact_email, COALESCE(email_send_count,0) AS sends
            FROM sales_leads
            WHERE state=%s AND lower(provider_name)=lower(%s)
            LIMIT 1
            """,
            (st, name),
        )
        row = cur.fetchone()
        if row:
            if email and (
                not row["contact_email"]
                or (row["sends"] == 0 and row["contact_email"].lower() != email)
            ):
                cur.execute(
                    "UPDATE sales_leads SET contact_email=%s, updated_at=NOW() WHERE id=%s",
                    (email, row["id"]),
                )
                updated += 1
        else:
            cur.execute(
                """
                INSERT INTO sales_leads (
                  id, provider_name, state, city, address, zip_code, phone, contact_email,
                  website, status, priority, source, campaign_tag, created_at, updated_at,
                  email_send_count, unsubscribed, ccn
                ) VALUES (
                  gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s,
                  %s, 'new', 'high', %s, %s, NOW(), NOW(),
                  0, false, %s
                )
                """,
                (
                    name,
                    st,
                    city or None,
                    item.get("address"),
                    item.get("zip_code"),
                    item.get("phone"),
                    email,
                    item.get("website"),
                    item.get("source") or "midwest_wa_wave",
                    CAMPAIGN,
                    item.get("ccn"),
                ),
            )
            added += 1
    conn.commit()
    print(f"CRM upsert added={added} email_updated={updated}")

    # Crawl a few sites for missing emails
    email_re = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.I)
    cur.execute(
        """
        SELECT id, provider_name, website FROM sales_leads
        WHERE state IN ('NE','IA','WA')
          AND (contact_email IS NULL OR contact_email='')
          AND website IS NOT NULL AND website<>''
        LIMIT 30
        """
    )
    crawl_found = 0
    for lead in cur.fetchall():
        site = lead["website"]
        if not site.startswith("http"):
            site = "https://" + site
        for path in ("", "/contact", "/contact-us"):
            try:
                req = urllib.request.Request(
                    site.rstrip("/") + path,
                    headers={"User-Agent": "Mozilla/5.0 PalmCareBot/1.0"},
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    html = resp.read().decode("utf-8", "ignore")
                emails = sorted(
                    {e.lower() for e in email_re.findall(html) if is_ok_email(e, suppressed)},
                    key=lambda e: (0 if e.split("@")[0] in {"info", "contact", "hello", "admin", "office"} else 1, e),
                )
                if emails:
                    cur.execute(
                        "UPDATE sales_leads SET contact_email=%s, updated_at=NOW() WHERE id=%s",
                        (emails[0], lead["id"]),
                    )
                    crawl_found += 1
                    print("crawl", lead["provider_name"], emails[0])
                    break
            except Exception:
                continue
        time.sleep(0.12)
    conn.commit()
    print(f"crawl_found={crawl_found}")

    cur.execute(
        """
        SELECT id, provider_name, city, state, contact_email
        FROM sales_leads
        WHERE state IN ('NE','IA','WA')
          AND contact_email IS NOT NULL AND contact_email<>''
          AND COALESCE(unsubscribed,false)=false
          AND status NOT ILIKE %s
          AND COALESCE(email_send_count,0)=0
        ORDER BY
          CASE state WHEN 'WA' THEN 0 WHEN 'NE' THEN 1 ELSE 2 END,
          CASE WHEN city ILIKE %s OR city ILIKE %s OR city ILIKE %s THEN 0 ELSE 1 END,
          provider_name
        LIMIT %s
        """,
        ("%bounc%", "%seattle%", "%omaha%", "%lincoln%", DAILY_CAP),
    )
    leads = cur.fetchall()
    print(f"ready to send: {len(leads)}")

    send_log = json.loads(LOG_PATH.read_text()) if LOG_PATH.exists() else []
    already = {(r.get("email") or "").lower() for r in send_log}
    sent = failed = skipped = 0
    now = datetime.now(timezone.utc)

    for lead in leads:
        email = (lead["contact_email"] or "").strip().lower()
        if not is_ok_email(email, suppressed) or email in already:
            skipped += 1
            continue

        subject, html = build_email(
            lead["provider_name"], lead["city"] or "", lead["state"], email
        )
        try:
            result = resend.Emails.send(
                {
                    "from": FROM_SALES,
                    "to": [email],
                    "reply_to": REPLY_TO,
                    "subject": subject,
                    "html": html,
                    "headers": make_unsub_headers(email),
                    "tags": [
                        {"name": "campaign", "value": "midwest_wa_wave"},
                        {"name": "state", "value": lead["state"]},
                        {"name": "channel", "value": "sales_outreach"},
                    ],
                }
            )
            rid = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print("FAIL", email, exc)
            time.sleep(0.4)
            continue

        next_at = now + timedelta(days=3)
        cur.execute(
            """
            UPDATE sales_leads SET
              email_send_count = COALESCE(email_send_count,0) + 1,
              last_email_sent_at = %s,
              last_email_subject = %s,
              resend_email_id = %s,
              status = 'email_sent',
              is_contacted = true,
              campaign_tag = %s,
              last_template_sent = 'midwest_wa_intro',
              sequence_step = 1,
              sequence_started_at = %s,
              sequence_completed = false,
              next_email_scheduled_at = %s,
              updated_at = %s
            WHERE id = %s
            """,
            (now, subject, rid, CAMPAIGN, now, next_at, now, lead["id"]),
        )
        try:
            cur.execute(
                """
                INSERT INTO email_campaign_events (
                  id, lead_id, template_id, campaign_tag, event_type,
                  resend_email_id, subject, to_email, created_at
                ) VALUES (
                  gen_random_uuid(), %s, 'midwest_wa_intro', %s, 'sent',
                  %s, %s, %s, %s
                )
                """,
                (lead["id"], CAMPAIGN, rid, subject, email, now),
            )
        except Exception as exc:  # noqa: BLE001
            print("event log skip:", exc)
            conn.rollback()
            cur.execute(
                """
                UPDATE sales_leads SET
                  email_send_count = COALESCE(email_send_count,0) + 1,
                  last_email_sent_at = %s,
                  last_email_subject = %s,
                  resend_email_id = %s,
                  status = 'email_sent',
                  is_contacted = true,
                  campaign_tag = %s,
                  last_template_sent = 'midwest_wa_intro',
                  sequence_step = 1,
                  sequence_started_at = %s,
                  sequence_completed = false,
                  next_email_scheduled_at = %s,
                  updated_at = %s
                WHERE id = %s
                """,
                (now, subject, rid, CAMPAIGN, now, next_at, now, lead["id"]),
            )
        conn.commit()
        send_log.append(
            {
                "email": email,
                "provider": lead["provider_name"],
                "state": lead["state"],
                "city": lead["city"],
                "resend_id": rid,
                "subject": subject,
                "at": now.isoformat(),
            }
        )
        already.add(email)
        sent += 1
        print(f"sent {sent}/{len(leads)} {lead['state']} {lead['provider_name']} -> {email}")
        time.sleep(0.35)

    LOG_PATH.write_text(json.dumps(send_log, indent=2))
    print(json.dumps({"sent": sent, "failed": failed, "skipped": skipped, "purged": len(deleted)}, indent=2))
    conn.close()


if __name__ == "__main__":
    main()
