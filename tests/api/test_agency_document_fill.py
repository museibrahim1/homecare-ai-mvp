"""Uploaded agency documents are filled in place (not replaced by PALM boilerplate)."""

import base64
import io
from unittest.mock import MagicMock, patch
from uuid import uuid4

from docx import Document

from app.services.agency_document_fill import (
    DOC_KIND_CONTRACT,
    fill_agency_document,
)


def _minimal_docx_bytes(text: str = "Agency: {agency_name}\nClient: {client_name}") -> bytes:
    doc = Document()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_fill_agency_document_uses_uploaded_docx():
    user = MagicMock()
    user.id = uuid4()
    user.email = "owner@agency.com"

    raw = _minimal_docx_bytes()
    template = MagicMock()
    template.id = uuid4()
    template.file_type = "docx"
    template.file_url = f"data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,{base64.b64encode(raw).decode()}"
    template.field_mapping = {"agency_name": "agency.name", "client_name": "client.full_name"}
    template.doc_kind = DOC_KIND_CONTRACT

    client = MagicMock()
    client.full_name = "Eleanor Whitfield"
    contract = MagicMock()

    class _Q:
        def filter(self, *a, **k):
            return self

        def order_by(self, *a, **k):
            return self

        def first(self):
            return template

        def all(self):
            return [user]

    class _DB:
        def query(self, model):
            return _Q()

    with patch(
        "app.services.agency_document_fill.generate_contract_from_uploaded_template",
        return_value=b"FILLED-DOCX",
    ) as fill_mock, patch(
        "app.services.agency_document_fill.generate_contract_docx",
        return_value=b"BUILTIN",
    ) as builtin_mock:
        out = fill_agency_document(
            _DB(),
            user,
            client,
            contract,
            doc_kind=DOC_KIND_CONTRACT,
            fallback_builtin=True,
        )

    assert out == b"FILLED-DOCX"
    fill_mock.assert_called_once()
    builtin_mock.assert_not_called()
    kwargs = fill_mock.call_args.kwargs
    assert kwargs.get("field_mapping") == template.field_mapping


def test_fill_agency_document_falls_back_when_no_upload():
    user = MagicMock()
    user.id = uuid4()
    user.email = "owner@agency.com"

    class _Q:
        def filter(self, *a, **k):
            return self

        def order_by(self, *a, **k):
            return self

        def first(self):
            return None

        def all(self):
            return [user]

    class _DB:
        def query(self, model):
            return _Q()

    with patch(
        "app.services.agency_document_fill.generate_contract_docx",
        return_value=b"BUILTIN",
    ) as builtin_mock:
        out = fill_agency_document(
            _DB(),
            user,
            MagicMock(),
            MagicMock(),
            doc_kind=DOC_KIND_CONTRACT,
            fallback_builtin=True,
        )

    assert out == b"BUILTIN"
    builtin_mock.assert_called_once()
