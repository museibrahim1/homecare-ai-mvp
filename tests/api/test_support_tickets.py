"""Tests for the user-facing support ticket endpoints."""


def _create_ticket(client, auth_headers, **overrides):
    payload = {
        "subject": "App crashed during recording",
        "description": "I tapped stop and the app closed itself. iPhone 15, latest build.",
        "category": "bug_report",
        "app_version": "1.0",
        "platform": "iOS 26",
    }
    payload.update(overrides)
    return client.post("/support/tickets", json=payload, headers=auth_headers)


def test_create_ticket(client, auth_headers):
    resp = _create_ticket(client, auth_headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["ticket_number"].startswith("PALM-")
    assert data["status"] == "open"
    assert data["category"] == "bug_report"
    assert "Submitted from: iOS 26 1.0" in data["description"]


def test_create_ticket_requires_auth(client, seeded_db):
    resp = _create_ticket(client, {})
    assert resp.status_code == 401


def test_create_ticket_validates_input(client, auth_headers):
    resp = _create_ticket(client, auth_headers, subject="ab")
    assert resp.status_code == 422
    resp = _create_ticket(client, auth_headers, description="short")
    assert resp.status_code == 422


def test_unknown_category_falls_back_to_general(client, auth_headers):
    resp = _create_ticket(client, auth_headers, category="nonsense")
    assert resp.status_code == 201
    assert resp.json()["category"] == "general"


def test_list_and_get_my_tickets(client, auth_headers):
    created = _create_ticket(client, auth_headers).json()

    listing = client.get("/support/tickets", headers=auth_headers)
    assert listing.status_code == 200
    tickets = listing.json()
    assert len(tickets) == 1
    assert tickets[0]["ticket_number"] == created["ticket_number"]

    detail = client.get(f"/support/tickets/{created['id']}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["subject"] == created["subject"]


def test_reply_to_ticket(client, auth_headers):
    created = _create_ticket(client, auth_headers).json()

    resp = client.post(
        f"/support/tickets/{created['id']}/replies",
        json={"message": "Also happens on my iPad."},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["replies"]) == 1
    assert data["replies"][0]["message"] == "Also happens on my iPad."
    assert data["replies"][0]["from_support"] is False


def test_cannot_see_others_tickets(client, auth_headers, db_session):
    from app.core.security import get_password_hash
    from app.models.user import User

    other = User(
        email="other@palmtai.com",
        hashed_password=get_password_hash("other1234"),
        full_name="Other User",
        is_active=True,
    )
    db_session.add(other)
    db_session.commit()

    created = _create_ticket(client, auth_headers).json()

    login = client.post("/auth/login", json={"email": "other@palmtai.com", "password": "other1234"})
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert client.get("/support/tickets", headers=other_headers).json() == []
    detail = client.get(f"/support/tickets/{created['id']}", headers=other_headers)
    assert detail.status_code == 404
