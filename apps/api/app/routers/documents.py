"""
Documents API Router

Provides endpoints for fetching all documents (contracts, notes, care plans, audio files)
with proper data isolation.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.core.tenancy import iter_visible_client_ids, visible_user_ids
from app.models.user import User
from app.models.client import Client
from app.models.contract import Contract
from app.models.note import Note
from app.models.visit import Visit
from app.models.audio_asset import AudioAsset
from app.models.agency_settings import AgencySettings

router = APIRouter()


class DocumentItem(BaseModel):
    id: str
    name: str
    type: str  # contract, note, care_plan, audio
    format: str  # PDF, DOCX, MP3, WAV, etc.
    size: Optional[str] = None
    folder: str  # Contracts, Assessments, Care Plans, Audio Files
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    visit_id: Optional[str] = None
    created_at: datetime
    download_url: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentsResponse(BaseModel):
    documents: List[DocumentItem]
    total: int
    folders: List[dict]


def format_size(size_bytes: Optional[int]) -> str:
    """Format file size in human readable format."""
    if not size_bytes:
        return "-"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes // 1024} KB"
    else:
        return f"{size_bytes // (1024 * 1024)} MB"


@router.get("", response_model=DocumentsResponse)
async def get_all_documents(
    folder: Optional[str] = None,
    client_id: Optional[UUID] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all documents for the current user with data isolation.
    
    Returns contracts, notes, care plans, and audio files from assessments.
    """
    documents: List[DocumentItem] = []
    
    client_ids = list(iter_visible_client_ids(db, current_user))
    user_clients = (
        db.query(Client).filter(Client.id.in_(client_ids)).all()
        if client_ids else []
    )
    client_ids = [c.id for c in user_clients]
    client_map = {str(c.id): c.full_name for c in user_clients}
    client_obj_map = {str(c.id): c for c in user_clients}
    
    # If filtering by specific client, verify ownership
    if client_id:
        if client_id not in client_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        client_ids = [client_id]
    
    # 1. Get Contracts (PDF + DOCX)
    if client_ids and (not folder or folder.lower() == "contracts"):
        contracts = db.query(Contract).filter(
            Contract.client_id.in_(client_ids)
        ).order_by(Contract.created_at.desc()).all()
        
        # Map client -> latest visit for DOCX export links
        client_visit_map = {}
        if contracts:
            contract_client_ids = [c.client_id for c in contracts]
            client_visits = db.query(Visit).filter(
                Visit.client_id.in_(contract_client_ids)
            ).order_by(Visit.created_at.desc()).all()
            for v in client_visits:
                cid = str(v.client_id)
                if cid not in client_visit_map:
                    client_visit_map[cid] = str(v.id)
        
        for contract in contracts:
            client_name = client_map.get(str(contract.client_id), "Unknown")
            visit_id = client_visit_map.get(str(contract.client_id))
            
            if search and search.lower() not in client_name.lower():
                continue
            
            # PDF version
            documents.append(DocumentItem(
                id=f"contract_{contract.id}",
                name=f"{client_name.replace(' ', '_')}_Contract.pdf",
                type="contract",
                format="PDF",
                size="-",
                folder="Contracts",
                client_id=str(contract.client_id),
                client_name=client_name,
                visit_id=visit_id,
                created_at=contract.created_at,
                download_url=f"/exports/visits/{visit_id}/contract.pdf" if visit_id else None
            ))
            
            # DOCX version (editable)
            if visit_id:
                documents.append(DocumentItem(
                    id=f"contract_docx_{contract.id}",
                    name=f"{client_name.replace(' ', '_')}_Contract.docx",
                    type="contract",
                    format="DOCX",
                    size="-",
                    folder="Contracts",
                    client_id=str(contract.client_id),
                    client_name=client_name,
                    visit_id=visit_id,
                    created_at=contract.created_at,
                    download_url=f"/exports/visits/{visit_id}/contract.docx"
                ))
    
    # 2. Get Visit Notes
    if client_ids and (not folder or folder.lower() == "assessments"):
        visits = db.query(Visit).filter(
            Visit.client_id.in_(client_ids)
        ).all()
        
        visit_ids = [v.id for v in visits]
        visit_client_map = {str(v.id): (str(v.client_id), v.scheduled_start) for v in visits}
        
        notes = db.query(Note).filter(
            Note.visit_id.in_(visit_ids)
        ).order_by(Note.created_at.desc()).all()
        
        for note in notes:
            visit_info = visit_client_map.get(str(note.visit_id))
            if not visit_info:
                continue
            client_id_str, scheduled_date = visit_info
            client_name = client_map.get(client_id_str, "Unknown")
            
            date_str = scheduled_date.strftime("%Y%m%d") if scheduled_date else "undated"
            doc_name = f"{client_name.replace(' ', '_')}_Assessment_{date_str}.pdf"
            
            if search and search.lower() not in doc_name.lower() and search.lower() not in client_name.lower():
                continue
                
            documents.append(DocumentItem(
                id=f"note_{note.id}",
                name=doc_name,
                type="note",
                format="PDF",
                size="-",
                folder="Assessments",
                client_id=client_id_str,
                client_name=client_name,
                visit_id=str(note.visit_id),
                created_at=note.created_at,
                download_url=f"/exports/visits/{note.visit_id}/note.pdf"
            ))
    
    # 3. Get Audio Files
    if client_ids and (not folder or folder.lower() == "audio files"):
        visits = db.query(Visit).filter(
            Visit.client_id.in_(client_ids)
        ).all()
        
        visit_ids = [v.id for v in visits]
        visit_client_map = {str(v.id): (str(v.client_id), v.scheduled_start) for v in visits}
        
        audio_assets = db.query(AudioAsset).filter(
            AudioAsset.visit_id.in_(visit_ids)
        ).order_by(AudioAsset.created_at.desc()).all()
        
        for audio in audio_assets:
            visit_info = visit_client_map.get(str(audio.visit_id))
            if not visit_info:
                continue
            client_id_str, scheduled_date = visit_info
            client_name = client_map.get(client_id_str, "Unknown")
            
            # Use original filename or generate one
            if audio.original_filename:
                doc_name = audio.original_filename
            else:
                date_str = scheduled_date.strftime("%Y%m%d") if scheduled_date else "undated"
                doc_name = f"{client_name.replace(' ', '_')}_Recording_{date_str}.wav"
            
            if search and search.lower() not in doc_name.lower() and search.lower() not in client_name.lower():
                continue
            
            # Determine format from filename or content type
            ext = doc_name.split('.')[-1].upper() if '.' in doc_name else 'AUDIO'
            if audio.content_type:
                if 'mp3' in audio.content_type or 'mpeg' in audio.content_type:
                    ext = 'MP3'
                elif 'wav' in audio.content_type:
                    ext = 'WAV'
                elif 'm4a' in audio.content_type or 'mp4' in audio.content_type:
                    ext = 'M4A'
                    
            documents.append(DocumentItem(
                id=f"audio_{audio.id}",
                name=doc_name,
                type="audio",
                format=ext,
                size=format_size(audio.file_size_bytes),
                folder="Audio Files",
                client_id=client_id_str,
                client_name=client_name,
                visit_id=str(audio.visit_id),
                created_at=audio.created_at,
                download_url=f"/uploads/audio/{audio.id}/download"
            ))

    # 4. Care Plans (from client.care_plan and/or contract schedule goals)
    if not folder or folder.lower() in ("care plans", "care_plans"):
        # Latest visit per client for export links
        care_visit_map: dict = {}
        if client_ids:
            care_visits = db.query(Visit).filter(
                Visit.client_id.in_(client_ids)
            ).order_by(Visit.created_at.desc()).all()
            for v in care_visits:
                cid = str(v.client_id)
                if cid not in care_visit_map:
                    care_visit_map[cid] = v

        latest_contract_map: dict = {}
        if client_ids:
            all_contracts = db.query(Contract).filter(
                Contract.client_id.in_(client_ids)
            ).order_by(Contract.created_at.desc()).all()
            for c in all_contracts:
                cid = str(c.client_id)
                if cid not in latest_contract_map:
                    latest_contract_map[cid] = c

        for cid in [str(x) for x in client_ids]:
            client = client_obj_map.get(cid)
            if not client:
                continue
            client_name = client_map.get(cid, "Unknown")
            if search and search.lower() not in client_name.lower():
                continue

            plan_text = (client.care_plan or "").strip()
            contract = latest_contract_map.get(cid)
            schedule = (contract.schedule if contract else None) or {}
            goals = schedule.get("care_plan_goals") if isinstance(schedule, dict) else None
            has_goals = isinstance(goals, dict) and any(goals.values())
            has_services = bool(contract and contract.services)

            if not plan_text and not has_goals and not has_services:
                continue

            visit = care_visit_map.get(cid)
            visit_id = str(visit.id) if visit else None
            created = (
                (contract.created_at if contract else None)
                or (visit.created_at if visit else None)
                or getattr(client, "created_at", None)
                or datetime.now(timezone.utc)
            )

            documents.append(DocumentItem(
                id=f"care_plan_{cid}",
                name=f"{client_name.replace(' ', '_')}_Care_Plan.pdf",
                type="care_plan",
                format="PDF",
                size="-",
                folder="Care Plans",
                client_id=cid,
                client_name=client_name,
                visit_id=visit_id,
                created_at=created,
                download_url=(
                    f"/exports/visits/{visit_id}/care-plan.pdf" if visit_id else None
                ),
            ))
    
    # Agency uploads (Settings / Documents page). Metadata only.
    if not folder or folder.lower() in ("contracts", "uploads"):
        import json as _json
        settings_rows = (
            db.query(AgencySettings)
            .filter(AgencySettings.user_id.in_(visible_user_ids(db, current_user)))
            .all()
        )
        for settings in settings_rows:
            raw = getattr(settings, "documents", None)
            if not raw:
                continue
            try:
                uploaded = _json.loads(raw) if isinstance(raw, str) else raw
            except (TypeError, ValueError):
                continue
            if not isinstance(uploaded, list):
                continue
            for doc in uploaded:
                if not isinstance(doc, dict):
                    continue
                name = str(doc.get("name") or "Uploaded file")
                if search and search.lower() not in name.lower():
                    continue
                created_raw = doc.get("uploaded_at")
                try:
                    created = datetime.fromisoformat(str(created_raw).replace("Z", "+00:00"))
                except (TypeError, ValueError):
                    created = datetime.now(timezone.utc)
                ext = (name.rsplit(".", 1)[-1].upper() if "." in name else "FILE")
                documents.append(DocumentItem(
                    id=f"upload_{doc.get('id') or name}",
                    name=name,
                    type="uploaded",
                    format=ext,
                    size="-",
                    folder="Contracts",
                    created_at=created,
                ))

    # Sort by created_at descending
    documents.sort(key=lambda x: x.created_at, reverse=True)
    
    # Calculate folder counts
    all_docs = documents  # Before pagination
    folder_counts = {
        "Contracts": len([d for d in all_docs if d.folder == "Contracts"]),
        "Assessments": len([d for d in all_docs if d.folder == "Assessments"]),
        "Care Plans": len([d for d in all_docs if d.folder == "Care Plans"]),
        "Audio Files": len([d for d in all_docs if d.folder == "Audio Files"]),
    }
    
    folders = [
        {"id": 1, "name": "Contracts", "count": folder_counts["Contracts"], "icon": "📄"},
        {"id": 2, "name": "Assessments", "count": folder_counts["Assessments"], "icon": "📝"},
        {"id": 3, "name": "Care Plans", "count": folder_counts["Care Plans"], "icon": "📋"},
        {"id": 4, "name": "Audio Files", "count": folder_counts["Audio Files"], "icon": "🎵"},
    ]
    
    # Apply pagination
    total = len(documents)
    documents = documents[skip:skip + limit]
    
    return DocumentsResponse(
        documents=documents,
        total=total,
        folders=folders
    )


@router.get("/clients/{client_id}", response_model=DocumentsResponse)
async def get_client_documents(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all documents for a specific client (data isolation enforced)."""
    return await get_all_documents(
        client_id=client_id,
        db=db,
        current_user=current_user
    )
