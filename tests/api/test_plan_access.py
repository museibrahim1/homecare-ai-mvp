"""Plan gating for the web CRM.

Every /crm route sits behind require_web_platform, so a tier that resolves to
"free" by mistake locks a paying agency out of leads, appointments, and the
care tracker.
"""

from app.core.plan_access import get_tier_limits, resolve_user_tier
from app.core.security import create_access_token, get_password_hash
from app.core.tenancy import resolve_business_id
from app.models.business import Business, BusinessUser
from app.models.subscription import Plan, PlanTier, Subscription, SubscriptionStatus
from app.models.user import User, UserRole


def _auth_for(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(data={'sub': str(user.id)})}"}


def _plan(db, tier=PlanTier.STARTER, max_clients=150, max_visits=30) -> Plan:
    plan = Plan(
        name=f"PalmCare {tier.value}",
        tier=tier,
        is_active=True,
        max_clients=max_clients,
        max_visits_per_month=max_visits,
    )
    db.add(plan)
    db.commit()
    return plan


def _agency(
    db,
    agency_name: str,
    business_email: str,
    *,
    plan: Plan | None = None,
    status=SubscriptionStatus.ACTIVE,
) -> Business:
    business = Business(
        name=agency_name,
        entity_type="llc",
        state_of_incorporation="NE",
        address="1 Main St",
        city="Omaha",
        state="NE",
        zip_code="68101",
        phone="",
        email=business_email,
        verification_status="approved",
    )
    db.add(business)
    db.flush()
    db.add(
        BusinessUser(
            business_id=business.id,
            email=business_email,
            full_name="Owner",
            password_hash=get_password_hash("Testpass123!"),
            role="owner",
            is_owner=True,
        )
    )
    if plan is not None:
        db.add(Subscription(business_id=business.id, plan_id=plan.id, status=status))
    db.commit()
    return business


def _user(db, email: str, *, company_name: str | None = None, name: str = "Agency Owner") -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("Testpass123!"),
        full_name=name,
        company_name=company_name,
        role=UserRole.user,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _subscribed_agency(db, agency_name: str, owner_email: str, plan: Plan) -> User:
    """Business + business_users + the owner's users row, as signup creates them."""
    _agency(db, agency_name, owner_email, plan=plan)
    return _user(db, owner_email, company_name=agency_name)


class TestTierResolution:
    def test_owner_gets_the_agency_plan_tier(self, db_session):
        plan = _plan(db_session)
        owner = _subscribed_agency(db_session, "Sunrise Home Care", "owner@sunrise.test", plan)

        assert resolve_user_tier(db_session, owner) == "starter"

    def test_mixed_case_email_still_finds_the_subscription(self, db_session):
        """business_users stores lowercase; a users row may not."""
        plan = _plan(db_session)
        _agency(db_session, "Bluebird Care", "owner@bluebird.test", plan=plan)
        owner = _user(db_session, "Owner@Bluebird.Test")

        assert resolve_user_tier(db_session, owner) == "starter"

    def test_invited_teammate_inherits_the_agency_plan(self, db_session):
        """Team invites create a users row with no business_users row."""
        plan = _plan(db_session)
        _subscribed_agency(db_session, "Cedar Care", "owner@cedar.test", plan)
        teammate = _user(db_session, "nurse@cedar.test", company_name="Cedar Care", name="Nurse")

        assert resolve_business_id(db_session, teammate) is not None
        assert resolve_user_tier(db_session, teammate) == "starter"

    def test_account_without_a_subscription_is_free(self, db_session):
        _agency(db_session, "Maple Care", "owner@maple.test")
        owner = _user(db_session, "owner@maple.test", company_name="Maple Care")

        assert resolve_user_tier(db_session, owner) == "free"

    def test_cancelled_subscription_is_free(self, db_session):
        plan = _plan(db_session)
        _agency(
            db_session,
            "Willow Care",
            "owner@willow.test",
            plan=plan,
            status=SubscriptionStatus.CANCELLED,
        )
        owner = _user(db_session, "owner@willow.test", company_name="Willow Care")

        assert resolve_user_tier(db_session, owner) == "free"

    def test_teammate_gets_the_plan_limits_not_the_free_defaults(self, db_session):
        plan = _plan(db_session, max_clients=150, max_visits=30)
        _subscribed_agency(db_session, "Aspen Care", "owner@aspen.test", plan)
        teammate = _user(db_session, "aide@aspen.test", company_name="Aspen Care", name="Aide")

        limits = get_tier_limits(db_session, teammate)
        assert limits["tier"] == "starter"
        assert limits["max_clients"] == 150
        assert limits["max_visits_per_month"] == 30

    def test_no_agency_at_all_is_free(self, db_session):
        solo = _user(db_session, "solo@nowhere.test")

        assert resolve_business_id(db_session, solo) is None
        assert resolve_user_tier(db_session, solo) == "free"

    def test_business_name_alone_does_not_grant_a_plan(self, db_session):
        """No teammate to hop through means no plan, even on an exact name match.

        Signup rejects a company_name another account holds, so the only way to
        end up here is an agency no user claims. Matching it would hand a
        stranger someone else's subscription.
        """
        plan = _plan(db_session)
        _agency(db_session, "Orphan Care", "owner@orphan.test", plan=plan)
        outsider = _user(db_session, "stranger@elsewhere.test", company_name="Orphan Care")

        assert resolve_business_id(db_session, outsider) is None
        assert resolve_user_tier(db_session, outsider) == "free"


class TestCrmPlanGate:
    def test_subscribed_agency_can_save_a_lead(self, client, db_session):
        plan = _plan(db_session)
        owner = _subscribed_agency(db_session, "Sunrise Home Care", "owner@sunrise.test", plan)

        res = client.post(
            "/crm/leads",
            json={
                "name": "Haji Salad",
                "email": "haji@example.com",
                "phone": "4025550100",
                "source": "Website",
                "status": "new",
                "insurance_type": "medicaid",
            },
            headers=_auth_for(owner),
        )
        assert res.status_code == 201, res.text
        assert res.json()["name"] == "Haji Salad"

    def test_teammate_of_a_subscribed_agency_can_save_a_lead(self, client, db_session):
        plan = _plan(db_session)
        _subscribed_agency(db_session, "Cedar Care", "owner@cedar.test", plan)
        teammate = _user(db_session, "nurse@cedar.test", company_name="Cedar Care", name="Nurse")

        res = client.post(
            "/crm/leads",
            json={"name": "Referred Prospect", "source": "Referral"},
            headers=_auth_for(teammate),
        )
        assert res.status_code == 201, res.text

    def test_account_without_a_plan_is_told_why(self, client, db_session):
        _agency(db_session, "Maple Care", "owner@maple.test")
        owner = _user(db_session, "owner@maple.test", company_name="Maple Care")

        res = client.post(
            "/crm/leads",
            json={"name": "Haji Salad"},
            headers=_auth_for(owner),
        )
        assert res.status_code == 403
        # The web app renders this detail verbatim, so it has to say what to do.
        assert "subscription" in res.json()["detail"].lower()
