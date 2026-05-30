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
