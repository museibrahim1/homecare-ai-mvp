"""Tests for Local Drive document uploads."""

from io import BytesIO
from unittest.mock import patch
from uuid import uuid4

import pytest

FAKE_PDF = b"%PDF-1.4\n% fake pdf content for testing\n"
FAKE_DOCX = b"PK\x03\x04fake docx content for testing"


@pytest.fixture
def mock_s3():
    store: dict[str, bytes] = {}

    def _upload(key, content, content_type=None):
        store[key] = content
        return key

    def _download(key):
        if key not in store:
            raise FileNotFoundError(key)
        return store[key]

    def _delete(key):
        store.pop(key, None)

    with patch("app.routers.local_documents.upload_file_to_s3", side_effect=_upload), patch(
        "app.routers.local_documents.download_file_from_s3", side_effect=_download
    ), patch("app.routers.local_documents.delete_file_from_s3", side_effect=_delete):
        yield store


class TestLocalDocuments:
    def test_list_empty(self, client, auth_headers, mock_s3):
        response = client.get("/documents/local", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["documents"] == []
        assert data["total"] == 0
        assert data["total_bytes"] == 0

    def test_upload_pdf(self, client, auth_headers, mock_s3):
        response = client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["format"] == "PDF"
        assert data["name"] == "policy-handbook"
        assert data["download_url"].startswith("/documents/local/")
        assert data["preview_url"] is not None

    def test_upload_docx(self, client, auth_headers, mock_s3):
        response = client.post(
            "/documents/local",
            files={
                "file": (
                    "onboarding.docx",
                    BytesIO(FAKE_DOCX),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["format"] == "DOCX"
        assert data["preview_url"] is None

    def test_reject_invalid_type(self, client, auth_headers, mock_s3):
        response = client.post(
            "/documents/local",
            files={"file": ("notes.txt", BytesIO(b"hello"), "text/plain")},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_reject_spoofed_pdf(self, client, auth_headers, mock_s3):
        response = client.post(
            "/documents/local",
            files={"file": ("bad.pdf", BytesIO(b"not a pdf"), "application/pdf")},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_list_after_upload(self, client, auth_headers, mock_s3):
        client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        )
        response = client.get("/documents/local", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["total_bytes"] > 0

    def test_download(self, client, auth_headers, mock_s3):
        upload = client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        ).json()
        doc_id = upload["id"]
        response = client.get(f"/documents/local/{doc_id}/download", headers=auth_headers)
        assert response.status_code == 200
        assert response.content.startswith(b"%PDF")

    def test_preview_pdf_inline(self, client, auth_headers, mock_s3):
        upload = client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        ).json()
        doc_id = upload["id"]
        response = client.get(f"/documents/local/{doc_id}/preview", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["content-disposition"].startswith("inline")
        assert response.content.startswith(b"%PDF")

    def test_preview_rejects_docx(self, client, auth_headers, mock_s3):
        upload = client.post(
            "/documents/local",
            files={
                "file": (
                    "onboarding.docx",
                    BytesIO(FAKE_DOCX),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            headers=auth_headers,
        ).json()
        doc_id = upload["id"]
        response = client.get(f"/documents/local/{doc_id}/preview", headers=auth_headers)
        assert response.status_code == 400

    def test_delete(self, client, auth_headers, mock_s3):
        upload = client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        ).json()
        doc_id = upload["id"]
        response = client.delete(f"/documents/local/{doc_id}", headers=auth_headers)
        assert response.status_code == 204
        listed = client.get("/documents/local", headers=auth_headers).json()
        assert listed["total"] == 0

    def test_unauthorized(self, client, mock_s3):
        response = client.get("/documents/local")
        assert response.status_code == 401

    def test_not_found(self, client, auth_headers, mock_s3):
        response = client.get(f"/documents/local/{uuid4()}/download", headers=auth_headers)
        assert response.status_code == 404

    def test_filter_by_type(self, client, auth_headers, mock_s3):
        client.post(
            "/documents/local",
            files={"file": ("policy-handbook.pdf", BytesIO(FAKE_PDF), "application/pdf")},
            headers=auth_headers,
        )
        client.post(
            "/documents/local",
            files={
                "file": (
                    "onboarding.docx",
                    BytesIO(FAKE_DOCX),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            headers=auth_headers,
        )
        pdf_only = client.get("/documents/local?file_type=PDF", headers=auth_headers).json()
        assert pdf_only["total"] == 1
        assert pdf_only["documents"][0]["format"] == "PDF"

    def test_existing_documents_endpoint_still_works(self, client, auth_headers):
        response = client.get("/documents", headers=auth_headers)
        assert response.status_code == 200
        assert "documents" in response.json()
