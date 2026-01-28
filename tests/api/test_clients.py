"""Client API tests."""

import pytest
from uuid import uuid4
from datetime import date


class TestClientCreate:
    """Tests for client creation endpoint."""

    def test_create_client_minimal(self, client, auth_headers):
        """Test creating a client with minimal required fields."""
        response = client.post(
            "/clients",
            json={"full_name": "John Smith"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "John Smith"
        assert "id" in data
        assert data["phone"] is None

    def test_create_client_full(self, client, auth_headers):
        """Test creating a client with all fields."""
        payload = {
            "full_name": "Jane Doe",
            "date_of_birth": "1945-06-15",
            "phone": "555-123-4567",
            "address": "123 Main St, Anytown, USA 12345",
            "emergency_contact_name": "Bob Doe",
            "emergency_contact_phone": "555-987-6543",
            "medical_notes": "Diabetes, requires insulin",
            "care_plan": "Daily assistance with ADLs",
        }
        response = client.post("/clients", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "Jane Doe"
        assert data["phone"] == "555-123-4567"
        assert data["emergency_contact_name"] == "Bob Doe"

    def test_create_client_unauthorized(self, client):
        """Test creating a client without authentication."""
        response = client.post(
            "/clients",
            json={"full_name": "Test Client"},
        )
        assert response.status_code == 401  # No auth = Unauthorized


class TestClientList:
    """Tests for client listing endpoint."""

    def test_list_clients_empty(self, client, auth_headers):
        """Test listing clients when none exist."""
        response = client.get("/clients", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_list_clients_with_data(self, client, auth_headers):
        """Test listing clients after creating some."""
        # Create clients
        client.post("/clients", json={"full_name": "Client A"}, headers=auth_headers)
        client.post("/clients", json={"full_name": "Client B"}, headers=auth_headers)

        response = client.get("/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = [c["full_name"] for c in data]
        assert "Client A" in names
        assert "Client B" in names

    def test_list_clients_pagination(self, client, auth_headers):
        """Test client listing with pagination."""
        # Create 5 clients
        for i in range(5):
            client.post("/clients", json={"full_name": f"Client {i}"}, headers=auth_headers)

        # Get first 2
        response = client.get("/clients?skip=0&limit=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2


class TestClientGet:
    """Tests for getting a single client."""

    def test_get_client(self, client, auth_headers):
        """Test getting a specific client."""
        # Create client
        create_response = client.post(
            "/clients",
            json={"full_name": "Test Client"},
            headers=auth_headers,
        )
        client_id = create_response.json()["id"]

        # Get client
        response = client.get(f"/clients/{client_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["full_name"] == "Test Client"

    def test_get_client_not_found(self, client, auth_headers):
        """Test getting a non-existent client."""
        fake_id = str(uuid4())
        response = client.get(f"/clients/{fake_id}", headers=auth_headers)
        assert response.status_code == 404


class TestClientUpdate:
    """Tests for client update endpoint."""

    def test_update_client(self, client, auth_headers):
        """Test updating a client."""
        # Create client
        create_response = client.post(
            "/clients",
            json={"full_name": "Original Name"},
            headers=auth_headers,
        )
        client_id = create_response.json()["id"]

        # Update client
        response = client.put(
            f"/clients/{client_id}",
            json={"full_name": "Updated Name", "phone": "555-0000"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["phone"] == "555-0000"

    def test_update_client_partial(self, client, auth_headers):
        """Test partial update of a client."""
        # Create client with multiple fields
        create_response = client.post(
            "/clients",
            json={
                "full_name": "Test Client",
                "phone": "555-1111",
                "address": "123 Test St",
            },
            headers=auth_headers,
        )
        client_id = create_response.json()["id"]

        # Update only phone
        response = client.put(
            f"/clients/{client_id}",
            json={"phone": "555-2222"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "555-2222"
        assert data["address"] == "123 Test St"  # Unchanged

    def test_update_client_not_found(self, client, auth_headers):
        """Test updating a non-existent client."""
        fake_id = str(uuid4())
        response = client.put(
            f"/clients/{fake_id}",
            json={"full_name": "Test"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestClientDelete:
    """Tests for client deletion endpoint."""

    def test_delete_client(self, client, auth_headers):
        """Test deleting a client."""
        # Create client
        create_response = client.post(
            "/clients",
            json={"full_name": "To Be Deleted"},
            headers=auth_headers,
        )
        client_id = create_response.json()["id"]

        # Delete client
        response = client.delete(f"/clients/{client_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/clients/{client_id}", headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_client_not_found(self, client, auth_headers):
        """Test deleting a non-existent client."""
        fake_id = str(uuid4())
        response = client.delete(f"/clients/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
