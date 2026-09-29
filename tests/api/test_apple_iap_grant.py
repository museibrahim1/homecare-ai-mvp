"""Apple IAP verification has to write a Subscription the rest of the app sees.

The endpoint used to read `business_id` off the User model, which has no such
column, so every purchase was rejected with 400 and no Subscription row was
ever created. Downstream that made every real customer resolve to the "free"
tier, which blocks the whole web CRM.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.plan_access import resolve_user_tier
from app.core.security import create_access_token, get_password_hash
from app.models.business import Business, BusinessUser
from app.models.subscription import Plan, PlanTier, Subscription
from app.models.user import User, UserRole
from app.routers import apple_iap

PRODUCT_ID = "com.palmcareai.app.starter.monthly"


def _auth_for(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


@pytest.fixture
def fake_apple_transaction(monkeypatch):
    """Stand in for Apple's JWS so the test exercises our own logic only."""
    expires = datetime.now(timezone.utc) + timedelta(days=30)
    monkeypatch.setattr(
        apple_iap,
        "_verify_signed_transaction",
        lambda _payload: {
            "bundleId": apple_iap.APPLE_BUNDLE_ID,
            "productId": PRODUCT_ID,
            "transactionId": "2000000900000001",
            "originalTransactionId": "2000000900000001",
            "expiresDate": int(expires.timestamp() * 1000),
            "price": 199990,
            "currency": "USD",
        },
    )
    return expires


@pytest.fixture
def platform_plan(db_session) -> Plan:
    plan = Plan(
        name="PalmCare Platform",
        tier=PlanTier.STARTER,
        is_active=True,
        max_clients=150,
        max_visits_per_month=30,
    )
    db_session.add(plan)
    db_session.commit()
    return plan


def _agency_owner(db_session, agency_name: str, email: str) -> User:
    business = Business(
        name=agency_name,
        entity_type="llc",
        state_of_incorporation="NE",
        address="1 Main St",
        city="Omaha",
        state="NE",
        zip_code="68101",
        phone="",
        email=email,
        verification_status="approved",
    )
    db_session.add(business)
    db_session.flush()
    db_session.add(
        BusinessUser(
            business_id=business.id,
            email=email,
            full_name="Owner",
            password_hash=get_password_hash("Testpass123!"),
            role="owner",
            is_owner=True,
        )
    )
    owner = User(
        email=email,
        hashed_password=get_password_hash("Testpass123!"),
        full_name="Owner",
        company_name=agency_name,
        role=UserRole.user,
        is_active=True,
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)
    return owner


def test_verify_grants_the_subscription(client, db_session, platform_plan, fake_apple_transaction):
    owner = _agency_owner(db_session, "Sunrise Home Care", "owner@sunrise.test")

    res = client.post(
        "/billing/apple/verify",
        json={"signed_transaction": "stub.jws.payload", "product_id": PRODUCT_ID},
        headers=_auth_for(owner),
    )
    assert res.status_code == 200, res.text
    assert res.json()["plan_tier"] == "starter"

    sub = db_session.query(Subscription).filter(Subscription.plan_id == platform_plan.id).first()
    assert sub is not None
    assert resolve_user_tier(db_session, owner) == "starter"


def test_verify_then_saving_a_lead_works(client, db_session, platform_plan, fake_apple_transaction):
    """The path a real customer takes: subscribe on iPhone, then use the web CRM."""
    owner = _agency_owner(db_session, "Cedar Care", "owner@cedar.test")
    headers = _auth_for(owner)

    blocked = client.post("/crm/leads", json={"name": "Haji Salad"}, headers=headers)
    assert blocked.status_code == 403

    verified = client.post(
        "/billing/apple/verify",
        json={"signed_transaction": "stub.jws.payload", "product_id": PRODUCT_ID},
        headers=headers,
    )
    assert verified.status_code == 200, verified.text

    saved = client.post("/crm/leads", json={"name": "Haji Salad"}, headers=headers)
    assert saved.status_code == 201, saved.text


def test_verify_rejects_an_account_with_no_agency(client, db_session, platform_plan, fake_apple_transaction):
    orphan = User(
        email="solo@nowhere.test",
        hashed_password=get_password_hash("Testpass123!"),
        full_name="Solo",
        role=UserRole.user,
        is_active=True,
    )
    db_session.add(orphan)
    db_session.commit()
    db_session.refresh(orphan)

    res = client.post(
        "/billing/apple/verify",
        json={"signed_transaction": "stub.jws.payload", "product_id": PRODUCT_ID},
        headers=_auth_for(orphan),
    )
    assert res.status_code == 400
    assert "business" in res.json()["detail"].lower()
