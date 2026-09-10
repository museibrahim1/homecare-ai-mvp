"""Web Stripe billing: checkout, webhooks, and feature unlocking.

Covers the full money path the billing page depends on:
  * POST /billing/checkout builds a valid Stripe Checkout session even when
    no Stripe Price objects exist (inline price_data from the Plan row).
  * Checkout refuses users who could pay without anything unlocking
    (no business) and Apple-managed subscribers (double-billing).
  * checkout.session.completed activates the Subscription row, which is
    exactly what plan_access / visits gating read — so features unlock.
  * invoice.paid keeps trials as trials for $0 invoices and mints a local
    PalmCare invoice for real charges.
"""

import asyncio
import uuid
from datetime import datetime, timezone

import pytest

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.business import Business, BusinessUser
from app.models.subscription import (
    Invoice,
    Plan,
    PlanTier,
    Subscription,
    SubscriptionStatus,
)

import app.routers.stripe_billing.checkout as checkout_mod
import app.routers.stripe_billing.webhooks as webhooks_mod
from app.routers.stripe_billing.webhooks import (
    handle_checkout_completed,
    handle_invoice_paid,
)

PASSWORD = "Str0ngPassw0rd!"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _create_user(db, email: str) -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash(PASSWORD),
        full_name="Billing Tester",
        role=UserRole.user,
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user

def _create_business(db, email: str) -> Business:
    business = Business(
        name="Test Agency LLC",
        state_of_incorporation="FL",
        email=f"biz-{uuid.uuid4().hex[:8]}@example.com",
    )
    db.add(business)
    db.commit()
    db.add(BusinessUser(
        business_id=business.id,
        email=email,
        full_name="Billing Tester",
        is_owner=True,
    ))
    db.commit()
    return business

def _create_plan(db, tier=PlanTier.STARTER, monthly_price=199.99) -> Plan:
    plan = Plan(
        name="PalmCare Platform",
        tier=tier,
        monthly_price=monthly_price,
        max_users=999,
        max_clients=150,
        max_visits_per_month=30,
        max_storage_gb=250,
        is_active=True,
    )
    db.add(plan)
    db.commit()
    return plan

def _login(client, email: str) -> dict:
    res = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


class _FakeStripe:
    """Captures Customer.create / checkout.Session.create kwargs."""

    def __init__(self):
        fake = self
        self.customer_kwargs = None
        self.session_kwargs = None

        class error:  # matches stripe.error.StripeError usage
            class StripeError(Exception):
                pass

        class Customer:
            @staticmethod
            def create(**kwargs):
                fake.customer_kwargs = kwargs
                return type("C", (), {"id": "cus_test_123"})()

        class _Session:
            @staticmethod
            def create(**kwargs):
                fake.session_kwargs = kwargs
                return type(
                    "S", (), {"url": "https://checkout.stripe.com/c/pay/test", "id": "cs_test_123"}
                )()

        class checkout:
            Session = _Session

        self.error = error
        self.Customer = Customer
        self.checkout = checkout


@pytest.fixture
def stripe_configured(monkeypatch):
    fake = _FakeStripe()
    monkeypatch.setattr(checkout_mod, "stripe", fake)
    monkeypatch.setattr(checkout_mod, "STRIPE_AVAILABLE", True)
    monkeypatch.setattr(checkout_mod, "STRIPE_SECRET_KEY", "sk_test_x")
    return fake


# ---------------------------------------------------------------------------
# checkout endpoint
# ---------------------------------------------------------------------------

def test_checkout_503_when_stripe_not_configured(client, db_session, monkeypatch):
    monkeypatch.setattr(checkout_mod, "STRIPE_SECRET_KEY", None)
    email = "no-stripe@example.com"
    _create_user(db_session, email)
    _create_business(db_session, email)
    plan = _create_plan(db_session)

    res = client.post(
        "/billing/checkout",
        json={"plan_id": str(plan.id)},
        headers=_login(client, email),
    )
    assert res.status_code == 503

def test_checkout_requires_business(client, db_session, stripe_configured):
    email = "orphan@example.com"
    _create_user(db_session, email)
    plan = _create_plan(db_session)

    res = client.post(
        "/billing/checkout",
        json={"plan_id": str(plan.id)},
        headers=_login(client, email),
    )
    assert res.status_code == 400
    assert "agency" in res.json()["detail"].lower()

def test_checkout_uses_inline_price_data_with_trial(client, db_session, stripe_configured):
    """No Stripe Price configured anywhere -> inline price_data at the plan's
    own price, with the 30-day first-subscription trial."""
    email = "buyer@example.com"
    _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)  # no stripe_price_id_* set

    res = client.post(
        "/billing/checkout",
        json={"plan_id": str(plan.id), "billing_cycle": "monthly"},
        headers=_login(client, email),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["checkout_url"].startswith("https://checkout.stripe.com/")

    kwargs = stripe_configured.session_kwargs
    assert kwargs["mode"] == "subscription"
    item = kwargs["line_items"][0]
    assert "price_data" in item
    assert item["price_data"]["unit_amount"] == 19999  # $199.99 -> cents
    assert item["price_data"]["recurring"]["interval"] == "month"
    assert kwargs["subscription_data"]["trial_period_days"] == 30
    assert kwargs["metadata"]["business_id"] == str(business.id)
    assert kwargs["metadata"]["plan_id"] == str(plan.id)

def test_checkout_prefers_plan_price_id_and_skips_repeat_trial(client, db_session, stripe_configured):
    email = "returning@example.com"
    _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)
    plan.stripe_price_id_monthly = "price_configured_123"
    # A previous (cancelled) Stripe subscription exists: no second free trial.
    db_session.add(Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatus.CANCELLED,
        stripe_customer_id="cus_old",
        stripe_subscription_id="sub_old",
    ))
    db_session.commit()

    res = client.post(
        "/billing/checkout",
        json={"plan_id": str(plan.id)},
        headers=_login(client, email),
    )
    assert res.status_code == 200, res.text
    kwargs = stripe_configured.session_kwargs
    assert kwargs["line_items"][0] == {"price": "price_configured_123", "quantity": 1}
    assert "trial_period_days" not in kwargs["subscription_data"]
    # Existing Stripe customer is reused, not recreated.
    assert kwargs["customer"] == "cus_old"
    assert stripe_configured.customer_kwargs is None

def test_checkout_blocks_active_apple_subscribers(client, db_session, stripe_configured):
    email = "apple-user@example.com"
    _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)
    db_session.add(Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        stripe_customer_id="apple:1000000123456789",
    ))
    db_session.commit()

    res = client.post(
        "/billing/checkout",
        json={"plan_id": str(plan.id)},
        headers=_login(client, email),
    )
    assert res.status_code == 400
    assert "Apple" in res.json()["detail"]


# ---------------------------------------------------------------------------
# webhooks -> subscription activation -> feature unlock
# ---------------------------------------------------------------------------

def test_checkout_completed_unlocks_features(db_session):
    """The webhook writes the Subscription row that ALL feature gating reads."""
    email = "unlocked@example.com"
    user = _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)

    session_obj = {
        "metadata": {
            "plan_id": str(plan.id),
            "business_id": str(business.id),
            "billing_cycle": "monthly",
        },
        "customer": "cus_new_1",
        "subscription": "sub_new_1",
    }
    asyncio.run(handle_checkout_completed(session_obj, db_session))

    sub = db_session.query(Subscription).filter(
        Subscription.business_id == business.id
    ).one()
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.plan_id == plan.id
    assert sub.stripe_customer_id == "cus_new_1"
    assert sub.stripe_subscription_id == "sub_new_1"

    # Feature gates all read this row:
    from app.core.plan_access import resolve_user_tier, get_tier_limits, tier_has_web_platform
    from app.routers.visits import _get_user_subscription

    tier = resolve_user_tier(db_session, user)
    assert tier == "starter"
    assert tier_has_web_platform(tier)  # web CRM unlocked
    limits = get_tier_limits(db_session, user)
    assert limits["max_visits_per_month"] == 30
    assert limits["max_clients"] == 150
    gate = _get_user_subscription(db_session, user)
    assert gate["has_paid_plan"] is True
    assert gate["plan_name"] == "PalmCare Platform"

def test_zero_dollar_invoice_keeps_trial(db_session):
    email = "trialing@example.com"
    _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)
    db_session.add(Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL,
        stripe_customer_id="cus_trial_1",
        stripe_subscription_id="sub_trial_1",
    ))
    db_session.commit()

    asyncio.run(handle_invoice_paid(
        {"customer": "cus_trial_1", "amount_paid": 0, "currency": "usd", "id": "in_zero"},
        db_session,
    ))
    sub = db_session.query(Subscription).filter(
        Subscription.business_id == business.id
    ).one()
    assert sub.status == SubscriptionStatus.TRIAL
    assert db_session.query(Invoice).count() == 0

def test_paid_invoice_activates_and_mints_local_invoice(db_session):
    email = "paying@example.com"
    _create_user(db_session, email)
    business = _create_business(db_session, email)
    plan = _create_plan(db_session)
    db_session.add(Subscription(
        business_id=business.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL,
        stripe_customer_id="cus_pay_1",
        stripe_subscription_id="sub_pay_1",
        visits_this_month=12,
    ))
    db_session.commit()

    period_end = int(datetime(2026, 10, 10, tzinfo=timezone.utc).timestamp())
    asyncio.run(handle_invoice_paid(
        {
            "customer": "cus_pay_1",
            "amount_paid": 19999,
            "currency": "usd",
            "id": "in_real_charge_1",
            "lines": {"data": [{"period": {"start": period_end - 30 * 86400, "end": period_end}}]},
            "status_transitions": {"paid_at": period_end - 30 * 86400},
        },
        db_session,
    ))

    sub = db_session.query(Subscription).filter(
        Subscription.business_id == business.id
    ).one()
    assert sub.status == SubscriptionStatus.ACTIVE
    assert sub.visits_this_month == 0  # monthly usage reset
    assert sub.current_period_end is not None

    inv = db_session.query(Invoice).filter(
        Invoice.stripe_invoice_id == "in_real_charge_1"
    ).one()
    assert float(inv.amount) == 199.99
    assert inv.status == "paid"
    assert "Stripe" in (inv.description or "")

    # Idempotent: replaying the webhook does not duplicate the invoice.
    asyncio.run(handle_invoice_paid(
        {
            "customer": "cus_pay_1",
            "amount_paid": 19999,
            "currency": "usd",
            "id": "in_real_charge_1",
        },
        db_session,
    ))
    assert db_session.query(Invoice).filter(
        Invoice.stripe_invoice_id == "in_real_charge_1"
    ).count() == 1

def test_webhook_endpoint_503_when_unconfigured(client, monkeypatch):
    monkeypatch.setattr(webhooks_mod, "STRIPE_WEBHOOK_SECRET", None)
    res = client.post("/billing/webhook", json={"type": "invoice.paid"})
    assert res.status_code == 503
