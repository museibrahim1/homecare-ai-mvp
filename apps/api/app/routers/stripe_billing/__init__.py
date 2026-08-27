"""
Subscription package (mounted at /billing).

Apple In-App Purchase handles Mobile and in-app Platform (see apple_iap).
Stripe checkout + portal serve web Platform billing on desktop.
"""

from fastapi import APIRouter

from .common import STRIPE_PRICE_MAP  # re-exported for app.main / plans seed
from .plans import router as _plans_router
from .billing import router as _billing_router
from .checkout import router as _checkout_router
from .webhooks import router as _webhooks_router

router = APIRouter()
router.include_router(_plans_router)
router.include_router(_billing_router)
router.include_router(_checkout_router)
router.include_router(_webhooks_router)
