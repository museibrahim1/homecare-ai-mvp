"""Business team invite: seats, roles, email normalize, temp password."""

from unittest.mock import patch

from app.core.security import create_access_token, get_password_hash
from app.models.user import User


def _auth_for(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _owner(db, email: str = "owner@patron.test", company: str = "Patron Senior Living") -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("OwnerPass123!"),
        full_name="Agency Owner",
        role="user",
        is_active=True,
        company_name=company,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestTeamInvite:
    def test_invite_creates_user_and_returns_temp_password(self, client, db_session):
        owner = _owner(db_session)
        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = True
            with patch("app.routers.business_auth.team.get_email_service") as mock_email:
                mock_email.return_value.send_email.return_value = {"success": True}
                mock_email.return_value.from_welcome = "welcome@palmcareai.com"

                res = client.post(
                    "/auth/business/team/invite",
                    params={
                        "email": "Arbay@patronseniorliving.com",
                        "full_name": "Arbay Hassani",
                        "role": "user",
                    },
                    headers=_auth_for(owner),
                )

        assert res.status_code == 200, res.text
        data = res.json()
        assert data["email"] == "arbay@patronseniorliving.com"
        assert data["role"] == "user"
        assert data["temp_password"]
        assert data["email_sent"] is True

        invited = (
            db_session.query(User)
            .filter(User.email == "arbay@patronseniorliving.com")
            .first()
        )
        assert invited is not None
        assert invited.company_name == owner.company_name
        assert invited.temp_password is True
        assert invited.invited_by == str(owner.id)

    def test_invite_rejects_platform_admin_role(self, client, db_session):
        owner = _owner(db_session, email="owner2@patron.test")
        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = True
            res = client.post(
                "/auth/business/team/invite",
                params={
                    "email": "new@patron.test",
                    "full_name": "Bad Role",
                    "role": "admin",
                },
                headers=_auth_for(owner),
            )
        assert res.status_code == 400
        assert "caregiver" in res.json()["detail"]

    def test_invite_duplicate_email_is_400_not_500(self, client, db_session):
        owner = _owner(db_session, email="owner3@patron.test")
        db_session.add(
            User(
                email="existing@patron.test",
                hashed_password=get_password_hash("x"),
                full_name="Existing",
                role="caregiver",
                is_active=True,
                company_name=owner.company_name,
            )
        )
        db_session.commit()

        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = True
            res = client.post(
                "/auth/business/team/invite",
                params={
                    "email": "Existing@patron.test",
                    "full_name": "Dup",
                    "role": "caregiver",
                },
                headers=_auth_for(owner),
            )
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"].lower()

    def test_caregiver_cannot_invite(self, client, db_session):
        caregiver = User(
            email="cg@patron.test",
            hashed_password=get_password_hash("x"),
            full_name="Care Giver",
            role="caregiver",
            is_active=True,
            company_name="Patron Senior Living",
        )
        db_session.add(caregiver)
        db_session.commit()
        db_session.refresh(caregiver)

        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = True
            res = client.post(
                "/auth/business/team/invite",
                params={
                    "email": "other@patron.test",
                    "full_name": "Other",
                    "role": "user",
                },
                headers=_auth_for(caregiver),
            )
        assert res.status_code == 403

    def test_free_tier_allows_one_teammate_beyond_owner(self, client, db_session):
        """Free/Mobile floor is owner + 1 teammate (max_users >= 2)."""
        owner = _owner(db_session, email="owner4@patron.test", company="Seat Floor Agency")
        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = False
            with patch("app.routers.business_auth.team.get_email_service") as mock_email:
                mock_email.return_value.send_email.return_value = {"success": True}
                mock_email.return_value.from_welcome = "welcome@palmcareai.com"

                first = client.post(
                    "/auth/business/team/invite",
                    params={
                        "email": "teammate@patron.test",
                        "full_name": "First Teammate",
                        "role": "user",
                    },
                    headers=_auth_for(owner),
                )
                assert first.status_code == 200, first.text

                second = client.post(
                    "/auth/business/team/invite",
                    params={
                        "email": "third@patron.test",
                        "full_name": "Third Person",
                        "role": "user",
                    },
                    headers=_auth_for(owner),
                )
        assert second.status_code == 403
        assert "Team limit reached" in second.json()["detail"]

    def test_team_limits_report_min_two_seats(self, client, db_session):
        owner = _owner(db_session, email="owner5@patron.test", company="Limits Agency")
        with patch("app.routers.business_auth.team.settings") as mock_settings:
            mock_settings.beta_free_access = False
            res = client.get(
                "/auth/business/team/limits",
                headers=_auth_for(owner),
            )
        assert res.status_code == 200
        data = res.json()
        assert data["max_users"] >= 2
        assert data["can_invite"] is True
        assert data["remaining_seats"] >= 1
