"""Tests for notes and billing API endpoints."""

import pytest
from uuid import uuid4, UUID


@pytest.fixture
def test_client_data(client, auth_headers):
    """Create a test client."""
    response = client.post(
        "/clients",
        json={"full_name": "Notes Test Client"},
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def test_caregiver(seeded_db):
    """Get the seeded admin user as caregiver."""
    from app.models.user import User
    user = seeded_db.query(User).first()
    return {"id": str(user.id)}


@pytest.fixture
def test_visit(client, auth_headers, test_client_data, test_caregiver):
    """Create a test visit."""
    response = client.post(
        "/visits",
        json={
            "client_id": test_client_data["id"],
            "caregiver_id": test_caregiver["id"],
        },
        headers=auth_headers,
    )
    return response.json()


@pytest.fixture
def test_visit_with_note(client, auth_headers, test_visit, seeded_db):
    """Create a test visit with a note."""
    from app.models.note import Note

    note = Note(
        visit_id=UUID(test_visit["id"]),
        structured_data={
            "tasks_performed": ["medication reminder", "meal preparation"],
            "observations": "Client appeared in good spirits",
            "risks_concerns": "None noted",
            "client_condition": "stable",
        },
        narrative="Home care visit conducted. Services included medication reminders and meal preparation. Client was cooperative.",
        is_approved=False,
    )
    seeded_db.add(note)
    seeded_db.commit()

    return test_visit


@pytest.fixture
def test_visit_with_billables(client, auth_headers, test_visit, seeded_db):
    """Create a test visit with billable items."""
    from app.models.billable_item import BillableItem

    items = [
        BillableItem(
            visit_id=UUID(test_visit["id"]),
            code="MED_REMINDER",
            category="MED_REMINDER",
            description="Medication reminder",
            start_ms=0,
            end_ms=600000,
            minutes=10,
            evidence=[],
            is_approved=False,
            is_flagged=False,
        ),
        BillableItem(
            visit_id=UUID(test_visit["id"]),
            code="MEAL_PREP",
            category="MEAL_PREP",
            description="Meal preparation",
            start_ms=600000,
            end_ms=1800000,
            minutes=20,
            evidence=[],
            is_approved=False,
            is_flagged=False,
        ),
        BillableItem(
            visit_id=UUID(test_visit["id"]),
            code="COMPANIONSHIP",
            category="COMPANIONSHIP",
            description="Companionship and conversation",
            start_ms=1800000,
            end_ms=2400000,
            minutes=10,
            evidence=[],
            is_approved=False,
            is_flagged=True,
            flag_reason="Short duration",
        ),
    ]

    for item in items:
        seeded_db.add(item)
    seeded_db.commit()

    return test_visit


class TestNotesEndpoint:
    """Tests for notes API."""

    def test_get_note_no_note(self, client, auth_headers, test_visit):
        """Test getting note when none exists."""
        response = client.get(
            f"/visits/{test_visit['id']}/note",
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Generate note first" in response.json()["detail"]

    def test_get_note(self, client, auth_headers, test_visit_with_note):
        """Test getting existing note."""
        response = client.get(
            f"/visits/{test_visit_with_note['id']}/note",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "structured_data" in data
        assert data["structured_data"]["client_condition"] == "stable"
        assert "medication reminder" in data["structured_data"]["tasks_performed"]
        assert data["is_approved"] is False

    def test_get_note_visit_not_found(self, client, auth_headers):
        """Test getting note for non-existent visit."""
        fake_id = str(uuid4())
        response = client.get(
            f"/visits/{fake_id}/note",
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "Visit not found" in response.json()["detail"]

    def test_update_note_narrative(self, client, auth_headers, test_visit_with_note):
        """Test updating note narrative."""
        response = client.put(
            f"/visits/{test_visit_with_note['id']}/note",
            json={"narrative": "Updated narrative text for the visit."},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["narrative"] == "Updated narrative text for the visit."

    def test_approve_note(self, client, auth_headers, test_visit_with_note):
        """Test approving a note."""
        response = client.put(
            f"/visits/{test_visit_with_note['id']}/note",
            json={"is_approved": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_approved"] is True
        assert data["approved_by_id"] is not None

    def test_update_note_not_found(self, client, auth_headers, test_visit):
        """Test updating non-existent note."""
        response = client.put(
            f"/visits/{test_visit['id']}/note",
            json={"narrative": "Test"},
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestBillingEndpoint:
    """Tests for billing API."""

    def test_get_billables_empty(self, client, auth_headers, test_visit):
        """Test getting billables when none exist."""
        response = client.get(
            f"/visits/{test_visit['id']}/billables",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total_minutes"] == 0

    def test_get_billables(self, client, auth_headers, test_visit_with_billables):
        """Test getting billable items."""
        response = client.get(
            f"/visits/{test_visit_with_billables['id']}/billables",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total_minutes"] == 40  # 10 + 20 + 10
        assert "MED_REMINDER" in data["categories"]
        assert "MEAL_PREP" in data["categories"]

    def test_get_billables_visit_not_found(self, client, auth_headers):
        """Test getting billables for non-existent visit."""
        fake_id = str(uuid4())
        response = client.get(
            f"/visits/{fake_id}/billables",
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_get_billables_has_flagged_items(self, client, auth_headers, test_visit_with_billables):
        """Test that flagged items are included in response."""
        response = client.get(
            f"/visits/{test_visit_with_billables['id']}/billables",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        flagged = [item for item in data["items"] if item.get("is_flagged")]
        assert len(flagged) == 1
        assert flagged[0]["category"] == "COMPANIONSHIP"

    def test_update_billable_item(self, client, auth_headers, test_visit_with_billables, seeded_db):
        """Test updating a single billable item."""
        from app.models.billable_item import BillableItem

        # Get an item ID
        item = seeded_db.query(BillableItem).filter(
            BillableItem.visit_id == UUID(test_visit_with_billables["id"])
        ).first()

        response = client.put(
            f"/visits/{test_visit_with_billables['id']}/billables/{item.id}",
            json={
                "adjusted_minutes": 15,
                "adjustment_reason": "Extended duration based on review",
                "is_approved": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["adjusted_minutes"] == 15
        assert data["adjustment_reason"] == "Extended duration based on review"
        assert data["is_approved"] is True

    def test_update_billable_item_not_found(self, client, auth_headers, test_visit):
        """Test updating non-existent billable item."""
        fake_item_id = str(uuid4())
        response = client.put(
            f"/visits/{test_visit['id']}/billables/{fake_item_id}",
            json={"adjusted_minutes": 10},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_billables_total_adjusted_minutes(self, client, auth_headers, test_visit_with_billables, seeded_db):
        """Test that adjusted minutes are calculated correctly."""
        from app.models.billable_item import BillableItem

        # Update one item with adjusted minutes
        item = seeded_db.query(BillableItem).filter(
            BillableItem.visit_id == UUID(test_visit_with_billables["id"]),
            BillableItem.category == "MED_REMINDER",
        ).first()
        item.adjusted_minutes = 15
        seeded_db.commit()

        response = client.get(
            f"/visits/{test_visit_with_billables['id']}/billables",
            headers=auth_headers,
        )
        data = response.json()
        # Total adjusted: 15 (adjusted) + 20 (original) + 10 (original) = 45
        assert data["total_adjusted_minutes"] == 45


class TestBillingCategories:
    """Tests for billing category aggregation."""

    def test_categories_aggregation(self, client, auth_headers, test_visit_with_billables):
        """Test that categories are properly aggregated."""
        response = client.get(
            f"/visits/{test_visit_with_billables['id']}/billables",
            headers=auth_headers,
        )
        data = response.json()
        categories = data["categories"]
        assert categories["MED_REMINDER"] == 10
        assert categories["MEAL_PREP"] == 20
        assert categories["COMPANIONSHIP"] == 10
