"""
Document Generation Service

Generates professional PDF documents from templates for home care contracts and notes.
Supports user-uploaded DOCX templates with placeholder replacement.
"""

import io
import re
import base64
import logging
from typing import Any, List, Dict, Optional
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

logger = logging.getLogger(__name__)


def get_template_placeholders(client: Any, contract: Any, agency_settings: Optional[Any] = None) -> Dict[str, str]:
    """
    Build a dictionary of all template placeholders and their values.
    
    Supports placeholders like:
    - {client_name}, {{client_name}}, [client_name], [[client_name]]
    - {CLIENT_NAME} (case-insensitive)
    """
    schedule = contract.schedule or {}
    services = contract.services or []
    client_profile = schedule.get("client_profile", {})
    
    # Calculate costs
    hourly_rate = float(contract.hourly_rate or 0)
    weekly_hours = float(contract.weekly_hours or 0)
    weekly_cost = hourly_rate * weekly_hours
    monthly_cost = weekly_cost * 4.33
    
    # Format schedule days
    days = schedule.get("preferred_days", [])
    if isinstance(days, list):
        days_str = ", ".join([
            d if isinstance(d, str) else (d.get('day', str(d)) if isinstance(d, dict) else str(d)) 
            for d in days
        ]) if days else "To be determined"
    else:
        days_str = str(days) if days else "To be determined"
    
    # Format services list
    services_text = ""
    for i, svc in enumerate(services, 1):
        if isinstance(svc, str):
            services_text += f"{i}. {svc}\n"
        else:
            name = svc.get('name', 'Service')
            desc = svc.get('description', '')
            freq = svc.get('frequency', '')
            line = f"{i}. {name}"
            if desc:
                line += f": {desc}"
            if freq:
                line += f" ({freq})"
            services_text += line + "\n"
    
    # Format special requirements
    special_reqs = schedule.get("special_requirements", [])
    reqs_text = ""
    for req in special_reqs:
        if isinstance(req, str):
            reqs_text += f"• {req}\n"
        elif isinstance(req, dict):
            reqs_text += f"• {req.get('name', req.get('requirement', str(req)))}\n"
    
    # Format safety concerns
    safety = schedule.get("safety_concerns", [])
    safety_text = ""
    for concern in safety:
        if isinstance(concern, str):
            safety_text += f"• {concern}\n"
        elif isinstance(concern, dict):
            safety_text += f"• {concern.get('concern', str(concern))}\n"
    
    # Agency info
    agency_name = "Home Care Services Agency"
    agency_address = ""
    agency_city = ""
    agency_state = ""
    agency_zip = ""
    agency_phone = ""
    agency_email = ""
    
    if agency_settings:
        agency_name = agency_settings.name or agency_name
        agency_address = agency_settings.address or ""
        agency_city = agency_settings.city or ""
        agency_state = agency_settings.state or ""
        agency_zip = agency_settings.zip_code or ""
        agency_phone = agency_settings.phone or ""
        agency_email = agency_settings.email or ""
    
    # Build full agency address
    agency_full_address = agency_address
    city_state_zip = ", ".join(filter(None, [agency_city, agency_state])) 
    if agency_zip:
        city_state_zip += f" {agency_zip}"
    if city_state_zip:
        agency_full_address += f"\n{city_state_zip}" if agency_full_address else city_state_zip
    
    # All placeholders (multiple variations for flexibility)
    placeholders = {
        # Dates
        'date': date.today().strftime('%B %d, %Y'),
        'contract_date': date.today().strftime('%B %d, %Y'),
        'effective_date': date.today().strftime('%B %d, %Y'),
        'today': date.today().strftime('%B %d, %Y'),
        'current_date': date.today().strftime('%B %d, %Y'),
        
        # Agency info
        'agency_name': agency_name,
        'agency': agency_name,
        'company_name': agency_name,
        'provider_name': agency_name,
        'agency_address': agency_full_address,
        'agency_street': agency_address,
        'agency_city': agency_city,
        'agency_state': agency_state,
        'agency_zip': agency_zip,
        'agency_zip_code': agency_zip,
        'agency_phone': agency_phone,
        'agency_email': agency_email,
        
        # Client info
        'client_name': client.full_name or '',
        'client': client.full_name or '',
        'patient_name': client.full_name or '',
        'patient': client.full_name or '',
        'client_first_name': (client.full_name or '').split()[0] if client.full_name else '',
        'client_last_name': (client.full_name or '').split()[-1] if client.full_name and len((client.full_name or '').split()) > 1 else '',
        'client_address': client.address or '',
        'client_street': client.address or '',
        'client_city': client.city or '',
        'client_state': client.state or '',
        'client_zip': client.zip_code or '',
        'client_zip_code': client.zip_code or '',
        'client_phone': client.phone or '',
        'home_phone': client.phone or '',
        'work_phone': getattr(client, 'work_phone', '') or '',
        'cell_phone': client.phone or '',
        'client_email': client.email or '',
        'date_of_birth': getattr(client, 'date_of_birth', '') or '',
        'dob': getattr(client, 'date_of_birth', '') or '',
        'emergency_contact': client.emergency_contact_name or '',
        'emergency_contact_name': client.emergency_contact_name or '',
        'emergency_phone': client.emergency_contact_phone or '',
        'emergency_contact_phone': client.emergency_contact_phone or '',
        
        # Care assessment
        'care_level': schedule.get('care_need_level', 'MODERATE'),
        'care_need_level': schedule.get('care_need_level', 'MODERATE'),
        'primary_diagnosis': client_profile.get('primary_diagnosis', 'See medical records'),
        'diagnosis': client_profile.get('primary_diagnosis', 'See medical records'),
        'mobility_status': client_profile.get('mobility_status', 'N/A'),
        'mobility': client_profile.get('mobility_status', 'N/A'),
        'cognitive_status': client_profile.get('cognitive_status', 'N/A'),
        'living_situation': client_profile.get('living_situation', 'N/A'),
        
        # Services
        'services': services_text.strip() or 'As determined by care plan',
        'services_list': services_text.strip() or 'As determined by care plan',
        
        # Schedule
        'schedule_days': days_str,
        'days': days_str,
        'preferred_days': days_str,
        'schedule_time': schedule.get('preferred_times', 'Flexible'),
        'preferred_time': schedule.get('preferred_times', 'Flexible'),
        'time': schedule.get('preferred_times', 'Flexible'),
        'frequency': schedule.get('frequency', 'As scheduled'),
        'weekly_hours': f"{weekly_hours:.0f}",
        'hours_per_week': f"{weekly_hours:.0f}",
        
        # Rates
        'hourly_rate': f"${hourly_rate:.2f}",
        'hourly_rate_value': f"{hourly_rate:.2f}",  # Without $ sign
        'rate': f"${hourly_rate:.2f}",
        'rate_value': f"{hourly_rate:.2f}",
        'weekly_cost': f"${weekly_cost:.2f}",
        'weekly_estimate': f"${weekly_cost:.2f}",
        'monthly_cost': f"${monthly_cost:.2f}",
        'monthly_estimate': f"${monthly_cost:.2f}",
        'weekday_rate': f"{hourly_rate:.2f}",
        'weekend_rate': f"{hourly_rate * 1.25:.2f}",  # 25% premium
        'holiday_rate': f"{hourly_rate * 1.5:.2f}",  # Time and a half
        
        # Requirements and safety
        'special_requirements': reqs_text.strip() or 'None specified',
        'requirements': reqs_text.strip() or 'None specified',
        'safety_concerns': safety_text.strip() or 'None noted',
        'safety': safety_text.strip() or 'None noted',
        
        # Contract ID
        'contract_id': str(contract.id) if contract.id else '',
    }
    
    return placeholders


def fill_docx_template(template_bytes: bytes, placeholders: Dict[str, str]) -> bytes:
    """
    Fill a DOCX template by replacing placeholders with actual values.
    
    Supports multiple placeholder formats:
    - {placeholder}, {{placeholder}}, [placeholder], [[placeholder]]
    - "Label:" format (e.g., "Name:" followed by blank space)
    - Case insensitive matching
    """
    try:
        from docx import Document

        doc = Document(io.BytesIO(template_bytes))

        # Ordered list of (label_pattern, placeholder_key).
        # Longer/more-specific labels come first so they match before shorter ones.
        LABEL_MAPPINGS = [
            ('client name:', 'client_name'),
            ('patient name:', 'client_name'),
            ('client address:', 'client_address'),
            ('client city:', 'client_city'),
            ('client state:', 'client_state'),
            ('client zip:', 'client_zip'),
            ('emergency contact:', 'emergency_contact'),
            ('emergency phone:', 'emergency_phone'),
            ('date of birth:', 'date_of_birth'),
            ('dob:', 'date_of_birth'),
            ('home phone:', 'client_phone'),
            ('work phone:', 'work_phone'),
            ('cell phone:', 'client_phone'),
            ('hourly rate:', 'hourly_rate_value'),
            ('hourly:', 'hourly_rate_value'),
            ('weekday:', 'hourly_rate_value'),
            ('weekend:', 'weekend_rate'),
            ('holiday:', 'holiday_rate'),
            ('weekly hours:', 'weekly_hours'),
            ('hours per week:', 'weekly_hours'),
            ('effective date:', 'effective_date'),
            ('start date:', 'effective_date'),
            ('zip code:', 'client_zip'),
            ('zip:', 'client_zip'),
            ('name:', 'client_name'),
            ('address:', 'client_address'),
            ('city:', 'client_city'),
            ('state:', 'client_state'),
            ('phone:', 'client_phone'),
            ('email:', 'client_email'),
            ('date:', 'date'),
        ]

        def replace_placeholder_text(text: str, ph: Dict[str, str]) -> str:
            """Replace {{key}}, {key}, [[key]], [key] patterns."""
            if not text:
                return text
            result = text
            for key, value in ph.items():
                for pat in [
                    rf'\{{\{{\s*{re.escape(key)}\s*\}}\}}',
                    rf'\{{\s*{re.escape(key)}\s*\}}',
                    rf'\[\[\s*{re.escape(key)}\s*\]\]',
                    rf'\[\s*{re.escape(key)}\s*\]',
                ]:
                    result = re.sub(pat, str(value or ''), result, flags=re.IGNORECASE)
            return result

        def fill_labels_in_text(text: str, ph: Dict[str, str]) -> str:
            """
            Replace "Label: ___________" patterns on a single line.
            Handles multiple labels on one line like
            "City:_______ State:_______ Zip:_______"
            """
            if not text:
                return text

            result = text
            text_lower = text.lower()

            already_replaced = set()

            for label, pk in LABEL_MAPPINGS:
                idx = text_lower.find(label)
                if idx == -1:
                    continue
                if idx in already_replaced:
                    continue

                value = ph.get(pk, '')
                if not value:
                    continue

                label_end = idx + len(label)
                # Find the span of underscores/spaces after the label
                span_end = label_end
                while span_end < len(result) and result[span_end] in '_ \t':
                    span_end += 1

                # Only replace if there are underscores/blanks (not already-filled text)
                span_content = result[label_end:span_end]
                if span_content and any(c == '_' for c in span_content):
                    new_result = result[:label_end] + ' ' + str(value) + ' ' + result[span_end:]
                    already_replaced.add(idx)
                    shift = len(new_result) - len(result)
                    result = new_result
                    text_lower = result.lower()
                elif span_end == label_end:
                    # No underscores/spaces — just "Label:" with nothing after
                    pass

            return result

        def set_paragraph_text(paragraph, new_text: str):
            """Overwrite a paragraph's text while keeping first run's formatting."""
            for run in paragraph.runs:
                run.text = ''
            if paragraph.runs:
                paragraph.runs[0].text = new_text
            else:
                paragraph.add_run(new_text)

        def process_paragraph(paragraph, ph: Dict[str, str]):
            full_text = paragraph.text
            if not full_text:
                return
            new_text = replace_placeholder_text(full_text, ph)
            new_text = fill_labels_in_text(new_text, ph)
            if new_text != full_text:
                set_paragraph_text(paragraph, new_text)

        def process_cell_inline(cell, ph: Dict[str, str]):
            """
            Fill placeholders and label patterns within a cell.
            Returns the placeholder_key if this cell is a pure label cell
            (so the caller can fill the adjacent cell).
            """
            cell_text = cell.text.strip()
            if not cell_text:
                return None

            cell_lower = cell_text.lower()

            # Check if this cell is a pure label like "Name:" or "Address:"
            for label, pk in LABEL_MAPPINGS:
                label_bare = label.rstrip(':')
                if cell_lower == label or cell_lower == label_bare:
                    return pk

            # Fill {{placeholder}} patterns
            new_text = replace_placeholder_text(cell_text, ph)

            # Fill "Label: ___" patterns inside the cell
            new_text = fill_labels_in_text(new_text, ph)

            if new_text != cell_text:
                for paragraph in cell.paragraphs:
                    old = paragraph.text
                    if old.strip():
                        p_new = replace_placeholder_text(old, ph)
                        p_new = fill_labels_in_text(p_new, ph)
                        if p_new != old:
                            set_paragraph_text(paragraph, p_new)

            return None

        # --- Process document body paragraphs ---
        for paragraph in doc.paragraphs:
            process_paragraph(paragraph, placeholders)

        # --- Process tables ---
        for table in doc.tables:
            for row in table.rows:
                cells = list(row.cells)
                pending_pk = None

                for i, cell in enumerate(cells):
                    if pending_pk:
                        value = placeholders.get(pending_pk, '')
                        if value:
                            cell_text = cell.text.strip()
                            is_blank = not cell_text or all(c in '_ \t\n' for c in cell_text)
                            if is_blank:
                                for paragraph in cell.paragraphs:
                                    set_paragraph_text(paragraph, str(value))
                                    break
                        pending_pk = None
                    else:
                        pending_pk = process_cell_inline(cell, placeholders)

        # --- Process headers / footers ---
        for section in doc.sections:
            if section.header:
                for paragraph in section.header.paragraphs:
                    process_paragraph(paragraph, placeholders)
                for table in section.header.tables:
                    for row in table.rows:
                        for cell in row.cells:
                            process_cell_inline(cell, placeholders)
            if section.footer:
                for paragraph in section.footer.paragraphs:
                    process_paragraph(paragraph, placeholders)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to fill DOCX template: {e}")
        raise


def generate_contract_from_uploaded_template(
    client: Any, 
    contract: Any, 
    template_base64: str,
    agency_settings: Optional[Any] = None
) -> bytes:
    """
    Generate a contract DOCX by filling in an uploaded template.
    
    Args:
        client: Client model with name, address, etc.
        contract: Contract model with services, schedule, rates
        template_base64: Base64-encoded DOCX template
        agency_settings: Optional agency settings for agency info
    
    Returns:
        DOCX file as bytes with placeholders replaced
    """
    # Decode the template
    template_bytes = base64.b64decode(template_base64)
    
    # Get all placeholder values
    placeholders = get_template_placeholders(client, contract, agency_settings)
    
    # Fill the template
    filled_doc = fill_docx_template(template_bytes, placeholders)
    
    return filled_doc


def get_custom_styles():
    """Create custom paragraph styles for the PDF."""
    styles = getSampleStyleSheet()
    
    # Title style
    styles.add(ParagraphStyle(
        name='ContractTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=TA_CENTER,
        spaceAfter=6,
        textColor=colors.HexColor('#1a365d'),
        fontName='Helvetica-Bold'
    ))
    
    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#2c5282'),
        fontName='Helvetica-Bold',
        borderPadding=4,
    ))
    
    # Body text - modify existing instead of adding
    if 'BodyText' in styles.byName:
        styles['BodyText'].fontSize = 10
        styles['BodyText'].alignment = TA_JUSTIFY
        styles['BodyText'].spaceAfter = 6
        styles['BodyText'].leading = 14
    else:
        styles.add(ParagraphStyle(
            name='BodyText',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            leading=14
        ))
    
    # Bullet item
    styles.add(ParagraphStyle(
        name='BulletItem',
        parent=styles['Normal'],
        fontSize=10,
        leftIndent=20,
        spaceAfter=4,
        bulletIndent=10,
        leading=12
    ))
    
    # Label style (bold)
    styles.add(ParagraphStyle(
        name='Label',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        spaceAfter=2
    ))
    
    # Small text
    styles.add(ParagraphStyle(
        name='SmallText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.gray,
        alignment=TA_CENTER
    ))
    
    # Signature line
    styles.add(ParagraphStyle(
        name='SignatureLine',
        parent=styles['Normal'],
        fontSize=10,
        spaceBefore=20,
        spaceAfter=4
    ))
    
    return styles


def generate_contract_pdf(client: Any, contract: Any) -> bytes:
    """
    Generate a professional one-page PDF contract for home care services.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    styles = get_custom_styles()
    story = []
    
    schedule = contract.schedule or {}
    services = contract.services or []
    
    # === HEADER ===
    story.append(Paragraph("HOME CARE SERVICE AGREEMENT", styles['ContractTitle']))
    story.append(Paragraph(f"Effective Date: {date.today().strftime('%B %d, %Y')}", styles['SmallText']))
    story.append(Spacer(1, 12))
    
    # === PARTIES SECTION ===
    # Create two-column layout for parties
    parties_data = [
        [
            Paragraph("<b>SERVICE PROVIDER</b><br/>Home Care Services Agency", styles['BodyText']),
            Paragraph(f"<b>CLIENT</b><br/>{client.full_name}<br/>{client.address or ''}<br/>Phone: {client.phone or 'N/A'}", styles['BodyText'])
        ]
    ]
    parties_table = Table(parties_data, colWidths=[3.5*inch, 3.5*inch])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(parties_table)
    story.append(Spacer(1, 8))
    
    # Divider line
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    
    # === CARE ASSESSMENT ===
    story.append(Paragraph("CARE ASSESSMENT", styles['SectionHeader']))
    
    care_need_level = schedule.get("care_need_level", "MODERATE")
    client_profile = schedule.get("client_profile", {})
    
    assessment_text = f"<b>Care Need Level:</b> {care_need_level}"
    if client_profile.get("primary_diagnosis"):
        assessment_text += f"&nbsp;&nbsp;|&nbsp;&nbsp;<b>Primary Condition:</b> {client_profile['primary_diagnosis']}"
    if client_profile.get("mobility_status"):
        assessment_text += f"&nbsp;&nbsp;|&nbsp;&nbsp;<b>Mobility:</b> {client_profile['mobility_status']}"
    
    story.append(Paragraph(assessment_text, styles['BodyText']))
    
    # === SERVICES ===
    story.append(Paragraph("SERVICES TO BE PROVIDED", styles['SectionHeader']))
    
    if services:
        services_text = ""
        for i, service in enumerate(services):
            if isinstance(service, str):
                services_text += f"• {service}<br/>"
            else:
                name = service.get("name", "Service")
                desc = service.get("description", "")
                freq = service.get("frequency", "")
                line = f"• <b>{name}</b>"
                if desc:
                    line += f": {desc}"
                if freq:
                    line += f" ({freq})"
                services_text += line + "<br/>"
        story.append(Paragraph(services_text, styles['BulletItem']))
    else:
        story.append(Paragraph("• General home care services as determined by care plan", styles['BulletItem']))
    
    # === SCHEDULE & RATES (Side by side) ===
    # Get schedule info
    days = schedule.get("preferred_days", [])
    if isinstance(days, list):
        days_str = ", ".join([d if isinstance(d, str) else (d.get('day', str(d)) if isinstance(d, dict) else str(d)) for d in days]) if days else "TBD"
    else:
        days_str = str(days) if days else "TBD"
    
    hourly_rate = float(contract.hourly_rate or 0)
    weekly_hours = float(contract.weekly_hours or 0)
    weekly_cost = hourly_rate * weekly_hours
    monthly_cost = weekly_cost * 4.33
    
    schedule_rates_data = [
        [
            Paragraph("<b>SCHEDULE</b>", styles['Label']),
            Paragraph("<b>RATES</b>", styles['Label'])
        ],
        [
            Paragraph(f"Frequency: {schedule.get('frequency', 'As scheduled')}<br/>"
                     f"Days: {days_str}<br/>"
                     f"Time: {schedule.get('preferred_times', 'Flexible')}<br/>"
                     f"Hours/Week: {weekly_hours:.0f}", styles['BodyText']),
            Paragraph(f"Hourly Rate: ${hourly_rate:.2f}<br/>"
                     f"Weekly Est: ${weekly_cost:.2f}<br/>"
                     f"Monthly Est: ${monthly_cost:.2f}", styles['BodyText'])
        ]
    ]
    
    schedule_table = Table(schedule_rates_data, colWidths=[4*inch, 3*inch])
    schedule_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f7fafc')),
    ]))
    story.append(Spacer(1, 8))
    story.append(schedule_table)
    
    # === SPECIAL REQUIREMENTS & SAFETY (if any) ===
    special_reqs = schedule.get("special_requirements", [])
    safety = schedule.get("safety_concerns", [])
    
    if special_reqs or safety:
        story.append(Spacer(1, 8))
        
        reqs_safety_data = []
        
        # Build requirements text
        reqs_text = ""
        if special_reqs:
            for req in special_reqs[:4]:  # Limit to 4 items
                if isinstance(req, str):
                    reqs_text += f"• {req}<br/>"
                elif isinstance(req, dict):
                    reqs_text += f"• {req.get('name', req.get('requirement', str(req)))}<br/>"
        
        # Build safety text
        safety_text = ""
        if safety:
            for concern in safety[:4]:  # Limit to 4 items
                if isinstance(concern, str):
                    safety_text += f"• {concern}<br/>"
                elif isinstance(concern, dict):
                    text = concern.get("concern", str(concern))
                    severity = concern.get("severity", "")
                    if severity:
                        safety_text += f"• {text} [{severity}]<br/>"
                    else:
                        safety_text += f"• {text}<br/>"
        
        if reqs_text or safety_text:
            reqs_safety_data = [
                [
                    Paragraph("<b>SPECIAL REQUIREMENTS</b>", styles['Label']) if reqs_text else Paragraph("", styles['Label']),
                    Paragraph("<b>SAFETY CONSIDERATIONS</b>", styles['Label']) if safety_text else Paragraph("", styles['Label'])
                ],
                [
                    Paragraph(reqs_text or "None specified", styles['BulletItem']),
                    Paragraph(safety_text or "None noted", styles['BulletItem'])
                ]
            ]
            
            reqs_table = Table(reqs_safety_data, colWidths=[3.5*inch, 3.5*inch])
            reqs_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(reqs_table)
    
    # === POLICIES (Compact) ===
    story.append(Paragraph("TERMS & POLICIES", styles['SectionHeader']))
    
    policies_text = """<b>Cancellation:</b> 24-hour notice required. Late cancellations may incur 50% charge. 
    <b>Confidentiality:</b> All client information protected under HIPAA. 
    <b>Termination:</b> Either party may terminate with 14 days written notice. 
    <b>Payment:</b> Due within 30 days of invoice date."""
    
    story.append(Paragraph(policies_text, styles['BodyText']))
    
    # === SIGNATURES ===
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 8))
    
    sig_data = [
        [
            Paragraph("<b>CLIENT / AUTHORIZED REPRESENTATIVE</b>", styles['Label']),
            Paragraph("<b>AGENCY REPRESENTATIVE</b>", styles['Label'])
        ],
        [
            Paragraph("_" * 40 + "<br/>Signature", styles['SignatureLine']),
            Paragraph("_" * 40 + "<br/>Signature", styles['SignatureLine'])
        ],
        [
            Paragraph(f"Name: {client.full_name}", styles['BodyText']),
            Paragraph("Name: _________________________", styles['BodyText'])
        ],
        [
            Paragraph("Date: _______________", styles['BodyText']),
            Paragraph("Date: _______________", styles['BodyText'])
        ]
    ]
    
    sig_table = Table(sig_data, colWidths=[3.5*inch, 3.5*inch])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(sig_table)
    
    # Footer
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Contract ID: {contract.id}", styles['SmallText']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_note_pdf(visit: Any, note: Any) -> bytes:
    """
    Generate a professional PDF visit note.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    styles = get_custom_styles()
    story = []
    
    # === HEADER ===
    story.append(Paragraph("HOME CARE VISIT NOTE", styles['ContractTitle']))
    story.append(Spacer(1, 8))
    
    # === VISIT INFO ===
    visit_info = note.structured_data.get("visit_info", {}) if note.structured_data else {}
    
    info_data = [
        [
            Paragraph(f"<b>Client:</b> {visit.client.full_name if visit.client else 'N/A'}", styles['BodyText']),
            Paragraph(f"<b>Date:</b> {str(visit.actual_start or visit.scheduled_start or 'N/A')[:10]}", styles['BodyText'])
        ],
        [
            Paragraph(f"<b>Caregiver:</b> {visit.caregiver.full_name if visit.caregiver else 'N/A'}", styles['BodyText']),
            Paragraph(f"<b>Duration:</b> {visit_info.get('duration_minutes', 0)} minutes", styles['BodyText'])
        ]
    ]
    
    info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f7fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))
    
    # === SERVICES PROVIDED ===
    story.append(Paragraph("SERVICES PROVIDED", styles['SectionHeader']))
    
    tasks = note.structured_data.get("tasks_performed", []) if note.structured_data else []
    if tasks:
        tasks_text = ""
        for task in tasks:
            desc = task.get('description', 'Service provided')
            duration = task.get('duration_minutes', 0)
            tasks_text += f"• {desc} ({duration} min)<br/>"
        story.append(Paragraph(tasks_text, styles['BulletItem']))
    else:
        story.append(Paragraph("• Care services provided as scheduled", styles['BulletItem']))
    
    # === OBSERVATIONS ===
    story.append(Paragraph("OBSERVATIONS", styles['SectionHeader']))
    
    structured = note.structured_data or {}
    observations = structured.get("observations", "No specific observations recorded.")
    story.append(Paragraph(observations, styles['BodyText']))
    
    # === CONCERNS ===
    concerns = structured.get("risks_concerns", "")
    if concerns and concerns != "None noted.":
        story.append(Paragraph("CONCERNS / FOLLOW-UP", styles['SectionHeader']))
        story.append(Paragraph(concerns, styles['BodyText']))
    
    # === NARRATIVE ===
    if note.narrative:
        story.append(Paragraph("NARRATIVE NOTE", styles['SectionHeader']))
        story.append(Paragraph(note.narrative, styles['BodyText']))
    
    # === FOOTER ===
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    story.append(Spacer(1, 8))
    
    footer_data = [
        [
            Paragraph("_" * 35 + "<br/>Caregiver Signature", styles['SignatureLine']),
            Paragraph(f"Date: {str(note.created_at)[:10]}", styles['BodyText'])
        ]
    ]
    footer_table = Table(footer_data, colWidths=[4*inch, 3*inch])
    story.append(footer_table)
    
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Note ID: {note.id} | Version: {note.version}", styles['SmallText']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


# Keep DOCX functions for backward compatibility
def generate_note_docx(visit: Any, note: Any) -> bytes:
    """Legacy DOCX generation - use generate_note_pdf instead."""
    from docx import Document
    from docx.shared import Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    
    doc = Document()
    title = doc.add_heading("Visit Note", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_heading("Visit Information", level=1)
    doc.add_paragraph(f"Client: {visit.client.full_name if visit.client else 'N/A'}")
    doc.add_paragraph(f"Caregiver: {visit.caregiver.full_name if visit.caregiver else 'N/A'}")
    doc.add_paragraph(f"Date: {str(visit.actual_start or visit.scheduled_start or 'N/A')}")
    
    if note.narrative:
        doc.add_heading("Narrative", level=1)
        doc.add_paragraph(note.narrative)
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def generate_contract_docx(client: Any, contract: Any) -> bytes:
    """
    Generate a comprehensive DOCX contract using all available assessment data.
    This is used as fallback when no custom template is uploaded.
    """
    from docx import Document
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    
    doc = Document()
    
    # Set up styles
    style = doc.styles['Normal']
    style.font.name = 'Arial'
    style.font.size = Pt(11)
    
    # ==================== HEADER ====================
    title = doc.add_heading("HOME CARE SERVICE AGREEMENT", 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_paragraph(f"Effective Date: {date.today().strftime('%B %d, %Y')}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph()
    
    # ==================== PARTIES ====================
    doc.add_heading("1. PARTIES", level=1)
    
    # Client info
    p = doc.add_paragraph()
    p.add_run("CLIENT:\n").bold = True
    p.add_run(f"Name: {client.full_name or 'N/A'}\n")
    p.add_run(f"Address: {client.address or 'N/A'}\n")
    if hasattr(client, 'city') and client.city:
        p.add_run(f"City/State/Zip: {client.city or ''}, {client.state or ''} {client.zip_code or ''}\n")
    p.add_run(f"Phone: {client.phone or 'N/A'}\n")
    if client.emergency_contact_name:
        p.add_run(f"Emergency Contact: {client.emergency_contact_name} ({client.emergency_contact_phone or 'N/A'})\n")
    
    doc.add_paragraph()
    
    # ==================== CARE ASSESSMENT ====================
    schedule = contract.schedule or {}
    client_profile = schedule.get('client_profile', {})
    care_need_level = schedule.get('care_need_level', 'MODERATE')
    
    doc.add_heading("2. CARE ASSESSMENT SUMMARY", level=1)
    
    p = doc.add_paragraph()
    p.add_run(f"Care Need Level: ").bold = True
    p.add_run(f"{care_need_level}\n")
    
    if client_profile.get('primary_diagnosis'):
        p.add_run(f"Primary Diagnosis: ").bold = True
        p.add_run(f"{client_profile['primary_diagnosis']}\n")
    
    if client_profile.get('secondary_conditions'):
        conditions = client_profile['secondary_conditions']
        if isinstance(conditions, list):
            conditions = ', '.join(conditions)
        p.add_run(f"Secondary Conditions: ").bold = True
        p.add_run(f"{conditions}\n")
    
    if client_profile.get('mobility_status'):
        p.add_run(f"Mobility Status: ").bold = True
        p.add_run(f"{client_profile['mobility_status']}\n")
    
    if client_profile.get('cognitive_status'):
        p.add_run(f"Cognitive Status: ").bold = True
        p.add_run(f"{client_profile['cognitive_status']}\n")
    
    if client_profile.get('living_situation'):
        p.add_run(f"Living Situation: ").bold = True
        p.add_run(f"{client_profile['living_situation']}\n")
    
    # ==================== SERVICES ====================
    doc.add_heading("3. SERVICES TO BE PROVIDED", level=1)
    
    services = contract.services or []
    if services:
        for i, service in enumerate(services, 1):
            if isinstance(service, str):
                doc.add_paragraph(f"{i}. {service}", style='List Number')
            else:
                name = service.get('name', 'Service')
                desc = service.get('description', '')
                freq = service.get('frequency', '')
                priority = service.get('priority', '')
                
                p = doc.add_paragraph(style='List Number')
                p.add_run(f"{name}").bold = True
                if desc:
                    p.add_run(f"\n   Description: {desc}")
                if freq:
                    p.add_run(f"\n   Frequency: {freq}")
                if priority:
                    p.add_run(f"\n   Priority: {priority}")
    else:
        doc.add_paragraph("Services to be determined based on care plan.")
    
    # ==================== SCHEDULE ====================
    doc.add_heading("4. SCHEDULE", level=1)
    
    p = doc.add_paragraph()
    
    frequency = schedule.get('frequency', 'As scheduled')
    p.add_run(f"Frequency: ").bold = True
    p.add_run(f"{frequency}\n")
    
    days = schedule.get('preferred_days', [])
    if isinstance(days, list):
        days_str = ', '.join([d if isinstance(d, str) else d.get('day', str(d)) for d in days]) if days else 'To be determined'
    else:
        days_str = str(days) if days else 'To be determined'
    p.add_run(f"Days: ").bold = True
    p.add_run(f"{days_str}\n")
    
    times = schedule.get('preferred_times', 'Flexible')
    p.add_run(f"Preferred Time: ").bold = True
    p.add_run(f"{times}\n")
    
    weekly_hours = float(contract.weekly_hours or 0)
    p.add_run(f"Hours per Week: ").bold = True
    p.add_run(f"{weekly_hours:.0f}\n")
    
    # ==================== RATES ====================
    doc.add_heading("5. SERVICE RATES", level=1)
    
    hourly_rate = float(contract.hourly_rate or 0)
    weekly_cost = hourly_rate * weekly_hours
    monthly_cost = weekly_cost * 4.33
    
    p = doc.add_paragraph()
    p.add_run(f"Hourly Rate: ").bold = True
    p.add_run(f"${hourly_rate:.2f}/hour\n")
    p.add_run(f"Estimated Weekly Cost: ").bold = True
    p.add_run(f"${weekly_cost:.2f}\n")
    p.add_run(f"Estimated Monthly Cost: ").bold = True
    p.add_run(f"${monthly_cost:.2f}\n")
    p.add_run(f"\nPayment Terms: ").bold = True
    p.add_run("Payment due within 7 days of invoice.\n")
    
    # ==================== SPECIAL REQUIREMENTS ====================
    special_reqs = schedule.get('special_requirements', [])
    if special_reqs:
        doc.add_heading("6. SPECIAL REQUIREMENTS", level=1)
        for req in special_reqs:
            if isinstance(req, str):
                doc.add_paragraph(f"• {req}", style='List Bullet')
            elif isinstance(req, dict):
                req_text = req.get('requirement') or req.get('name', str(req))
                doc.add_paragraph(f"• {req_text}", style='List Bullet')
    
    # ==================== SAFETY CONCERNS ====================
    safety = schedule.get('safety_concerns', [])
    if safety:
        doc.add_heading("7. SAFETY CONSIDERATIONS", level=1)
        for concern in safety:
            if isinstance(concern, str):
                doc.add_paragraph(f"• {concern}", style='List Bullet')
            elif isinstance(concern, dict):
                text = concern.get('concern', str(concern))
                severity = concern.get('severity', '')
                if severity:
                    doc.add_paragraph(f"• {text} [{severity}]", style='List Bullet')
                else:
                    doc.add_paragraph(f"• {text}", style='List Bullet')
    
    # ==================== CARE PLAN GOALS ====================
    goals = schedule.get('care_plan_goals', {})
    if goals:
        doc.add_heading("8. CARE PLAN GOALS", level=1)
        
        short_term = goals.get('short_term', [])
        if short_term:
            p = doc.add_paragraph()
            p.add_run("Short-Term Goals (30 days):").bold = True
            for goal in short_term:
                doc.add_paragraph(f"• {goal}", style='List Bullet')
        
        long_term = goals.get('long_term', [])
        if long_term:
            p = doc.add_paragraph()
            p.add_run("Long-Term Goals (90+ days):").bold = True
            for goal in long_term:
                doc.add_paragraph(f"• {goal}", style='List Bullet')
    
    # ==================== TERMS & CONDITIONS ====================
    doc.add_heading("9. TERMS AND CONDITIONS", level=1)
    
    doc.add_paragraph("""CANCELLATION POLICY: Cancellations made more than 24 hours in advance incur no charge. Cancellations within 24 hours may incur 50% of scheduled visit fee. Emergency cancellations will be evaluated on a case-by-case basis.

CONFIDENTIALITY: All client information is kept strictly confidential in accordance with HIPAA regulations. Information will only be shared with healthcare providers directly involved in the client's care or as required by law.

TERMINATION: Either party may terminate this Agreement with 14 days written notice. Immediate termination may occur if there is a safety concern or non-payment of services.

LIABILITY: The Agency maintains comprehensive general liability and professional liability insurance. Caregivers are employees of the Agency and covered under workers' compensation insurance.""")
    
    # ==================== SIGNATURES ====================
    doc.add_heading("10. SIGNATURES", level=1)
    
    doc.add_paragraph("By signing below, both parties agree to the terms and conditions of this Agreement.\n")
    
    # Client signature
    p = doc.add_paragraph()
    p.add_run("CLIENT / AUTHORIZED REPRESENTATIVE:\n\n").bold = True
    p.add_run("Signature: _________________________________  Date: _______________\n\n")
    p.add_run(f"Printed Name: {client.full_name or '________________________________'}\n")
    
    doc.add_paragraph()
    
    # Agency signature
    p = doc.add_paragraph()
    p.add_run("AGENCY REPRESENTATIVE:\n\n").bold = True
    p.add_run("Signature: _________________________________  Date: _______________\n\n")
    p.add_run("Printed Name: ________________________________\n\n")
    p.add_run("Title: ________________________________\n")
    
    # Footer
    doc.add_paragraph()
    doc.add_paragraph(f"Contract ID: {contract.id}").alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
