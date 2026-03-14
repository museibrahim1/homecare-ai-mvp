#!/usr/bin/env python3
"""
Update investor contact emails in PalmCare AI CRM.
Uses the internal batch-update-emails endpoint with cron key auth.
"""
import requests
import sys

API_BASE = "https://api-production-a0a2.up.railway.app"
CRON_KEY = "palmcare-cron-2026"

# Researched VC contact/pitch emails (March 2026)
# Sources: official websites, contact pages, pitch submission pages
INVESTOR_EMAILS = [
    {
        "fund_name": "Rock Health",
        "contact_email": "capital@rockhealth.com",
        "contact_name": "Rock Health Capital Team",
        "notes": "Submit pitch at rockhealth.com/join-our-portfolio/ — digital health focused pre-seed/seed/A",
    },
    {
        "fund_name": "StartUp Health",
        "contact_email": "info@startuphealth.com",
        "contact_name": "StartUp Health Team",
        "notes": "Apply at startuphealth.com/apply-now — health moonshot communities",
    },
    {
        "fund_name": "Gradient Ventures",
        "contact_email": "info@gradient.com",
        "contact_name": "Gradient Ventures Team",
        "notes": "Google's AI fund. Pre-Seed/Seed/A. $100K-$10M checks",
    },
    {
        "fund_name": "GV",
        "contact_email": "press@gv.com",
        "contact_name": "GV Team",
        "notes": "Google Ventures — no public pitch email. press@gv.com for inquiries. $10B+ AUM",
    },
    {
        "fund_name": "First Round Capital",
        "contact_email": "pitch@firstround.com",
        "contact_name": "First Round Capital Team",
        "notes": "Seed stage. Submit via firstround.com — team is biggest factor in decisions",
    },
    {
        "fund_name": "General Catalyst",
        "contact_email": "info@generalcatalyst.com",
        "contact_name": "General Catalyst Team",
        "notes": "Use contact form at generalcatalyst.com/contact. $43B+ AUM. Seed to growth",
    },
    {
        "fund_name": "Khosla Ventures",
        "contact_email": "info@khoslaventures.com",
        "contact_name": "Khosla Ventures Team",
        "notes": "Also try partnerships@khoslaventures.com. Early-stage tech/healthcare/sustainability",
    },
    {
        "fund_name": "Homebrew",
        "contact_email": "hunter@homebrew.co",
        "contact_name": "Hunter Walk",
        "notes": "Co-founder. Also satya@homebrew.co (Satya Patel). Reviews every credible email. $100K-$500K",
    },
    {
        "fund_name": "Founder Collective",
        "contact_email": "contact@foundercollective.com",
        "contact_name": "Founder Collective Team",
        "notes": "Seed stage. 580 Broadway Suite 303, NYC. 350+ investments since 2009",
    },
    {
        "fund_name": "SV Angel",
        "contact_email": "info@svangel.com",
        "contact_name": "SV Angel Team",
        "notes": "Email format first@svangel.com. Seed fund $200K, Growth fund Series B+",
    },
    {
        "fund_name": "Incisive Ventures",
        "contact_email": "martin@incisive.vc",
        "contact_name": "Martin Tobias",
        "notes": "Submit via bit.ly/pitchIV (Founder Connect). Pre-seed $50K-$500K. Seattle-based",
    },
    {
        "fund_name": "BoxGroup",
        "contact_email": "info@boxgroup.com",
        "contact_name": "BoxGroup Team",
        "notes": "Pre-seed to Series A, up to $1M. NYC and SF. Backed Ramp, Plaid, Cursor",
    },
    {
        "fund_name": "Pear VC",
        "contact_email": "team@pear.vc",
        "contact_name": "Pear VC Team",
        "notes": "Apply via pear.vc/pearx-application/. Pre-seed/seed/A. $150K-$4M. Seeded $300B+ companies",
    },
    {
        "fund_name": "Contrary Capital",
        "contact_email": "hello@contrarycap.com",
        "contact_name": "Contrary Team",
        "notes": "Email format name@contrarycap.com. Seed to scale. Talent/research-driven",
    },
    {
        "fund_name": "Afore Capital",
        "contact_email": "invest@afore.vc",
        "contact_name": "Afore Capital Team",
        "notes": "Submit at afore.vc/afore-alpha. Largest pre-seed fund. $500K-$2M+ checks",
    },
    {
        "fund_name": "Day One Ventures",
        "contact_email": "masha@dayoneventures.com",
        "contact_name": "Masha Bucher",
        "notes": "Founder & GP. Pre-seed to Series A, $100K-$5M. Known for PR/comms support",
    },
    {
        "fund_name": "Pioneer Fund",
        "contact_email": "team@pioneer.app",
        "contact_name": "Pioneer Team",
        "notes": "Apply at pioneer.app/apply. $20K at $2M valuation. NOTE: stopped new investments 2024",
    },
    {
        "fund_name": "Array Ventures",
        "contact_email": "deals@array.vc",
        "contact_name": "Array Ventures Team",
        "notes": "Pre-seed. $250K-$3M. AI infra, dev tools, data platforms. 3-4 day decision process",
    },
    {
        "fund_name": "LAUNCH",
        "contact_email": "jason@calacanis.com",
        "contact_name": "Jason Calacanis",
        "notes": "Submit at launch.co/apply or launch.co/pitch. Keep cold emails 75-110 words",
    },
    {
        "fund_name": "Hustle Fund",
        "contact_email": "hello@hustlefund.vc",
        "contact_name": "Hustle Fund Team",
        "notes": "Apply at hustlefund.typeform.com/to/UGTnIt. Pre-seed $150K checks. 48hr decisions",
    },
    {
        "fund_name": "2048 Ventures",
        "contact_email": "alex@2048.vc",
        "contact_name": "Alex Iskold",
        "notes": "Pitch at 2048.vc/pitch — no warm intro needed. Pre-Seed Fast Track: 10 business days",
    },
    {
        "fund_name": "Beta Boom",
        "contact_email": "hello@betaboom.com",
        "contact_name": "Beta Boom Team",
        "notes": "Apply at betaboom.com/apply. $350-500K pre-seed. Digital health focus. Non-SV only",
    },
    {
        "fund_name": "Precursor Ventures",
        "contact_email": "hello@precursorvc.com",
        "contact_name": "Precursor Ventures Team",
        "notes": "Submit at precursorvc.com/startup/. Pre-seed/seed $50K-$500K. 1-2 week decisions",
    },
    {
        "fund_name": "NFX",
        "contact_email": "qed@nfx.com",
        "contact_name": "NFX Team",
        "notes": "Also press@nfx.com. Seed/early-stage. Marketplaces and networks. SF/Palo Alto/Israel",
    },
    {
        "fund_name": "Forum Ventures",
        "contact_email": "pitch@forumvc.com",
        "contact_name": "Forum Ventures Team",
        "notes": "Pitch form at forumvc.com/pitch-us. B2B pre-seed $100K. 430+ companies funded",
    },
    {
        "fund_name": "Antler",
        "contact_email": "hello@antler.co",
        "contact_name": "Antler Team",
        "notes": "Apply at antler.co/apply. $400K total ($250K + $150K). 27 global locations",
    },
    {
        "fund_name": "Backstage Capital",
        "contact_email": "hello@backstagecapital.com",
        "contact_name": "Backstage Capital Team",
        "notes": "Apply at backstagecapital.com/apply-2/. Underrepresented founders. $100K+ checks. NOTE: not currently accepting new apps",
    },
    {
        "fund_name": "Resolute Ventures",
        "contact_email": "team@resolute.vc",
        "contact_name": "Michael Hirshland & Raanan Bar-Cohen",
        "notes": "Co-founders. DMs open on Twitter. Lead seed/pre-seed. $500K-$3M",
    },
    {
        "fund_name": "Dream Machine",
        "contact_email": "alexia@dreammachine.vc",
        "contact_name": "Alexia Bonatsos",
        "notes": "Founder (ex-TechCrunch co-editor-in-chief). Consumer and frontier tech seed fund",
    },
    {
        "fund_name": "Tau Ventures",
        "contact_email": "info@tauventures.com",
        "contact_name": "Tau Ventures Team",
        "notes": "AI-first fund. Healthcare, enterprise, automation. Seed stage. Palo Alto HQ",
    },
    {
        "fund_name": "Village Global",
        "contact_email": "hello@villageglobal.vc",
        "contact_name": "Village Global Team",
        "notes": "Also submit at villageglobal.vc/submit-startup. Pre-seed/seed $500K-$3M. 2-3 week decisions",
    },
    {
        "fund_name": "Slow Ventures",
        "contact_email": "hello@slow.co",
        "contact_name": "Slow Ventures Team",
        "notes": "Apply at standardaptitude.com form. Seed/pre-seed. ~$1B invested. SF/Boston/NYC",
    },
    {
        "fund_name": "FJ Labs",
        "contact_email": "info@fjlabs.com",
        "contact_name": "FJ Labs Team",
        "notes": "Also pitch at pitchfabrice.fabricegrinda.com. Marketplace focus. 200+ deals/week. 1000+ investments",
    },
    {
        "fund_name": "Plug and Play",
        "contact_email": "info@pnptc.com",
        "contact_name": "Plug and Play Team",
        "notes": "Health tech pitches: roja@pnptc.com. Accelerator + investor. 75K+ startups network",
    },
    {
        "fund_name": "SOSV",
        "contact_email": "hello@sosv.com",
        "contact_name": "SOSV Team",
        "notes": "Apply at sosv.com/apply. IndieBio (health/life sci) or HAX (hard tech). $525K pre-seed",
    },
]


def main():
    print("=" * 60)
    print("PalmCare AI — Investor Email Batch Update")
    print("=" * 60)
    print(f"\nTarget API: {API_BASE}")
    print(f"Emails to update: {len(INVESTOR_EMAILS)}")
    print()

    payload = [
        {"fund_name": e["fund_name"], "contact_email": e["contact_email"], "contact_name": e.get("contact_name", "")}
        for e in INVESTOR_EMAILS
    ]

    print("Sending batch update request...")
    try:
        resp = requests.post(
            f"{API_BASE}/platform/investors/batch-update-emails",
            json=payload,
            headers={"X-Internal-Key": CRON_KEY},
            timeout=30,
        )
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to API. Is the server running?")
        sys.exit(1)

    if resp.status_code == 404:
        print("ERROR: Endpoint not found (404). The batch-update-emails endpoint may not be deployed yet.")
        print("Deploy the latest code to Railway first, then re-run this script.")
        sys.exit(1)

    if resp.status_code == 401:
        print("ERROR: Authentication failed (401). Check the CRON_SECRET / INTERNAL_API_KEY.")
        sys.exit(1)

    if resp.status_code != 200:
        print(f"ERROR: API returned {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)

    data = resp.json()
    print(f"\nResults:")
    print(f"  Updated:   {data.get('updated', 0)}")
    print(f"  Skipped:   {data.get('skipped', 0)}")
    print(f"  Not Found: {data.get('not_found', 0)}")
    print()

    for r in data.get("results", []):
        status = r["status"]
        fund = r["fund_name"]
        if status == "updated":
            print(f"  ✓ {fund} → {r.get('email', '')}")
        elif status == "skipped":
            reason = r.get("reason", "")
            existing = r.get("existing", "")
            if reason == "already_has_email":
                print(f"  → {fund} (already has: {existing})")
            else:
                print(f"  → {fund} (skipped: {reason})")
        elif status == "not_found":
            print(f"  ✗ {fund} (not in CRM)")

    print(f"\nDone.")


if __name__ == "__main__":
    main()
