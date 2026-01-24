"""Authentication tests."""

import pytest
from fastapi.testclient import TestClient


def test_login_success(client: TestClient, seeded_db):
    """Test successful login."""
    response = client.post(
        "/auth/login",
        json={"email": "admin@homecare.ai", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client: TestClient):
    """Test login with invalid credentials."""
    response = client.post(
        "/auth/login",
        json={"email": "admin@homecare.ai", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_get_me(client: TestClient, auth_headers):
    """Test getting current user info."""
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@homecare.ai"
    assert data["role"] == "admin"


def test_get_me_unauthorized(client: TestClient):
    """Test getting current user without auth."""
    response = client.get("/auth/me")
    assert response.status_code == 403  # No authorization header
