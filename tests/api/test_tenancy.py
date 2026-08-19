"""Agency tenancy: mixed-case emails, teammates, and isolation."""

from uuid import uuid4

from app.core.security import create_access_token, get_password_hash
from app.core.tenancy import find_user_by_email, visible_user_ids
from app.models.business import Business, BusinessUser
from app.models.client import Client
from app.models.user import User, UserRole
from app.routers.agency import _parse_extracted_json


def _auth_for(user: User) -> dict:
    token = create_access_token(data={"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _make_user(db, email: str, name: str = "Tester") -> User:
    user = User(
        email=email,
        hashed_password=get_password_hash("admin123"),
        full_name=name,
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestMixedCaseEmail:
    def test_find_user_prefers_account_with_clients(self, seeded_db):
        original = seeded_db.query(User).filter(User.email == "admin@palmtai.com").first()
        twin = _make_user(seeded_db, "Admin@Palmtai.com", "Twin")
        seeded_db.add(Client(full_name="Eleanor Whitfield", created_by=original.id))
        seeded_db.commit()

        found = find_user_by_email(seeded_db, "ADMIN@palmtai.com")
        assert found is not None
        assert found.id == original.id
        assert found.id != twin.id

    def test_duplicate_account_can_list_visits(self, client, seeded_db, auth_headers):
        original = seeded_db.query(User).filter(User.email == "admin@palmtai.com").first()
        twin = _make_user(seeded_db, "Admin@Palmtai.com", "Twin")

        created = client.post(
            "/clients",
            json={"full_name": "Eleanor Whitfield"},
            headers=auth_headers,
        )
        assert created.status_code == 201
        visit = client.post(
            "/visits",
            json={"client_id": created.json()["id"], "caregiver_id": str(original.id)},
            headers=auth_headers,
        )
        assert visit.status_code == 201

        listed = client.get("/visits", headers=_auth_for(twin))
        assert listed.status_code == 200
        assert listed.json()["total"] == 1
        assert listed.json()["items"][0]["id"] == visit.json()["id"]


class TestAgencyIsolation:
    def test_other_agency_cannot_see_clients_or_visits(self, client, seeded_db, auth_headers):
        outsider = _make_user(seeded_db, "outsider@other-agency.com", "Outsider")
        created = client.post(
            "/clients",
            json={"full_name": "Private Client"},
            headers=auth_headers,
        )
        assert created.status_code == 201
        visit = client.post(
            "/visits",
            json={
                "client_id": created.json()["id"],
                "caregiver_id": str(seeded_db.query(User).first().id),
            },
            headers=auth_headers,
        )
        assert visit.status_code == 201

        outsider_headers = _auth_for(outsider)
        clients = client.get("/clients", headers=outsider_headers)
        visits = client.get("/visits", headers=outsider_headers)
        assert clients.status_code == 200
        assert clients.json() == []
        assert visits.status_code == 200
        assert visits.json()["total"] == 0

        stolen = client.get(f"/visits/{visit.json()['id']}", headers=outsider_headers)
        assert stolen.status_code == 404

    def test_teammates_on_same_business_see_clients(self, client, seeded_db, auth_headers):
        owner = seeded_db.query(User).filter(User.email == "admin@palmtai.com").first()
        teammate = _make_user(seeded_db, "nurse@sunrise.com", "Nurse")
        biz = Business(
            name="Sunrise Home Care",
            state_of_incorporation="FL",
            email=f"biz-{uuid4()}@sunrise.com",
        )
        seeded_db.add(biz)
        seeded_db.flush()
        seeded_db.add(
            BusinessUser(
                business_id=biz.id,
                email=owner.email,
                full_name=owner.full_name,
                is_owner=True,
            )
        )
        seeded_db.add(
            BusinessUser(
                business_id=biz.id,
                email=teammate.email,
                full_name=teammate.full_name,
            )
        )
        seeded_db.commit()

        created = client.post(
            "/clients",
            json={"full_name": "Shared Client"},
            headers=auth_headers,
        )
        assert created.status_code == 201

        ids = visible_user_ids(seeded_db, teammate)
        assert owner.id in ids
        assert teammate.id in ids

        listed = client.get("/clients", headers=_auth_for(teammate))
        assert listed.status_code == 200
        names = [row["full_name"] for row in listed.json()]
        assert "Shared Client" in names


class TestAgencyPublicLeak:
    def test_public_requires_internal_key_and_user_id(self, client, monkeypatch):
        monkeypatch.setenv("INTERNAL_API_KEY", "test-internal-key")
        denied = client.get("/agency/public")
        assert denied.status_code == 401

        missing = client.get(
            "/agency/public",
            headers={"X-Internal-Key": "test-internal-key"},
        )
        assert missing.status_code == 400


class TestExtractParse:
    def test_parses_fenced_json(self):
        info = _parse_extracted_json(
            '```json\n{"name": "Sunrise Home Care", "city": "Tampa", "state": "FL"}\n```'
        )
        assert info.name == "Sunrise Home Care"
        assert info.city == "Tampa"
        assert info.state == "FL"

    def test_empty_payload_is_empty_model(self):
        info = _parse_extracted_json("")
        assert info.name is None
        assert info.address is None
