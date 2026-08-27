"""Shared Stripe configuration and constants for the billing package."""

import os
import logging

logger = logging.getLogger(__name__)

# Check if Stripe is available
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    stripe = None
    STRIPE_AVAILABLE = False
    logger.warning("Stripe not installed")

# Initialize Stripe (strip whitespace/newlines from env vars to prevent auth errors)
STRIPE_SECRET_KEY = (os.getenv("STRIPE_SECRET_KEY") or "").strip() or None
STRIPE_WEBHOOK_SECRET = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip() or None
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "https://palmcareai.com/billing/success").strip()
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "https://palmcareai.com/pricing").strip()

if STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

EXTENDED_TRIAL_PRICE_ID = "price_1TCWKuKWCMHtsHgGNAxfEnZ0"

# Retention "save offer" shown before a user cancels. Create a coupon in Stripe
# (e.g. 50% off for 3 months) and set its ID here. If unset, the save offer is
# disabled and the cancel flow goes straight to the portal.
RETENTION_COUPON_ID = (os.getenv("STRIPE_RETENTION_COUPON_ID") or "").strip() or None
RETENTION_OFFER_HEADLINE = os.getenv("RETENTION_OFFER_HEADLINE", "Wait — here's 50% off your next 3 months").strip()
RETENTION_OFFER_SUBTEXT = os.getenv(
    "RETENTION_OFFER_SUBTEXT",
    "Stay with PalmCare AI and we'll cut your bill in half for the next 3 billing cycles. No commitment — cancel anytime.",
).strip()

STRIPE_PRICE_MAP = {
    "starter": {
        "product_id": "prod_UAs4awY6QzxE92",
        "monthly": "price_1TEeUOKWCMHtsHgGdC9QyOVw",
        "annual": "price_1TEeUOKWCMHtsHgGLQ0xfA16",
    },
    "growth": {
        "product_id": "prod_UD4dT6uH3PRpP7",
        "monthly": "price_1TEeUPKWCMHtsHgGRItaareG",
        "annual": "price_1TEeUQKWCMHtsHgGUZwZWFam",
    },
    "professional": {
        "product_id": "prod_UAs4POX9KcO3hY",
        "monthly": "price_1TEeUQKWCMHtsHgGHa6d1m8X",
        "annual": "price_1TEeUQKWCMHtsHgGswSSkIu7",
    },
    "enterprise": {
        "product_id": "prod_UAs4UIxSD3DhtQ",
        "monthly": None,
        "annual": None,
    },
}
