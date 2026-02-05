"""
Documents API Router

Provides endpoints for fetching all documents (contracts, notes, audio files)
with proper data isolation.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.client import Client
from app.models.contract import Contract
from app.models.note import Note
from app.models.visit import Visit
from app.models.audio_asset import AudioAsset

router = APIRouter()


class DocumentItem(BaseModel):
    id: str
    name: str
    type: str  # contract, note, audio
    format: str  # PDF, DOCX, MP3, WAV, etc.
    size: Optional[str] = None
    folder: str  # Contracts, Assessments, Audio Files
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
    
    Returns contracts, notes, and audio files from assessments.
    """
    documents: List[DocumentItem] = []
    
    # Get user's clients
    user_clients = db.query(Client).filter(
        Client.created_by == current_user.id
    ).all()
    client_ids = [c.id for c in user_clients]
    client_map = {str(c.id): c.full_name for c in user_clients}
    
    # If filtering by specific client, verify ownership
    if client_id:
        if client_id not in client_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Client not found"
            )
        client_ids = [client_id]
    
    # 1. Get Contracts
    if not folder or folder.lower() == "contracts":
        contracts = db.query(Contract).filter(
            Contract.client_id.in_(client_ids)
        ).order_by(Contract.created_at.desc()).all()
        
        for contract in contracts:
            client_name = client_map.get(str(contract.client_id), "Unknown")
            doc_name = f"{client_name.replace(' ', '_')}_Contract.pdf"
            
            if search and search.lower() not in doc_name.lower() and search.lower() not in client_name.lower():
                continue
                
            documents.append(DocumentItem(
                id=f"contract_{contract.id}",
                name=doc_name,
                type="contract",
                format="PDF",
                size="-",
                folder="Contracts",
                client_id=str(contract.client_id),
                client_name=client_name,
                created_at=contract.created_at,
                download_url=f"/exports/clients/{contract.client_id}/contract.pdf"
            ))
    
    # 2. Get Visit Notes
    if not folder or folder.lower() == "assessments":
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
    if not folder or folder.lower() == "audio files":
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
    
    # Sort by created_at descending
    documents.sort(key=lambda x: x.created_at, reverse=True)
    
    # Calculate folder counts
    all_docs = documents  # Before pagination
    folder_counts = {
        "Contracts": len([d for d in all_docs if d.folder == "Contracts"]),
        "Assessments": len([d for d in all_docs if d.folder == "Assessments"]),
        "Audio Files": len([d for d in all_docs if d.folder == "Audio Files"]),
    }
    
    folders = [
        {"id": 1, "name": "Contracts", "count": folder_counts["Contracts"], "icon": "📄"},
        {"id": 2, "name": "Assessments", "count": folder_counts["Assessments"], "icon": "📝"},
        {"id": 3, "name": "Audio Files", "count": folder_counts["Audio Files"], "icon": "🎵"},
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
