"""Local Drive: agency-scoped PDF/DOCX uploads stored in S3."""

from __future__ import annotations

import io
import os
import re
import uuid
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.core.tenancy import visible_user_ids
from app.models.local_document import LocalDocument
from app.models.user import User
from app.routers.documents import format_size
from app.services.audit import log_action
from app.services.storage import delete_file_from_s3, download_file_from_s3, upload_file_to_s3

router = APIRouter()

MAX_LOCAL_FILE_BYTES = 25 * 1024 * 1024  # 25 MB

ALLOWED_CONTENT_TYPES = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


class LocalDocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    format: str
    size: str
    content_type: str
    uploaded_by: Optional[str] = None
    created_at: datetime
    download_url: str
    preview_url: Optional[str] = None


class LocalDocumentsResponse(BaseModel):
    documents: list[LocalDocumentItem]
    total: int
    total_bytes: int


def _sanitize_filename(filename: str) -> str:
    safe = os.path.basename(filename or "document")
    safe = re.sub(r"[^\w\s\-\.]", "_", safe).strip()[:200]
    return safe or "document"


def _display_name(filename: str) -> str:
    base = os.path.basename(filename)
    if "." in base:
        return base.rsplit(".", 1)[0].replace("_", " ")
    return base


def _resolve_content_type(file: UploadFile) -> tuple[str, str]:
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are allowed.",
        )

    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type in ALLOWED_CONTENT_TYPES:
        return content_type, ALLOWED_CONTENT_TYPES[content_type]

    fallback = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }[ext]
    return fallback, ALLOWED_CONTENT_TYPES[fallback]


def _validate_magic_bytes(content: bytes, content_type: str) -> None:
    if len(content) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty or invalid.",
        )
    if content_type == "application/pdf":
        if not content.startswith(b"%PDF"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file does not look like a valid PDF.",
            )
        return
    if content_type.endswith("wordprocessingml.document"):
        if content[:2] != b"PK":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file does not look like a valid DOCX.",
            )


def _get_owned_document(
    db: Session,
    document_id: UUID,
    current_user: User,
) -> LocalDocument:
    doc = (
        db.query(LocalDocument)
        .filter(
            LocalDocument.id == document_id,
            LocalDocument.user_id.in_(visible_user_ids(db, current_user)),
        )
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


def _to_item(doc: LocalDocument) -> LocalDocumentItem:
    fmt = ALLOWED_CONTENT_TYPES.get(doc.content_type, "FILE")
    preview_url = f"/documents/local/{doc.id}/preview" if fmt == "PDF" else None
    return LocalDocumentItem(
        id=str(doc.id),
        name=doc.name,
        format=fmt,
        size=format_size(doc.file_size_bytes),
        content_type=doc.content_type,
        uploaded_by=doc.uploaded_by_name,
        created_at=doc.created_at,
        download_url=f"/documents/local/{doc.id}/download",
        preview_url=preview_url,
    )


@router.get("", response_model=LocalDocumentsResponse)
async def list_local_documents(
    search: Optional[str] = None,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(LocalDocument).filter(
        LocalDocument.user_id.in_(visible_user_ids(db, current_user))
    )
    rows = query.order_by(LocalDocument.created_at.desc()).all()

    if search:
        needle = search.lower()
        rows = [r for r in rows if needle in r.name.lower() or needle in r.original_filename.lower()]

    if file_type:
        wanted = file_type.upper()
        rows = [
            r for r in rows
            if ALLOWED_CONTENT_TYPES.get(r.content_type, "").upper() == wanted
        ]

    total_bytes = sum(r.file_size_bytes for r in rows)
    return LocalDocumentsResponse(
        documents=[_to_item(r) for r in rows],
        total=len(rows),
        total_bytes=total_bytes,
    )


@router.post("", response_model=LocalDocumentItem, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def upload_local_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content_type, _fmt = _resolve_content_type(file)
    content = await file.read()
    if len(content) > MAX_LOCAL_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 25 MB.",
        )
    _validate_magic_bytes(content, content_type)

    original_filename = _sanitize_filename(file.filename or "document")
    doc_id = uuid.uuid4()
    s3_key = f"local-documents/{current_user.id}/{doc_id}_{original_filename}"

    try:
        upload_file_to_s3(s3_key, content, content_type)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file. Please try again.",
        )

    doc = LocalDocument(
        id=doc_id,
        user_id=current_user.id,
        name=_display_name(original_filename),
        original_filename=original_filename,
        content_type=content_type,
        file_size_bytes=len(content),
        s3_key=s3_key,
        uploaded_by_name=current_user.full_name or current_user.email,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_action(db, current_user.id, "local_document_uploaded", "local_document", doc.id)
    return _to_item(doc)


@router.get("/{document_id}/download")
async def download_local_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    try:
        content = download_file_from_s3(doc.s3_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file. Please try again.",
        )

    safe_filename = "".join(
        c for c in doc.original_filename if c.isprintable() and c not in '"\\;'
    ) or f"document_{document_id}"

    return StreamingResponse(
        io.BytesIO(content),
        media_type=doc.content_type,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'},
    )


@router.get("/{document_id}/preview")
async def preview_local_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    if doc.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preview is only available for PDF files.",
        )

    try:
        content = download_file_from_s3(doc.s3_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load preview. Please try again.",
        )

    safe_filename = "".join(
        c for c in doc.original_filename if c.isprintable() and c not in '"\\;'
    ) or f"document_{document_id}.pdf"

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{safe_filename}"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_local_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    try:
        delete_file_from_s3(doc.s3_key)
    except Exception:
        pass

    db.delete(doc)
    db.commit()
    log_action(db, current_user.id, "local_document_deleted", "local_document", document_id)
    return None
