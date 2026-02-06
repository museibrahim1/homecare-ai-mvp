from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import io
import csv
import base64

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.client import Client
from app.models.billable_item import BillableItem
from app.models.note import Note
from app.models.contract import Contract
from app.models.agency_settings import AgencySettings
from app.services.document_generation import (
    generate_note_pdf, 
    generate_contract_pdf,
    generate_note_docx,
    generate_contract_docx,
    generate_contract_from_uploaded_template,
)
from app.services.email import get_email_service


class EmailContractRequest(BaseModel):
    recipient_email: str
    recipient_name: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    cc_email: Optional[str] = None

router = APIRouter()


def get_user_visit(db: Session, visit_id: UUID, current_user: User) -> Visit:
    """Helper to get a visit with data isolation enforced."""
    visit = db.query(Visit).join(Client, Visit.client_id == Client.id).filter(
        Visit.id == visit_id,
        Client.created_by == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


@router.get("/template-status")
async def get_template_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if a contract template is uploaded and ready to use (data isolation enforced)."""
    import json
    
    # First check for user-specific settings
    agency_settings = db.query(AgencySettings).filter(
        AgencySettings.user_id == current_user.id
    ).first()
    
    # Fall back to default only if needed for template lookup
    if not agency_settings:
        agency_settings = db.query(AgencySettings).filter(
            AgencySettings.settings_key == "default",
            AgencySettings.user_id == None
        ).first()
    
    result = {
        "has_settings": agency_settings is not None,
        "has_template": False,
        "template_name": None,
        "template_type": None,
        "documents_count": 0,
        "documents": []
    }
    
    if agency_settings:
        # Check documents array
        if agency_settings.documents:
            try:
                documents = json.loads(agency_settings.documents) if isinstance(agency_settings.documents, str) else agency_settings.documents
                result["documents_count"] = len(documents)
                result["documents"] = [
                    {"name": d.get("name"), "category": d.get("category"), "has_content": bool(d.get("content"))}
                    for d in documents
                ]
                
                for doc in documents:
                    if doc.get('category') == 'contract_template' and doc.get('content'):
                        result["has_template"] = True
                        result["template_name"] = doc.get("name")
                        result["template_type"] = doc.get("type")
                        break
            except Exception as e:
                result["error"] = str(e)
        
        # Check legacy field
        if not result["has_template"] and agency_settings.contract_template:
            result["has_template"] = True
            result["template_name"] = agency_settings.contract_template_name
            result["template_type"] = agency_settings.contract_template_type
            result["source"] = "legacy_field"
    
    return result


@router.get("/visits/{visit_id}/timesheet.csv")
async def export_timesheet_csv(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export billable items as CSV timesheet (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
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
    """Export visit note as PDF (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
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
    """Export service contract as PDF (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    # Generate PDF (default method)
    pdf_bytes = generate_contract_pdf(visit.client, contract)
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contract_{contract.id}.pdf"},
    )


@router.get("/visits/{visit_id}/contract-template.docx")
async def export_contract_from_template(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export contract using the uploaded agency template (data isolation enforced).
    Falls back to default DOCX if no template is uploaded.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    visit = get_user_visit(db, visit_id, current_user)
    
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    
    # Get agency settings for current user to check for uploaded template
    agency_settings = db.query(AgencySettings).filter(
        AgencySettings.user_id == current_user.id
    ).first()
    
    logger.info(f"Agency settings found: {agency_settings is not None}")
    
    # Check for uploaded template in documents array
    template_base64 = None
    template_name = None
    
    if agency_settings and agency_settings.documents:
        import json
        try:
            documents = json.loads(agency_settings.documents) if isinstance(agency_settings.documents, str) else agency_settings.documents
            logger.info(f"Found {len(documents)} documents in agency settings")
            for doc in documents:
                logger.info(f"Document: category={doc.get('category')}, name={doc.get('name')}, has_content={bool(doc.get('content'))}")
                if doc.get('category') == 'contract_template' and doc.get('content'):
                    template_base64 = doc['content']
                    template_name = doc.get('name', 'template')
                    # Remove data URL prefix if present
                    if ',' in template_base64:
                        template_base64 = template_base64.split(',')[1]
                    logger.info(f"Using template from documents: {template_name}")
                    break
        except Exception as e:
            logger.error(f"Failed to parse documents: {e}")
    
    # Also check legacy template field
    if not template_base64 and agency_settings and agency_settings.contract_template:
        template_base64 = agency_settings.contract_template
        template_name = agency_settings.contract_template_name or "legacy_template"
        if ',' in template_base64:
            template_base64 = template_base64.split(',')[1]
        logger.info(f"Using legacy template: {template_name}")
    
    if not template_base64:
        logger.warning("No template found - returning error to user")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No contract template uploaded. Please go to Settings > Documents and upload a Contract Template, then click Save Changes."
        )
    
    # Debug: Check what type of file this actually is
    try:
        import base64
        decoded_bytes = base64.b64decode(template_base64)
        first_bytes = decoded_bytes[:20]
        logger.info(f"Template first 20 bytes (hex): {first_bytes.hex()}")
        logger.info(f"Template size: {len(decoded_bytes)} bytes")
        
        # Check file signatures
        if decoded_bytes[:4] == b'PK\x03\x04':
            logger.info("File signature: ZIP/DOCX (correct)")
        elif decoded_bytes[:4] == b'%PDF':
            logger.error("File signature: PDF (WRONG - user uploaded PDF, not DOCX)")
        elif decoded_bytes[:8] == b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1':
            logger.error("File signature: Old DOC format (need DOCX)")
        else:
            logger.warning(f"Unknown file signature: {decoded_bytes[:8]}")
    except Exception as e:
        logger.error(f"Failed to decode template: {e}")
    
    if template_base64:
        # Use the uploaded template
        try:
            docx_bytes = generate_contract_from_uploaded_template(
                client=visit.client,
                contract=contract,
                template_base64=template_base64,
                agency_settings=agency_settings
            )
            
            client_name = (visit.client.full_name or 'Client').replace(' ', '_')
            filename = f"Contract_{client_name}.docx"
            
            return StreamingResponse(
                iter([docx_bytes]),
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f"attachment; filename={filename}"},
            )
        except Exception as e:
            # If template filling fails, fall back to default
            import logging
            logging.error(f"Template filling failed: {e}")
    
    # Fall back to default DOCX generation
    docx_bytes = generate_contract_docx(visit.client, contract)
    
    return StreamingResponse(
        iter([docx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename=contract_{contract.id}.docx"},
    )


# ============ LEGACY DOCX EXPORTS ============

@router.get("/visits/{visit_id}/note.docx")
async def export_note_docx(
    visit_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export visit note as DOCX (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
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
    """Export service contract as DOCX (data isolation enforced)."""
    visit = get_user_visit(db, visit_id, current_user)
    
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


# ============ EMAIL EXPORTS ============

@router.post("/visits/{visit_id}/email-contract")
async def email_contract(
    visit_id: UUID,
    email_request: EmailContractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Email the contract PDF to a recipient."""
    # Get visit with user scoping
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.user_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    if not visit.client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visit has no associated client")
    
    # Explicitly load the client
    client = db.query(Client).filter(Client.id == visit.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    # Get the contract for this client
    contract = db.query(Contract).filter(
        Contract.client_id == visit.client_id
    ).order_by(Contract.created_at.desc()).first()
    
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No contract found. Please generate a contract first by running the assessment pipeline."
        )
    
    # Generate PDF
    pdf_bytes = generate_contract_pdf(client, contract)
    
    # Prepare email
    email_service = get_email_service()
    
    client_name = client.full_name
    recipient_name = email_request.recipient_name or client_name
    
    subject = email_request.subject or f"Service Agreement - {client_name}"
    
    # Build email HTML
    custom_message = email_request.message or ""
    message_html = f"<p>{custom_message.replace(chr(10), '<br>')}</p>" if custom_message else ""
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1; margin-bottom: 20px;">Service Agreement</h2>
        
        <p>Dear {recipient_name},</p>
        
        {message_html if message_html else "<p>Please find attached the service agreement for your review.</p>"}
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
                <strong>Client:</strong> {client_name}<br>
                <strong>Document:</strong> Home Care Service Agreement (PDF attached)
            </p>
        </div>
        
        <p>Please review the document carefully. If you have any questions or need clarification on any terms, feel free to reply to this email.</p>
        
        <p>To proceed, please:</p>
        <ol style="color: #555;">
            <li>Review all terms and conditions</li>
            <li>Sign the document</li>
            <li>Return a signed copy to us</li>
        </ol>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
            This email was sent from Homecare AI on behalf of your care provider.
        </p>
    </div>
    """
    
    # Prepare attachment
    attachments = [{
        "filename": f"Service_Agreement_{client_name.replace(' ', '_')}.pdf",
        "content": base64.b64encode(pdf_bytes).decode('utf-8'),
    }]
    
    # Send email
    recipients = [email_request.recipient_email]
    if email_request.cc_email:
        recipients.append(email_request.cc_email)
    
    success = email_service.send_email(
        to=recipients,
        subject=subject,
        html=html,
        attachments=attachments,
        reply_to=current_user.email,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email. Please check your email configuration."
        )
    
    # Auto-move client to "proposal" status when contract/proposal is emailed
    try:
        if client.status not in ('proposal', 'active', 'assigned'):
            client.status = 'proposal'
            db.commit()
    except Exception:
        pass  # Don't fail the email send over a status update
    
    return {
        "success": True,
        "message": f"Contract sent to {email_request.recipient_email}",
        "recipient": email_request.recipient_email,
        "client_status_updated": client.status == 'proposal',
    }


@router.post("/visits/{visit_id}/email-note")
async def email_note(
    visit_id: UUID,
    email_request: EmailContractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Email the visit note PDF to a recipient."""
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.user_id == current_user.id
    ).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    
    # Load the client
    client = db.query(Client).filter(Client.id == visit.client_id).first() if visit.client_id else None
    client_name = client.full_name if client else "Client"
    
    note = db.query(Note).filter(Note.visit_id == visit_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found. Please generate a note first.")
    
    # Generate PDF
    pdf_bytes = generate_note_pdf(visit, note)
    
    # Prepare email
    email_service = get_email_service()
    
    recipient_name = email_request.recipient_name or client_name
    
    subject = email_request.subject or f"Visit Note - {client_name}"
    
    custom_message = email_request.message or ""
    message_html = f"<p>{custom_message.replace(chr(10), '<br>')}</p>" if custom_message else ""
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1; margin-bottom: 20px;">Visit Note</h2>
        
        <p>Dear {recipient_name},</p>
        
        {message_html if message_html else "<p>Please find attached the visit note for your records.</p>"}
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #666;">
                <strong>Client:</strong> {client_name}<br>
                <strong>Document:</strong> Visit Note (PDF attached)
            </p>
        </div>
        
        <p style="color: #999; font-size: 12px;">
            This email was sent from Homecare AI on behalf of your care provider.
        </p>
    </div>
    """
    
    attachments = [{
        "filename": f"Visit_Note_{client_name.replace(' ', '_')}.pdf",
        "content": base64.b64encode(pdf_bytes).decode('utf-8'),
    }]
    
    recipients = [email_request.recipient_email]
    if email_request.cc_email:
        recipients.append(email_request.cc_email)
    
    success = email_service.send_email(
        to=recipients,
        subject=subject,
        html=html,
        attachments=attachments,
        reply_to=current_user.email,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email. Please check your email configuration."
        )
    
    return {
        "success": True,
        "message": f"Visit note sent to {email_request.recipient_email}",
        "recipient": email_request.recipient_email,
    }
