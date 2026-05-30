import base64
import hashlib
import json
import logging
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.contract_template import ContractTemplate
from app.services.ocr_template_scanner import (
    extract_text,
    detect_fields_with_ai,
    build_field_mapping,
    reconcile_versions,
    compute_file_hash,
    DB_FIELD_REGISTRY,
)

from .common import GALLERY_DIR, _template_to_response
from .schemas import (
    FieldInfo, TemplateResponse, TemplateListItem,
    FieldMappingUpdate, ReconciliationReport, GalleryItem,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full template details including fields and mapping."""
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return _template_to_response(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a template."""
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()


@router.post("/{template_id}/rescan")
async def rescan_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run OCR and field detection on an existing template."""
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if not template.file_url:
        raise HTTPException(status_code=400, detail="No file stored for this template")

    if template.file_url.startswith("data:"):
        _, encoded = template.file_url.split(",", 1)
        file_bytes = base64.b64decode(encoded)
    else:
        raise HTTPException(status_code=400, detail="Cannot rescan: file not stored inline")

    content_type = "application/pdf" if template.file_type == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    filename = f"{template.name}.{template.file_type}"

    ocr_text = await extract_text(file_bytes, filename, content_type)
    detected_fields = await detect_fields_with_ai(ocr_text, filename)
    field_mapping, unmapped_fields = build_field_mapping(detected_fields)

    if unmapped_fields:
        try:
            from app.services.ocr_template_scanner import ai_auto_map_unmapped
            extra_mapping, unmapped_fields = await ai_auto_map_unmapped(unmapped_fields, field_mapping)
            field_mapping.update(extra_mapping)
        except Exception as e:
            logger.warning(f"AI auto-mapping on rescan failed: {e}")

    template.ocr_text = ocr_text
    template.detected_fields = detected_fields
    template.field_mapping = field_mapping
    template.unmapped_fields = unmapped_fields

    db.commit()
    db.refresh(template)

    return _template_to_response(template)


@router.put("/{template_id}/mapping")
async def update_field_mapping(
    template_id: UUID,
    updates: List[FieldMappingUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually update field mappings — map unmapped template fields to DB paths.
    """
    template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    mapping = dict(template.field_mapping or {})
    remaining_unmapped = list(template.unmapped_fields or [])

    for update in updates:
        mapping[update.field_id] = update.mapped_to
        remaining_unmapped = [
            f for f in remaining_unmapped if f.get("field_id") != update.field_id
        ]

    template.field_mapping = mapping
    template.unmapped_fields = remaining_unmapped

    db.commit()
    db.refresh(template)

    return _template_to_response(template)


@router.post("/{template_id}/reconcile/{old_template_id}", response_model=ReconciliationReport)
async def reconcile_template_versions(
    template_id: UUID,
    old_template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compare two template versions and report field differences.
    Shows what fields were added, removed, or unchanged between versions.
    """
    new_template = db.query(ContractTemplate).filter(
        ContractTemplate.id == template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    old_template = db.query(ContractTemplate).filter(
        ContractTemplate.id == old_template_id,
        ContractTemplate.owner_id == current_user.id,
    ).first()

    if not new_template or not old_template:
        raise HTTPException(status_code=404, detail="Template not found")

    report = reconcile_versions(
        old_template.detected_fields or [],
        new_template.detected_fields or [],
    )

    return ReconciliationReport(**report)


