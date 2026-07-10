"""Authorization tests for the /admin/scheduler surface.

The scheduler router exposes the platform's internal team tooling (scheduled
demos, goals, marketing assets) and the confidential sales-lead / investor CRM
autocomplete. It must be staff-only: a regular tenant user (a home-care agency
customer or caregiver) must not be able to read or mutate any of it.
"""

import pytest

from app.core.security import get_password_hash
from app.models.user import User, UserRole


@pytest.fixture
def tenant_headers(client, seeded_db):
    """A normal (non-admin) tenant user — the kind who signs up for the app."""
    user = User(
        email="agency-owner@example.com",
        hashed_password=get_password_hash("tenantpass123"),
        full_name="Agency Owner",
        role=UserRole.user,
        is_active=True,
    )
    seeded_db.add(user)
    seeded_db.commit()
    resp = client.post(
        "/auth/login",
        json={"email": "agency-owner@example.com", "password": "tenantpass123"},
    )
    assert resp.status_code == 200, resp.json()
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


SCHEDULER_READS = [
    "/admin/scheduler/crm-search?q=acme",
    "/admin/scheduler/demos",
    "/admin/scheduler/marketing-assets",
]


class TestSchedulerAuthorization:
    @pytest.mark.parametrize("path", SCHEDULER_READS)
    def test_tenant_user_forbidden(self, client, tenant_headers, path):
        # A normal tenant user must be blocked from the internal CRM / tooling.
        resp = client.get(path, headers=tenant_headers)
        assert resp.status_code == 403, (
            f"{path} should be 403 for a tenant user, got {resp.status_code}"
        )

    @pytest.mark.parametrize("path", SCHEDULER_READS)
    def test_unauthenticated_rejected(self, client, path):
        client.cookies.clear()
        resp = client.get(path)
        assert resp.status_code in (401, 403)

    def test_ceo_admin_allowed(self, client, auth_headers):
        # The seeded admin@palmtai.com CEO passes require_permission.
        resp = client.get("/admin/scheduler/marketing-assets", headers=auth_headers)
        assert resp.status_code == 200
