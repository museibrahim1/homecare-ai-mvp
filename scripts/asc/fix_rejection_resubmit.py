#!/usr/bin/env python3.11
"""Fix v1.1 App Review rejection blockers and resubmit.

Root cause of the Jul 14/15 loop: prices and copy were out of sync across
App Store Connect, the App Description, review notes, and the website.
Enterprise was temporarily dropped to $999 while the site still said $1,199.99,
and the Enterprise subscription reviewNote was left as "Test".

Canonical prices (match Apple's approved price points):
  Starter  $199 /mo   or $1,899.99 /yr  (14-day trial)
  Growth   $699 /mo   or $6,699.99 /yr  (14-day trial)
  Enterprise $1,199.99 /mo or $10,000 /yr

Usage:
  python3.11 scripts/asc/fix_rejection_resubmit.py --status
  python3.11 scripts/asc/fix_rejection_resubmit.py --fix-metadata
  python3.11 scripts/asc/fix_rejection_resubmit.py --resubmit
"""
from __future__ import annotations

import argparse
import sys
import time

sys.path.insert(0, "/Users/musaibrahim/Desktop/AI Voice Contracter/scripts/asc")
from asc_api import req, get_all

APP_ID = "6766371988"
VERSION_ID = "824e5386-d327-4d60-8dda-46ef55435f23"
REVIEW_DETAIL_ID = "4f1c5c20-8d23-413b-8ac8-91727d336dd4"
OLD_SUBMISSION_ID = "cecbb382-a217-4dd3-8ba1-bb026388012e"
NEW_SUBMISSION_ID = "b257e7b8-952d-43ea-88a3-85e42ddfb990"
GROUP_LOC_ID = "70fa999d-55a5-41a2-ab12-ed4f7796b927"

ENTERPRISE_MONTHLY_ID = "6789515070"
ENTERPRISE_TARGET_PRICE = "1199.99"

MONTHLY_SUB_IDS = {
    "6789514973": "com.palmcareai.app.starter.monthly",
    "6789514965": "com.palmcareai.app.growth.monthly",
    "6789515070": "com.palmcareai.app.pro.monthly",
}
ANNUAL_SUB_IDS = {
    "6789567091": "com.palmcareai.app.starter.annual",
    "6789567272": "com.palmcareai.app.growth.annual",
    "6789567377": "com.palmcareai.app.pro.annual",
}

ENTERPRISE_REVIEW_NOTE = (
    "B2B auto-renewable subscription for licensed U.S. home care agencies. "
    "Enterprise unlocks unlimited AI assessments and unlimited team seats. "
    "Purchases are verified server side with StoreKit 2 and App Store Server Notifications V2."
)

REVIEW_NOTES = """PALM is a production app for licensed U.S. home care agencies. Any agency can create an account on the welcome screen and use every feature with their own client data.

RESPONSE TO GUIDELINE 3 (price confirmation):
Yes, the Enterprise Monthly price of $1,199.99 is intentional. PALM is B2B software for licensed home care agencies (not a consumer app). Live prices:
• Starter: $199/month or $1,899.99/year (14-day free trial)
• Growth: $699/month or $6,699.99/year (14-day free trial)
• Enterprise: $1,199.99/month or $10,000/year
These match the App Store product prices, the in-app paywall (Settings > View Plans), the App Description SUBSCRIPTION PLANS section, and palmcareai.com/pricing.

RESPONSE TO GUIDELINE 3.1.2(c):
The App Description includes plan title, length, and price for every subscription, plus functional links:
• Privacy Policy: https://palmcareai.com/privacy
• Terms of Use (EULA): https://palmcareai.com/terms
The Privacy Policy field in App Store Connect is set to https://palmcareai.com/privacy. The in-app paywall shows price, billing period, 14-day trial terms (Starter and Growth), auto-renew disclosure, Restore Purchases, and the same Privacy and Terms links.

HOW TO REVIEW:
Sign in with the demo account below. Open Home > Eleanor Whitfield for a completed visit, or tap Palm It to record. You can also register a new agency from the welcome screen. To review subscriptions: Settings > View Plans.

MICROPHONE: client assessments only.
ACCOUNT DELETION: Settings > Danger Zone > Delete Account.
SUPPORT: Settings > Support.
SIGN IN WITH APPLE: not offered (no third-party social login)."""


def print_status() -> None:
    print("=== STATUS ===")
    v = req("GET", f"/v1/appStoreVersions/{VERSION_ID}")
    print("v1.1:", v["data"]["attributes"].get("appStoreState"))
    for sid, label in [(OLD_SUBMISSION_ID, "old"), (NEW_SUBMISSION_ID, "new")]:
        try:
            sub = req("GET", f"/v1/reviewSubmissions/{sid}")
            items = req("GET", f"/v1/reviewSubmissions/{sid}/items")
            print(f"submission[{label}]:", sub["data"]["attributes"].get("state"),
                  "items:", [(i["attributes"].get("state"),) for i in items.get("data", [])])
        except Exception as e:
            print(f"submission[{label}]:", str(e)[:120])

    prices = req(
        f"GET",
        f"/v1/subscriptions/{ENTERPRISE_MONTHLY_ID}/prices?filter[territory]=USA&include=subscriptionPricePoint",
    )
    inc = {x["id"]: x for x in prices.get("included", [])}
    if prices["data"]:
        pt = prices["data"][0]["relationships"]["subscriptionPricePoint"]["data"]["id"]
        print("Enterprise USA price:", inc[pt]["attributes"]["customerPrice"])
    note = req("GET", f"/v1/subscriptions/{ENTERPRISE_MONTHLY_ID}")["data"]["attributes"].get("reviewNote")
    print("Enterprise reviewNote:", (note or "")[:90])

    locs = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations")
    for loc in locs["data"]:
        if loc["attributes"].get("locale") == "en-US":
            d = loc["attributes"].get("description") or ""
            i = d.find("Enterprise:")
            print("description Enterprise line:", d[i : i + 70] if i >= 0 else "(missing)")


def ensure_enterprise_price() -> None:
    print(f"=== ENSURE Enterprise monthly == ${ENTERPRISE_TARGET_PRICE} ===")
    pts = get_all(
        f"/v1/subscriptions/{ENTERPRISE_MONTHLY_ID}/pricePoints?filter[territory]=USA&limit=8000"
    )
    usa = next(
        p for p in pts
        if abs(float(p["attributes"]["customerPrice"]) - float(ENTERPRISE_TARGET_PRICE)) < 0.001
    )
    eqs = get_all(f"/v1/subscriptionPricePoints/{usa['id']}/equalizations?limit=8000")
    all_points = [usa["id"]] + [e["id"] for e in eqs]
    have = {
        p.get("relationships", {}).get("subscriptionPricePoint", {}).get("data", {}).get("id")
        for p in get_all(
            f"/v1/subscriptions/{ENTERPRISE_MONTHLY_ID}/prices?include=subscriptionPricePoint&limit=200"
        )
    }
    have.discard(None)
    done = skipped = 0
    for pt in all_points:
        if pt in have:
            skipped += 1
            continue
        try:
            req("POST", "/v1/subscriptionPrices", {
                "data": {
                    "type": "subscriptionPrices",
                    "relationships": {
                        "subscription": {
                            "data": {"type": "subscriptions", "id": ENTERPRISE_MONTHLY_ID},
                        },
                        "subscriptionPricePoint": {
                            "data": {"type": "subscriptionPricePoints", "id": pt},
                        },
                    },
                },
            })
            done += 1
        except RuntimeError as e:
            if "409" in str(e):
                skipped += 1
            else:
                raise
        time.sleep(0.12)
    print(f"  created {done}, skipped {skipped}")

    req("PATCH", f"/v1/subscriptions/{ENTERPRISE_MONTHLY_ID}", {
        "data": {
            "type": "subscriptions",
            "id": ENTERPRISE_MONTHLY_ID,
            "attributes": {"reviewNote": ENTERPRISE_REVIEW_NOTE},
        },
    })
    print("  reviewNote set")


def patch_description_and_notes() -> None:
    print("=== PATCH description + review notes ===")
    locs = req("GET", f"/v1/appStoreVersions/{VERSION_ID}/appStoreVersionLocalizations")
    en = next(l for l in locs["data"] if l["attributes"].get("locale") == "en-US")
    desc = en["attributes"]["description"]
    desc = desc.replace(
        "• Enterprise: $999 per month or $10,000 per year",
        "• Enterprise: $1,199.99 per month or $10,000 per year",
    )
    desc = desc.replace(
        "Enterprise: $999 per month",
        "Enterprise: $1,199.99 per month",
    )
    req("PATCH", f"/v1/appStoreVersionLocalizations/{en['id']}", {
        "data": {
            "type": "appStoreVersionLocalizations",
            "id": en["id"],
            "attributes": {
                "description": desc,
                "whatsNew": (
                    "Subscription plans are here. Choose Starter, Growth, or Enterprise "
                    "in Settings > View Plans. Prices match the App Store listing."
                ),
            },
        },
    })
    req("PATCH", f"/v1/appStoreReviewDetails/{REVIEW_DETAIL_ID}", {
        "data": {
            "type": "appStoreReviewDetails",
            "id": REVIEW_DETAIL_ID,
            "attributes": {"notes": REVIEW_NOTES},
        },
    })
    print("  done")


def add_items_to_submission(submission_id: str) -> None:
    print(f"=== ADD version + subscriptions to {submission_id} ===")
    # App Store version
    try:
        req("POST", "/v1/reviewSubmissionItems", {
            "data": {
                "type": "reviewSubmissionItems",
                "relationships": {
                    "reviewSubmission": {
                        "data": {"type": "reviewSubmissions", "id": submission_id},
                    },
                    "appStoreVersion": {
                        "data": {"type": "appStoreVersions", "id": VERSION_ID},
                    },
                },
            },
        })
        print("  added appStoreVersion")
    except Exception as e:
        print(f"  appStoreVersion: {e}")

    for sub_id, pid in {**MONTHLY_SUB_IDS, **ANNUAL_SUB_IDS}.items():
        try:
            req("POST", "/v1/reviewSubmissionItems", {
                "data": {
                    "type": "reviewSubmissionItems",
                    "relationships": {
                        "reviewSubmission": {
                            "data": {"type": "reviewSubmissions", "id": submission_id},
                        },
                        "subscription": {
                            "data": {"type": "subscriptions", "id": sub_id},
                        },
                    },
                },
            })
            print(f"  added {pid}")
        except Exception as e:
            print(f"  {pid}: {e}")


def submit_for_review(submission_id: str) -> None:
    print(f"=== SUBMIT {submission_id} ===")
    try:
        r = req("POST", f"/v1/reviewSubmissions/{submission_id}/submit")
        print("  result:", r)
    except Exception as e:
        # Some API versions use PATCH state
        try:
            r = req("PATCH", f"/v1/reviewSubmissions/{submission_id}", {
                "data": {
                    "type": "reviewSubmissions",
                    "id": submission_id,
                    "attributes": {"submitted": True},
                },
            })
            print("  patched submitted=true:", r.get("data", {}).get("attributes"))
        except Exception as e2:
            print(f"  submit failed: {e}\n  patch failed: {e2}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--status", action="store_true")
    ap.add_argument("--fix-metadata", action="store_true")
    ap.add_argument("--resubmit", action="store_true",
                    help="Attach version + all 6 subs to the READY_FOR_REVIEW submission and submit")
    args = ap.parse_args()

    if args.status or not (args.fix_metadata or args.resubmit):
        print_status()
        if not (args.fix_metadata or args.resubmit):
            return

    if args.fix_metadata:
        ensure_enterprise_price()
        patch_description_and_notes()
        print_status()

    if args.resubmit:
        add_items_to_submission(NEW_SUBMISSION_ID)
        submit_for_review(NEW_SUBMISSION_ID)
        print_status()


if __name__ == "__main__":
    main()
