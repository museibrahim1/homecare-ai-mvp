from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import csv

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.billable_item import BillableItem
from app.models.note import Note
from app.models.contract import Contract
from app.services.document_generation import (
    generate_note_pdf, 
    generate_contract_pdf,
    generate_note_docx,
    generate_contract_docx
)

router = APIRouter()


@router.get("/visits/{visit_id}/timesheet.csv")
async def export_timesheet_csv(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export billable items as CSV timesheet."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    items = db.query(BillableItem).filter(
        BillableItem.visit_id == visit_id
    ).order_by(BillableItem.start_ms).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Visit ID",
        "Client",
        "Caregiver",
        "Category",
        "Code",
        "Start (ms)",
        "End (ms)",
        "Minutes",
        "Adjusted Minutes",
        "Approved",
        "Description",
    ])
    
    # Data rows
    for item in items:
        writer.writerow([
            str(visit_id),
            visit.client.full_name if visit.client else "",
            visit.caregiver.full_name if visit.caregiver else "",
            item.category,
            item.code,
            item.start_ms,
            item.end_ms,
            item.minutes,
            item.adjusted_minutes or item.minutes,
            "Yes" if item.is_approved else "No",
            item.description or "",
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=timesheet_{visit_id}.csv"},
    )


# ============ PDF EXPORTS (PRIMARY) ============

@router.get("/visits/{visit_id}/note.pdf")
async def export_note_pdf(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export visit note as PDF."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    note = db.query(Note).filter(Note.visit_id == visit_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    
    # Generate PDF
    pdf_bytes = generate_note_pdf(visit, note)
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=visit_note_{visit_id}.pdf"},
    )


@router.get("/visits/{visit_id}/contract.pdf")
async def export_contract_pdf(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export service contract as PDF."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    # Generate PDF
    pdf_bytes = generate_contract_pdf(visit.client, contract)
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contract_{contract.id}.pdf"},
    )


# ============ LEGACY DOCX EXPORTS ============

@router.get("/visits/{visit_id}/note.docx")
async def export_note_docx(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export visit note as DOCX (legacy format)."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    note = db.query(Note).filter(Note.visit_id == visit_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    
    # Generate DOCX
    docx_bytes = generate_note_docx(visit, note)
    
    return StreamingResponse(
        iter([docx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=visit_note_{visit_id}.docx"},
    )


@router.get("/visits/{visit_id}/contract.docx")
async def export_contract_docx(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export service contract as DOCX (legacy format)."""
    visit = db.query(Visit).filter(Visit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    # Generate DOCX
    docx_bytes = generate_contract_docx(visit.client, contract)
    
    return StreamingResponse(
        iter([docx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=contract_{contract.id}.docx"},
    )
