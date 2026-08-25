"""Fill agency-uploaded contract / assessment documents with visit data."""

from __future__ import annotations

import base64
import logging
from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.tenancy import visible_user_ids
from app.models.agency_settings import AgencySettings
from app.models.contract_template import ContractTemplate
from app.models.user import User
from app.services.document_generation.docx_templates import (
    generate_contract_from_uploaded_template,
)
from app.services.document_generation.docx_render import generate_contract_docx

logger = logging.getLogger(__name__)

DOC_KIND_CONTRACT = "contract"
DOC_KIND_ASSESSMENT = "assessment"
DOC_KIND_CARE_PLAN = "care_plan"


def get_active_document_template(
    db: Session,
    user: User,
    doc_kind: str = DOC_KIND_CONTRACT,
) -> Optional[ContractTemplate]:
    """Return the newest active uploaded document for this agency and kind."""
    owner_ids = visible_user_ids(db, user)
    return (
        db.query(ContractTemplate)
        .filter(
            ContractTemplate.owner_id.in_(owner_ids),
            ContractTemplate.is_active.is_(True),
            ContractTemplate.doc_kind == doc_kind,
        )
        .order_by(ContractTemplate.updated_at.desc())
        .first()
    )


def _decode_template_payload(file_url: str) -> tuple[bytes, str]:
    """Parse a data:...;base64,... file_url into raw bytes + media hint."""
    if not file_url:
        raise ValueError("Template has no file contents")
    if file_url.startswith("data:") and ";base64," in file_url:
        header, b64 = file_url.split(";base64,", 1)
        return base64.b64decode(b64), header
    return base64.b64decode(file_url), ""


def fill_agency_document(
    db: Session,
    user: User,
    client: Any,
    contract: Any,
    *,
    doc_kind: str = DOC_KIND_CONTRACT,
    template_id: Optional[UUID] = None,
    fallback_builtin: bool = True,
) -> bytes:
    """
    Fill the agency's uploaded DOCX (replicating their layout) with visit data.

    Falls back to the built-in PALM contract DOCX only when no usable upload
    exists and fallback_builtin is True.
    """
    template: Optional[ContractTemplate] = None
    if template_id:
        owner_ids = visible_user_ids(db, user)
        template = (
            db.query(ContractTemplate)
            .filter(
                ContractTemplate.id == template_id,
                ContractTemplate.owner_id.in_(owner_ids),
            )
            .first()
        )
    if template is None:
        template = get_active_document_template(db, user, doc_kind=doc_kind)

    agency = (
        db.query(AgencySettings)
        .filter(AgencySettings.user_id.in_(visible_user_ids(db, user)))
        .order_by(AgencySettings.updated_at.desc())
        .first()
    )

    if template and template.file_url and template.file_type == "docx":
        try:
            raw, _ = _decode_template_payload(template.file_url)
            b64 = base64.b64encode(raw).decode()
            return generate_contract_from_uploaded_template(
                client,
                contract,
                b64,
                agency_settings=agency,
                field_mapping=template.field_mapping or {},
            )
        except Exception as exc:
            logger.warning(
                "Failed to fill uploaded %s template %s: %s",
                doc_kind,
                getattr(template, "id", None),
                exc,
            )

    if fallback_builtin and doc_kind == DOC_KIND_CONTRACT:
        return generate_contract_docx(client, contract)

    raise ValueError(
        f"No fillable {doc_kind} document uploaded. "
        "Upload a Word (.docx) copy of your form in Settings → Documents."
    )
