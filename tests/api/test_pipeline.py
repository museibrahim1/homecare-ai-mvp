"""Pipeline API tests."""

import pytest
from unittest.mock import patch, MagicMock
from uuid import uuid4


@pytest.fixture
def test_client_data(client, auth_headers):
    """Create a test client."""
    response = client.post(
        "/clients",
        json={"full_name": "Pipeline Test Client"},
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
def test_visit_with_audio(client, auth_headers, test_visit, seeded_db):
    """Create a test visit with audio asset."""
    from app.models.audio_asset import AudioAsset
    from uuid import UUID

    # Add mock audio asset
    audio = AudioAsset(
        visit_id=UUID(test_visit["id"]),
        original_filename="test.wav",
        s3_key="test/test.wav",
        content_type="audio/wav",
        file_size_bytes=1024,
        duration_ms=60000,
    )
    seeded_db.add(audio)
    seeded_db.commit()

    return test_visit


class TestPipelineStatus:
    """Tests for pipeline status endpoint."""

    def test_get_pipeline_status(self, client, auth_headers, test_visit):
        """Test getting pipeline status for a visit."""
        response = client.get(
            f"/pipeline/visits/{test_visit['id']}/status",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["visit_id"] == test_visit["id"]
        assert data["status"] == "scheduled"
        assert data["pipeline_state"] == {}

    def test_get_pipeline_status_not_found(self, client, auth_headers):
        """Test getting status for non-existent visit."""
        fake_id = str(uuid4())
        response = client.get(
            f"/pipeline/visits/{fake_id}/status",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestTranscriptionPipeline:
    """Tests for transcription pipeline step."""

    def test_transcribe_no_audio(self, client, auth_headers, test_visit):
        """Test starting transcription without audio."""
        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/transcribe",
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "No audio uploaded" in response.json()["detail"]

    @patch("app.services.jobs.enqueue_task")
    def test_transcribe_with_audio(self, mock_enqueue, client, auth_headers, test_visit_with_audio):
        """Test starting transcription with audio."""
        mock_enqueue.return_value = "mock-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit_with_audio['id']}/transcribe",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "mock-task-id"
        mock_enqueue.assert_called_once_with("transcribe", visit_id=test_visit_with_audio["id"])

    def test_transcribe_not_found(self, client, auth_headers):
        """Test transcription for non-existent visit."""
        fake_id = str(uuid4())
        response = client.post(
            f"/pipeline/visits/{fake_id}/transcribe",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestDiarizationPipeline:
    """Tests for diarization pipeline step."""

    @patch("app.services.jobs.enqueue_task")
    def test_diarize(self, mock_enqueue, client, auth_headers, test_visit):
        """Test starting diarization."""
        mock_enqueue.return_value = "diar-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/diarize",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "diar-task-id"
        mock_enqueue.assert_called_once_with("diarize", visit_id=test_visit["id"])

    def test_diarize_not_found(self, client, auth_headers):
        """Test diarization for non-existent visit."""
        fake_id = str(uuid4())
        response = client.post(
            f"/pipeline/visits/{fake_id}/diarize",
            headers=auth_headers,
        )
        assert response.status_code == 404


class TestAlignmentPipeline:
    """Tests for alignment pipeline step."""

    @patch("app.services.jobs.enqueue_task")
    def test_align(self, mock_enqueue, client, auth_headers, test_visit):
        """Test starting alignment."""
        mock_enqueue.return_value = "align-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/align",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "align-task-id"
        mock_enqueue.assert_called_once_with("align", visit_id=test_visit["id"])


class TestBillingPipeline:
    """Tests for billing pipeline step."""

    @patch("app.services.jobs.enqueue_task")
    def test_bill(self, mock_enqueue, client, auth_headers, test_visit):
        """Test starting billing generation."""
        mock_enqueue.return_value = "bill-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/bill",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "bill-task-id"
        mock_enqueue.assert_called_once_with("bill", visit_id=test_visit["id"])


class TestNotePipeline:
    """Tests for note generation pipeline step."""

    @patch("app.services.jobs.enqueue_task")
    def test_generate_note(self, mock_enqueue, client, auth_headers, test_visit):
        """Test starting note generation."""
        mock_enqueue.return_value = "note-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/note",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "note-task-id"
        mock_enqueue.assert_called_once_with("generate_note", visit_id=test_visit["id"])


class TestContractPipeline:
    """Tests for contract generation pipeline step."""

    @patch("app.services.jobs.enqueue_task")
    def test_generate_contract(self, mock_enqueue, client, auth_headers, test_visit):
        """Test starting contract generation."""
        mock_enqueue.return_value = "contract-task-id"

        response = client.post(
            f"/pipeline/visits/{test_visit['id']}/contract",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "contract-task-id"
        mock_enqueue.assert_called_once_with("generate_contract", visit_id=test_visit["id"])


class TestPipelineStateTracking:
    """Tests for pipeline state tracking."""

    @patch("app.services.jobs.enqueue_task")
    def test_pipeline_state_updates(self, mock_enqueue, client, auth_headers, test_visit):
        """Test that pipeline state is updated after each step."""
        mock_enqueue.return_value = "test-task-id"

        # Run diarize step
        client.post(
            f"/pipeline/visits/{test_visit['id']}/diarize",
            headers=auth_headers,
        )

        # Check state
        response = client.get(
            f"/pipeline/visits/{test_visit['id']}/status",
            headers=auth_headers,
        )
        data = response.json()
        assert "diarization" in data["pipeline_state"]
        assert data["pipeline_state"]["diarization"]["status"] == "queued"
        assert data["pipeline_state"]["diarization"]["task_id"] == "test-task-id"

    @patch("app.services.jobs.enqueue_task")
    def test_multiple_pipeline_steps(self, mock_enqueue, client, auth_headers, test_visit):
        """Test running multiple pipeline steps."""
        mock_enqueue.side_effect = ["task-1", "task-2", "task-3"]

        # Run multiple steps
        client.post(f"/pipeline/visits/{test_visit['id']}/diarize", headers=auth_headers)
        client.post(f"/pipeline/visits/{test_visit['id']}/align", headers=auth_headers)
        client.post(f"/pipeline/visits/{test_visit['id']}/bill", headers=auth_headers)

        # Check all states
        response = client.get(
            f"/pipeline/visits/{test_visit['id']}/status",
            headers=auth_headers,
        )
        data = response.json()

        assert "diarization" in data["pipeline_state"]
        assert "alignment" in data["pipeline_state"]
        assert "billing" in data["pipeline_state"]
