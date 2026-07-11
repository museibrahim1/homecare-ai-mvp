"""Set worldwide subscription prices via USA price point + equalizations.

Usage: python3.11 set_subscription_prices.py
Requires the higher price points grant (approved Jul 10, 2026).
"""
import sys
import time

sys.path.insert(0, "/Users/musaibrahim/Desktop/AI Voice Contracter/scripts/asc")
from asc_api import req, get_all

# subscription_id -> (name, target USA customerPrice)
TARGETS = {
    "6789515070": ("Enterprise Monthly", "1199.99"),
    "6789567091": ("Starter Annual", "1899.99"),
    "6789567272": ("Growth Annual", "6699.99"),
    "6789567377": ("Enterprise Annual", "10000.0"),
}


def find_usa_point(sub_id: str, price: str) -> str:
    pts = get_all(f"/v1/subscriptions/{sub_id}/pricePoints?filter[territory]=USA&limit=8000")
    for p in pts:
        if float(p["attributes"]["customerPrice"]) == float(price):
            return p["id"]
    raise SystemExit(f"No USA price point {price} for sub {sub_id}")


def create_price(sub_id: str, point_id: str) -> None:
    req("POST", "/v1/subscriptionPrices", {
        "data": {
            "type": "subscriptionPrices",
            "relationships": {
                "subscription": {"data": {"type": "subscriptions", "id": sub_id}},
                "subscriptionPricePoint": {"data": {"type": "subscriptionPricePoints", "id": point_id}},
            },
        }
    })


def existing_price_points(sub_id: str) -> set:
    prices = get_all(f"/v1/subscriptions/{sub_id}/prices?include=subscriptionPricePoint&limit=200")
    ids = set()
    for p in prices:
        rel = p.get("relationships", {}).get("subscriptionPricePoint", {}).get("data")
        if rel:
            ids.add(rel["id"])
    return ids


def main() -> None:
    for sub_id, (name, price) in TARGETS.items():
        print(f"=== {name} -> ${price} ===")
        usa_point = find_usa_point(sub_id, price)
        eqs = get_all(f"/v1/subscriptionPricePoints/{usa_point}/equalizations?limit=8000")
        all_points = [usa_point] + [e["id"] for e in eqs]
        print(f"  {len(all_points)} territory price points (USA + {len(eqs)} equalized)")
        have = existing_price_points(sub_id)
        done = 0
        skipped = 0
        for pt in all_points:
            if pt in have:
                skipped += 1
                continue
            for attempt in range(4):
                try:
                    create_price(sub_id, pt)
                    done += 1
                    break
                except RuntimeError as e:
                    if "429" in str(e):
                        time.sleep(75)
                        continue
                    if "409" in str(e) and "DUPLICATE" in str(e).upper():
                        skipped += 1
                        break
                    if attempt == 3:
                        print(f"  FAILED point {pt}: {e}")
                        break
                    time.sleep(4)
            if done and done % 40 == 0:
                print(f"  ...{done} created")
                time.sleep(2)
        print(f"  created {done}, skipped {skipped}")


if __name__ == "__main__":
    main()
