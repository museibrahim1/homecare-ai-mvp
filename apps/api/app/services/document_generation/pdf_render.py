"""ReportLab-based PDF rendering for contracts and visit notes."""

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
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT

logger = logging.getLogger(__name__)


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
        textColor=colors.HexColor('#0D9488'),
        fontName='Helvetica-Bold'
    ))
    
    # Section header
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor('#115E59'),
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
    
    # === HEADER (PALM Paper template) ===
    story.append(Paragraph("PALM", styles['SmallText']))
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


def generate_care_plan_pdf(client: Any, contract: Any = None) -> bytes:
    """Generate a care plan PDF from client.care_plan and optional contract schedule/services."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    styles = get_custom_styles()
    story = []

    story.append(Paragraph("HOME CARE PLAN", styles["ContractTitle"]))
    story.append(Spacer(1, 8))

    client_name = getattr(client, "full_name", None) or "N/A"
    info_data = [
        [
            Paragraph(f"<b>Client:</b> {client_name}", styles["BodyText"]),
            Paragraph(
                f"<b>Date:</b> {date.today().isoformat()}",
                styles["BodyText"],
            ),
        ]
    ]
    info_table = Table(info_data, colWidths=[3.5 * inch, 3.5 * inch])
    info_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7fafc")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 12))

    schedule = {}
    services = []
    if contract is not None:
        schedule = getattr(contract, "schedule", None) or {}
        if not isinstance(schedule, dict):
            schedule = {}
        services = getattr(contract, "services", None) or []
        if not isinstance(services, list):
            services = []

    goals = schedule.get("care_plan_goals") or {}
    if isinstance(goals, dict) and any(goals.values()):
        story.append(Paragraph("CARE PLAN GOALS", styles["SectionHeader"]))
        for label, key in (
            ("Short-term (30 days)", "short_term"),
            ("Long-term (90+ days)", "long_term"),
            ("Maintenance", "maintenance"),
        ):
            items = goals.get(key) or []
            if not items:
                continue
            story.append(Paragraph(label, styles["BodyText"]))
            bullets = "".join(f"• {html_escape(str(g))}<br/>" for g in items if g)
            story.append(Paragraph(bullets, styles["BulletItem"]))

    plan_text = (getattr(client, "care_plan", None) or "").strip()
    if plan_text:
        story.append(Paragraph("CARE PLAN", styles["SectionHeader"]))
        for block in plan_text.split("\n\n"):
            cleaned = html_escape(block).replace("\n", "<br/>")
            if cleaned.strip():
                story.append(Paragraph(cleaned, styles["BodyText"]))
                story.append(Spacer(1, 6))

    if services:
        story.append(Paragraph("SERVICES", styles["SectionHeader"]))
        for svc in services:
            if isinstance(svc, dict):
                name = svc.get("name") or svc.get("service") or "Service"
                rate = svc.get("rate")
                unit = svc.get("unit") or "hour"
                line = f"• {html_escape(str(name))}"
                if rate is not None:
                    line += f" (${rate}/{unit})"
                story.append(Paragraph(line, styles["BulletItem"]))
            else:
                story.append(Paragraph(f"• {html_escape(str(svc))}", styles["BulletItem"]))

    if not plan_text and not (isinstance(goals, dict) and any(goals.values())) and not services:
        story.append(Paragraph("CARE PLAN", styles["SectionHeader"]))
        story.append(
            Paragraph(
                "No care plan details have been saved for this client yet.",
                styles["BodyText"],
            )
        )

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 8))
    story.append(Paragraph(f"Client ID: {getattr(client, 'id', '')}", styles["SmallText"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def html_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# =============================================================================
# SUBSCRIPTION INVOICE / RECEIPT
# =============================================================================

# Vendor (seller) details for PalmCare subscription invoices. These describe
# Palm Technologies, the company that sells the subscription, not the customer
# agency. Overridable via env so legal details can be updated without a deploy.
def _vendor_details() -> dict:
    import os

    return {
        "company": os.getenv("PALM_COMPANY_NAME", "Palm Technologies"),
        "product_owner": os.getenv("PALM_LEGAL_NAME", "Palm Technologies LLC"),
        "address_line1": os.getenv("PALM_COMPANY_ADDRESS1", ""),
        "address_line2": os.getenv("PALM_COMPANY_ADDRESS2", ""),
        "email": os.getenv("PALM_SUPPORT_EMAIL", "support@palmtai.com"),
        "website": os.getenv("PALM_WEBSITE", "palmcareai.com"),
        # Only rendered when actually set. Never invent a tax ID.
        "ein": os.getenv("PALM_COMPANY_EIN", ""),
    }


def _fmt_money(amount: float, currency: str = "USD") -> str:
    return f"${amount:,.2f} {currency}".strip()


def _fmt_date(value: Any) -> str:
    if value is None:
        return ""
    try:
        return value.strftime("%B %d, %Y")
    except AttributeError:
        return str(value)


def generate_invoice_pdf(invoice: Dict[str, Any]) -> bytes:
    """
    Generate a clean, professional subscription invoice / receipt PDF.

    One document serves as both invoice and receipt: because PalmCare
    subscriptions are charged by Apple through In-App Purchase, the PDF is
    marked "Paid via App Store" so it can never be mistaken for a second,
    separate charge.

    Expected keys in ``invoice``:
      invoice_number, invoice_date, status, amount, currency,
      plan_name, billing_cycle, period_start, period_end,
      customer_business, customer_name, customer_email, customer_address,
      billed_via, paid_at
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch,
        title=f"Invoice {invoice.get('invoice_number', '')}",
    )

    teal = colors.HexColor("#0d9488")
    ink = colors.HexColor("#10211F")
    muted = colors.HexColor("#4B6B66")
    line = colors.HexColor("#e2e8f0")

    styles = getSampleStyleSheet()

    def _style(name, **kw):
        if name in styles.byName:
            for k, v in kw.items():
                setattr(styles[name], k, v)
            return styles[name]
        styles.add(ParagraphStyle(name=name, parent=styles["Normal"], **kw))
        return styles[name]

    s_brand = _style("InvBrand", fontName="Helvetica-Bold", fontSize=20,
                     textColor=teal, spaceAfter=0, leading=22)
    s_doctype = _style("InvDocType", fontName="Helvetica-Bold", fontSize=22,
                       textColor=ink, alignment=TA_RIGHT, leading=24)
    s_meta = _style("InvMeta", fontName="Helvetica", fontSize=9.5,
                    textColor=muted, alignment=TA_RIGHT, leading=14)
    s_label = _style("InvSectionLabel", fontName="Helvetica-Bold", fontSize=8,
                     textColor=muted, spaceAfter=3, leading=11)
    s_body = _style("InvBody2", fontName="Helvetica", fontSize=9.5,
                    textColor=ink, leading=13)
    s_bodymuted = _style("InvBodyMuted", fontName="Helvetica", fontSize=9.5,
                         textColor=muted, leading=13)
    s_amountdue = _style("InvAmountDue", fontName="Helvetica-Bold", fontSize=15,
                         textColor=ink, spaceBefore=6, spaceAfter=6, leading=18)
    s_th = _style("InvTH", fontName="Helvetica-Bold", fontSize=8.5,
                  textColor=muted, leading=11)
    s_th_r = _style("InvTHR", fontName="Helvetica-Bold", fontSize=8.5,
                    textColor=muted, alignment=TA_RIGHT, leading=11)
    s_td = _style("InvTD", fontName="Helvetica", fontSize=9.5,
                  textColor=ink, leading=13)
    s_td_r = _style("InvTDR", fontName="Helvetica", fontSize=9.5,
                    textColor=ink, alignment=TA_RIGHT, leading=13)
    s_footer = _style("InvFooter", fontName="Helvetica", fontSize=8,
                      textColor=muted, alignment=TA_LEFT, leading=12)

    vendor = _vendor_details()
    currency = (invoice.get("currency") or "USD").upper()
    amount = float(invoice.get("amount") or 0)
    status = (invoice.get("status") or "paid").lower()
    is_paid = status == "paid"
    # One document labeled "Invoice" that doubles as a receipt: it stays titled
    # "Invoice" but, when paid through Apple, clearly shows the paid amount,
    # paid date, and "Paid via Apple In-App Purchase" so it can never be
    # mistaken for a second, separate charge.
    doc_label = "Invoice"

    story: List[Any] = []

    # === HEADER: brand + document type ===
    header = Table(
        [[
            Paragraph("PALM", s_brand),
            Paragraph(doc_label, s_doctype),
        ]],
        colWidths=[3.4 * inch, 3.6 * inch],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header)
    story.append(Paragraph("PalmCare AI", s_bodymuted))
    story.append(Spacer(1, 14))

    # === META ROW: seller block (left) + invoice meta (right) ===
    seller_lines = [f"<b>{html_escape(vendor['company'])}</b>"]
    if vendor["address_line1"]:
        seller_lines.append(html_escape(vendor["address_line1"]))
    if vendor["address_line2"]:
        seller_lines.append(html_escape(vendor["address_line2"]))
    seller_lines.append(html_escape(vendor["email"]))
    seller_lines.append(html_escape(vendor["website"]))
    seller_block = Paragraph("<br/>".join(seller_lines), s_body)

    meta_rows = [
        f"Invoice number&nbsp;&nbsp;<b>{html_escape(str(invoice.get('invoice_number', '')))}</b>",
    ]
    meta_rows.append(f"Date of issue&nbsp;&nbsp;{_fmt_date(invoice.get('invoice_date'))}")
    if is_paid and invoice.get("paid_at"):
        meta_rows.append(f"Date paid&nbsp;&nbsp;{_fmt_date(invoice.get('paid_at'))}")
    meta_block = Paragraph("<br/>".join(meta_rows), s_meta)

    meta_table = Table(
        [[seller_block, meta_block]],
        colWidths=[3.6 * inch, 3.4 * inch],
    )
    meta_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 18))

    # === BILL TO ===
    story.append(Paragraph("BILL TO", s_label))
    bill_lines = []
    if invoice.get("customer_business"):
        bill_lines.append(f"<b>{html_escape(str(invoice['customer_business']))}</b>")
    if invoice.get("customer_name"):
        bill_lines.append(html_escape(str(invoice["customer_name"])))
    if invoice.get("customer_address"):
        for ln in str(invoice["customer_address"]).split("\n"):
            if ln.strip():
                bill_lines.append(html_escape(ln.strip()))
    if invoice.get("customer_email"):
        bill_lines.append(html_escape(str(invoice["customer_email"])))
    if not bill_lines:
        bill_lines.append("Customer")
    story.append(Paragraph("<br/>".join(bill_lines), s_body))
    story.append(Spacer(1, 16))

    # === HEADLINE AMOUNT ===
    if is_paid:
        headline = f"{_fmt_money(amount, currency)} paid on {_fmt_date(invoice.get('paid_at') or invoice.get('invoice_date'))}"
    else:
        headline = f"{_fmt_money(amount, currency)} due {_fmt_date(invoice.get('invoice_date'))}"
    story.append(Paragraph(headline, s_amountdue))
    story.append(Spacer(1, 6))

    # === LINE ITEMS TABLE ===
    period_start = invoice.get("period_start")
    period_end = invoice.get("period_end")
    period_str = ""
    if period_start or period_end:
        period_str = f"{_fmt_date(period_start)} - {_fmt_date(period_end)}".strip(" -")

    plan_name = invoice.get("plan_name") or "PalmCare AI Subscription"
    desc_html = f"<b>{html_escape(str(plan_name))}</b>"
    if period_str:
        desc_html += f"<br/><font color='#4B6B66'>{html_escape(period_str)}</font>"

    unit_price = _fmt_money(amount, "").strip()
    line_amount = _fmt_money(amount, "").strip()

    table_data = [
        [
            Paragraph("DESCRIPTION", s_th),
            Paragraph("QTY", s_th_r),
            Paragraph("UNIT PRICE", s_th_r),
            Paragraph("AMOUNT", s_th_r),
        ],
        [
            Paragraph(desc_html, s_td),
            Paragraph("1", s_td_r),
            Paragraph(unit_price, s_td_r),
            Paragraph(line_amount, s_td_r),
        ],
    ]
    items_table = Table(
        table_data,
        colWidths=[3.7 * inch, 0.7 * inch, 1.3 * inch, 1.3 * inch],
    )
    items_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, 0), 4),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, line),
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, line),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 4))

    # === TOTALS ===
    total_label = "Amount paid" if is_paid else "Amount due"
    totals_data = [
        [Paragraph("Subtotal", s_td_r), Paragraph(_fmt_money(amount, "").strip(), s_td_r)],
        [Paragraph("Total", s_td_r), Paragraph(_fmt_money(amount, "").strip(), s_td_r)],
        [
            Paragraph(f"<b>{total_label}</b>", s_td_r),
            Paragraph(f"<b>{_fmt_money(amount, currency)}</b>", s_td_r),
        ],
    ]
    totals_table = Table(totals_data, colWidths=[5.7 * inch, 1.3 * inch])
    totals_table.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEABOVE", (0, 2), (-1, 2), 0.5, line),
        ("TOPPADDING", (0, 2), (-1, 2), 6),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 18))

    # === PAYMENT METHOD (App Store) ===
    billed_via = invoice.get("billed_via") or "Apple In-App Purchase"
    story.append(HRFlowable(width="100%", thickness=0.5, color=line))
    story.append(Spacer(1, 8))
    story.append(Paragraph("PAYMENT METHOD", s_label))
    story.append(Paragraph(
        f"Paid via {html_escape(str(billed_via))}. This subscription is billed and charged "
        f"through your Apple ID. PalmCare does not charge your card directly for this purchase.",
        s_bodymuted,
    ))
    story.append(Spacer(1, 20))

    # === FOOTER: legal ===
    story.append(HRFlowable(width="100%", thickness=0.5, color=line))
    story.append(Spacer(1, 6))
    footer_lines = [html_escape(vendor["product_owner"])]
    if vendor["ein"]:
        footer_lines.append(f"US EIN {html_escape(vendor['ein'])}")
    footer_lines.append(
        f"Questions about this invoice? Contact {html_escape(vendor['email'])}."
    )
    story.append(Paragraph("<br/>".join(footer_lines), s_footer))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


# Keep DOCX functions for backward compatibility
