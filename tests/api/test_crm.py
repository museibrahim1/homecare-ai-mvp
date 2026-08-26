"""Tests for agency CRM endpoints."""
import pytest
from uuid import uuid4


@pytest.fixture
def auth_headers(client, seeded_db):
    login = client.post("/auth/login", json={"email": "admin@palmtai.com", "password": "admin123"})
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_lead(client, auth_headers):
    res = client.post(
        "/crm/leads",
        json={"name": "Jane Prospect", "email": "jane@example.com", "source": "Referral", "status": "new"},
        headers=auth_headers,
    )
    assert res.status_code == 201
    lead = res.json()
    assert lead["name"] == "Jane Prospect"
    assert lead["status"] == "new"

    listed = client.get("/crm/leads", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == lead["id"] for row in listed.json())


def test_convert_lead_creates_client(client, auth_headers):
    lead_res = client.post(
        "/crm/leads",
        json={"name": "Convert Me", "phone": "555-0100"},
        headers=auth_headers,
    )
    lead_id = lead_res.json()["id"]

    convert = client.post(
        f"/crm/leads/{lead_id}/convert",
        json={"care_level": "MODERATE", "estimated_monthly_value": 3200},
        headers=auth_headers,
    )
    assert convert.status_code == 200
    body = convert.json()
    assert body["converted_client_id"] is not None

    clients = client.get("/clients", headers=auth_headers)
    assert clients.status_code == 200
    assert any(c["full_name"] == "Convert Me" for c in clients.json())


def test_appointment_crud(client, auth_headers):
    create = client.post(
        "/crm/appointments",
        json={
            "title": "Intake call",
            "client_name": "Bob",
            "appointment_date": "2026-09-01",
            "appointment_time": "10:00",
            "duration_minutes": 60,
            "appointment_type": "assessment",
        },
        headers=auth_headers,
    )
    assert create.status_code == 201
    appt_id = create.json()["id"]

    listed = client.get("/crm/appointments", headers=auth_headers)
    assert listed.status_code == 200
    assert any(a["id"] == appt_id for a in listed.json())

    delete = client.delete(f"/crm/appointments/{appt_id}", headers=auth_headers)
    assert delete.status_code == 204
