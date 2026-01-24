"""
Document Generation Service

Generates DOCX and PDF documents from templates.
"""

import io
from typing import Any
from docx import Document
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.services.note_generation import generate_narrative
from app.services.contract_generation import generate_contract_text


def generate_note_docx(visit: Any, note: Any) -> bytes:
    """
    Generate a DOCX document for a visit note.
    """
    doc = Document()
    
    # Title
    title = doc.add_heading("Visit Note", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Visit Info
    doc.add_heading("Visit Information", level=1)
    
    visit_info = note.structured_data.get("visit_info", {})
    
    table = doc.add_table(rows=4, cols=2)
    table.style = "Table Grid"
    
    rows_data = [
        ("Client", visit.client.full_name if visit.client else ""),
        ("Caregiver", visit.caregiver.full_name if visit.caregiver else ""),
        ("Date", str(visit.actual_start or visit.scheduled_start or "")),
        ("Duration", f"{visit_info.get('duration_minutes', 0)} minutes"),
    ]
    
    for i, (label, value) in enumerate(rows_data):
        table.rows[i].cells[0].text = label
        table.rows[i].cells[1].text = str(value)
    
    doc.add_paragraph()
    
    # Tasks Performed
    doc.add_heading("Services Provided", level=1)
    
    tasks = note.structured_data.get("tasks_performed", [])
    if tasks:
        for task in tasks:
            p = doc.add_paragraph(style="List Bullet")
            p.add_run(f"{task.get('description', '')} ").bold = True
            p.add_run(f"({task.get('duration_minutes', 0)} minutes)")
    else:
        doc.add_paragraph("No specific tasks recorded.")
    
    doc.add_paragraph()
    
    # Observations
    doc.add_heading("Observations", level=1)
    observations = note.structured_data.get("observations", "")
    doc.add_paragraph(observations or "No observations recorded.")
    
    # Concerns
    doc.add_heading("Risks/Concerns", level=1)
    concerns = note.structured_data.get("risks_concerns", "None noted.")
    doc.add_paragraph(concerns)
    
    # Narrative
    if note.narrative:
        doc.add_heading("Narrative Note", level=1)
        doc.add_paragraph(note.narrative)
    
    # Footer
    doc.add_paragraph()
    footer = doc.add_paragraph()
    footer.add_run(f"Generated on: {note.created_at}").italic = True
    footer.add_run(f" | Version: {note.version}").italic = True
    
    # Save to bytes
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def generate_contract_docx(client: Any, contract: Any) -> bytes:
    """
    Generate a DOCX document for a service contract.
    """
    doc = Document()
    
    # Title
    title = doc.add_heading("Home Care Service Agreement", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # Contract Number
    if contract.contract_number:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run(f"Contract #: {contract.contract_number}")
    
    doc.add_paragraph()
    
    # Client Information
    doc.add_heading("Client Information", level=1)
    
    table = doc.add_table(rows=5, cols=2)
    table.style = "Table Grid"
    
    rows_data = [
        ("Name", client.full_name),
        ("Address", client.address or ""),
        ("Phone", client.phone or ""),
        ("Emergency Contact", client.emergency_contact_name or ""),
        ("Emergency Phone", client.emergency_contact_phone or ""),
    ]
    
    for i, (label, value) in enumerate(rows_data):
        table.rows[i].cells[0].text = label
        table.rows[i].cells[1].text = str(value)
    
    doc.add_paragraph()
    
    # Services
    doc.add_heading("Services Provided", level=1)
    
    services = contract.services or []
    if services:
        for service in services:
            p = doc.add_paragraph(style="List Bullet")
            name = service.get("name", "")
            desc = service.get("description", "")
            p.add_run(f"{name}: ").bold = True
            p.add_run(desc)
    else:
        doc.add_paragraph("Services to be determined.")
    
    doc.add_paragraph()
    
    # Schedule
    doc.add_heading("Schedule", level=1)
    
    schedule = contract.schedule or {}
    days = schedule.get("days", [])
    
    schedule_text = []
    if days:
        schedule_text.append(f"Days: {', '.join(days)}")
    if schedule.get("start_time"):
        schedule_text.append(f"Hours: {schedule.get('start_time')} - {schedule.get('end_time', '')}")
    if contract.weekly_hours:
        schedule_text.append(f"Weekly Hours: {contract.weekly_hours}")
    
    for line in schedule_text:
        doc.add_paragraph(line)
    
    doc.add_paragraph()
    
    # Rates
    doc.add_heading("Rates and Fees", level=1)
    
    rate_table = doc.add_table(rows=3, cols=2)
    rate_table.style = "Table Grid"
    
    rate_data = [
        ("Hourly Rate", f"${contract.hourly_rate or 0:.2f}"),
        ("Weekly Hours", f"{contract.weekly_hours or 0}"),
        ("Estimated Weekly Cost", f"${(contract.hourly_rate or 0) * (contract.weekly_hours or 0):.2f}"),
    ]
    
    for i, (label, value) in enumerate(rate_data):
        rate_table.rows[i].cells[0].text = label
        rate_table.rows[i].cells[1].text = str(value)
    
    doc.add_paragraph()
    
    # Terms
    doc.add_heading("Terms", level=1)
    
    if contract.start_date:
        doc.add_paragraph(f"Start Date: {contract.start_date}")
    if contract.end_date:
        doc.add_paragraph(f"End Date: {contract.end_date}")
    
    doc.add_paragraph()
    
    # Cancellation Policy
    doc.add_heading("Cancellation Policy", level=1)
    doc.add_paragraph(contract.cancellation_policy or "Standard cancellation policy applies.")
    
    # Terms and Conditions
    if contract.terms_and_conditions:
        doc.add_heading("Terms and Conditions", level=1)
        doc.add_paragraph(contract.terms_and_conditions)
    
    doc.add_paragraph()
    
    # Signatures
    doc.add_heading("Signatures", level=1)
    
    doc.add_paragraph()
    doc.add_paragraph("Client Signature: _________________________  Date: _________")
    doc.add_paragraph()
    doc.add_paragraph("Agency Representative: ___________________  Date: _________")
    
    # Save to bytes
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
