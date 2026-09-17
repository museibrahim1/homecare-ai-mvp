"""Shared Stripe configuration for the billing package."""

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
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "https://palmcareai.com/billing").strip()

if STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Self-serve web plans get the same 30-day free trial Apple IAP offers.
try:
    STRIPE_TRIAL_DAYS = max(0, int(os.getenv("STRIPE_TRIAL_DAYS", "30")))
except ValueError:
    STRIPE_TRIAL_DAYS = 30


def env_price_id(tier: str, billing_cycle: str) -> str | None:
    """
    Optional per-tier price override, e.g. STRIPE_PRICE_STARTER_MONTHLY.

    When unset, checkout falls back to the Plan row's stripe_price_id_* column
    and finally to inline price_data built from the Plan's own price, so a
    missing Stripe price can never block a subscription.
    """
    key = f"STRIPE_PRICE_{tier.upper()}_{billing_cycle.upper()}"
    return (os.getenv(key) or "").strip() or None
