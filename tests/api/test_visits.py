"""Visit API tests."""

import pytest
from uuid import uuid4
from datetime import datetime, timezone, timedelta


@pytest.fixture
def test_client_data(client, auth_headers):
    """Create a test client and return its data."""
    response = client.post(
        "/clients",
        json={"full_name": "Test Client for Visits"},
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def test_caregiver(seeded_db):
    """Get the seeded admin user as caregiver."""
    from app.models.user import User
    user = seeded_db.query(User).first()
    return {"id": str(user.id), "email": user.email}


class TestVisitCreate:
    """Tests for visit creation endpoint."""

    def test_create_visit_minimal(self, client, auth_headers, test_client_data, test_caregiver):
        """Test creating a visit with minimal required fields."""
        response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["client_id"] == test_client_data["id"]
        assert data["caregiver_id"] == test_caregiver["id"]
        assert data["status"] == "scheduled"
        assert data["pipeline_state"] == {}

    def test_create_visit_with_schedule(self, client, auth_headers, test_client_data, test_caregiver):
        """Test creating a visit with scheduled times."""
        now = datetime.now(timezone.utc)
        scheduled_start = now + timedelta(hours=1)
        scheduled_end = now + timedelta(hours=3)

        response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
                "scheduled_start": scheduled_start.isoformat(),
                "scheduled_end": scheduled_end.isoformat(),
                "admin_notes": "First visit with new client",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["admin_notes"] == "First visit with new client"

    def test_create_visit_invalid_client(self, client, auth_headers, test_caregiver):
        """Test creating a visit with non-existent client."""
        response = client.post(
            "/visits",
            json={
                "client_id": str(uuid4()),
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Client not found" in response.json()["detail"]

    def test_create_visit_invalid_caregiver(self, client, auth_headers, test_client_data):
        """Test creating a visit with non-existent caregiver."""
        response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": str(uuid4()),
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Caregiver not found" in response.json()["detail"]

    def test_create_visit_unauthorized(self, client, test_client_data, test_caregiver):
        """Test creating a visit without authentication."""
        response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
        )
        assert response.status_code == 401  # No auth = Unauthorized


class TestVisitList:
    """Tests for visit listing endpoint."""

    def test_list_visits_empty(self, client, auth_headers):
        """Test listing visits when none exist."""
        response = client.get("/visits", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_list_visits_with_data(self, client, auth_headers, test_client_data, test_caregiver):
        """Test listing visits after creating some."""
        # Create visits
        for i in range(3):
            client.post(
                "/visits",
                json={
                    "client_id": test_client_data["id"],
                    "caregiver_id": test_caregiver["id"],
                },
                headers=auth_headers,
            )

        response = client.get("/visits", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_list_visits_pagination(self, client, auth_headers, test_client_data, test_caregiver):
        """Test visit listing with pagination."""
        # Create 5 visits
        for _ in range(5):
            client.post(
                "/visits",
                json={
                    "client_id": test_client_data["id"],
                    "caregiver_id": test_caregiver["id"],
                },
                headers=auth_headers,
            )

        # Get first page with 2 items
        response = client.get("/visits?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["page_size"] == 2

    def test_list_visits_filter_by_status(self, client, auth_headers, test_client_data, test_caregiver):
        """Test filtering visits by status."""
        # Create a visit
        create_response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        visit_id = create_response.json()["id"]

        # Update its status
        client.put(
            f"/visits/{visit_id}",
            json={"status": "pending_review"},
            headers=auth_headers,
        )

        # Filter by status
        response = client.get("/visits?status=pending_review", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert all(v["status"] == "pending_review" for v in data["items"])


class TestVisitGet:
    """Tests for getting a single visit."""

    def test_get_visit(self, client, auth_headers, test_client_data, test_caregiver):
        """Test getting a specific visit."""
        # Create visit
        create_response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        visit_id = create_response.json()["id"]

        # Get visit
        response = client.get(f"/visits/{visit_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == visit_id
        assert data["client"]["id"] == test_client_data["id"]

    def test_get_visit_not_found(self, client, auth_headers):
        """Test getting a non-existent visit."""
        fake_id = str(uuid4())
        response = client.get(f"/visits/{fake_id}", headers=auth_headers)
        assert response.status_code == 404


class TestVisitUpdate:
    """Tests for visit update endpoint."""

    def test_update_visit_status(self, client, auth_headers, test_client_data, test_caregiver):
        """Test updating a visit's status."""
        # Create visit
        create_response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        visit_id = create_response.json()["id"]

        # Update status
        response = client.put(
            f"/visits/{visit_id}",
            json={"status": "in_progress"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"

    def test_update_visit_admin_notes(self, client, auth_headers, test_client_data, test_caregiver):
        """Test updating visit admin notes."""
        # Create visit
        create_response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        visit_id = create_response.json()["id"]

        # Update notes
        response = client.put(
            f"/visits/{visit_id}",
            json={"admin_notes": "Client was cooperative today"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["admin_notes"] == "Client was cooperative today"

    def test_update_visit_not_found(self, client, auth_headers):
        """Test updating a non-existent visit."""
        fake_id = str(uuid4())
        response = client.put(
            f"/visits/{fake_id}",
            json={"status": "approved"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestVisitDelete:
    """Tests for visit deletion endpoint."""

    def test_delete_visit(self, client, auth_headers, test_client_data, test_caregiver):
        """Test deleting a visit."""
        # Create visit
        create_response = client.post(
            "/visits",
            json={
                "client_id": test_client_data["id"],
                "caregiver_id": test_caregiver["id"],
            },
            headers=auth_headers,
        )
        visit_id = create_response.json()["id"]

        # Delete visit
        response = client.delete(f"/visits/{visit_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/visits/{visit_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_visit_not_found(self, client, auth_headers):
        """Test deleting a non-existent visit."""
        fake_id = str(uuid4())
        response = client.delete(f"/visits/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
