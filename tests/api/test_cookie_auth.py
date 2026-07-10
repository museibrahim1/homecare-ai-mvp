"""Tests for the httpOnly session-cookie auth flow (web clients).

The web app authenticates with a `palm_session` httpOnly cookie set at login,
while iOS keeps using the Authorization: Bearer header. Both must work, and
the cookie must be cleared on logout.
"""

from app.core.cookies import SESSION_COOKIE_NAME


def _login(client):
    response = client.post(
        "/auth/login",
        json={"email": "admin@palmtai.com", "password": "admin123"},
    )
    assert response.status_code == 200, response.json()
    return response


class TestSessionCookie:
    def test_login_sets_httponly_cookie(self, client, seeded_db):
        response = _login(client)
        set_cookie = response.headers.get("set-cookie", "")
        assert SESSION_COOKIE_NAME in set_cookie
        assert "HttpOnly" in set_cookie
        assert "SameSite=lax" in set_cookie or "samesite=lax" in set_cookie.lower()

    def test_cookie_alone_authenticates(self, client, seeded_db):
        _login(client)
        # TestClient keeps cookies; drop any Authorization header entirely.
        response = client.get("/auth/me")
        assert response.status_code == 200
        assert response.json()["email"] == "admin@palmtai.com"

    def test_bearer_header_still_works_without_cookie(self, client, seeded_db):
        token = _login(client).json()["access_token"]
        client.cookies.clear()
        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200

    def test_invalid_bearer_falls_back_to_cookie(self, client, seeded_db):
        # The web client sends a placeholder Authorization header after a page
        # refresh; the API must fall through to the valid session cookie.
        _login(client)
        response = client.get(
            "/auth/me", headers={"Authorization": "Bearer cookie-session"}
        )
        assert response.status_code == 200

    def test_no_credentials_rejected(self, client, seeded_db):
        client.cookies.clear()
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_garbage_cookie_rejected(self, client, seeded_db):
        client.cookies.set(SESSION_COOKIE_NAME, "not-a-jwt")
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_logout_clears_cookie(self, client, seeded_db):
        _login(client)
        response = client.post("/auth/logout")
        assert response.status_code == 200
        set_cookie = response.headers.get("set-cookie", "")
        # delete_cookie emits the cookie name with an immediate expiry
        assert SESSION_COOKIE_NAME in set_cookie
        assert 'Max-Age=0' in set_cookie or "expires" in set_cookie.lower()

    def test_session_clear_endpoint_unauthenticated(self, client, seeded_db):
        client.cookies.clear()
        response = client.post("/auth/session/clear")
        assert response.status_code == 200
        set_cookie = response.headers.get("set-cookie", "")
        assert SESSION_COOKIE_NAME in set_cookie
