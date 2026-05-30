"""
Stripe Billing package.

Handles Stripe checkout, webhooks, and subscription management.
Split out of a single 917-line stripe_billing.py:
  - common.py     Stripe SDK init, env config, STRIPE_PRICE_MAP, constants
  - schemas.py    Pydantic request/response models
  - plans.py      public plan listing, seeding, Stripe wiring
  - signup.py     public signup checkout (no auth)
  - billing.py    user-facing subscription/invoice endpoints
  - checkout.py   authenticated checkout + customer portal
  - webhooks.py   Stripe webhook handler + event processors
  - admin.py      admin Stripe-ID management + signup stats

`router` is re-exported so `from app.routers.stripe_billing import router`
(mounted at /billing) keeps working. `STRIPE_PRICE_MAP` is also re-exported
because app.main imports it directly.
"""

from fastapi import APIRouter

from .common import STRIPE_PRICE_MAP  # re-exported for app.main
from .plans import router as _plans_router
from .signup import router as _signup_router
from .billing import router as _billing_router
from .checkout import router as _checkout_router
from .webhooks import router as _webhooks_router
from .admin import router as _admin_router

router = APIRouter()
router.include_router(_plans_router)
router.include_router(_signup_router)
router.include_router(_billing_router)
router.include_router(_checkout_router)
router.include_router(_webhooks_router)
router.include_router(_admin_router)
