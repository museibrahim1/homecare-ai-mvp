"""
Document Generation Service.

Generates professional PDF/DOCX documents from templates for home care
contracts and visit notes, and supports user-uploaded DOCX templates with
placeholder replacement.

Split out of a single 1,682-line module into focused submodules:
  - placeholders.py    get_template_placeholders
  - docx_templates.py  fill_docx_template, docx_to_html, generate_contract_from_uploaded_template
  - pdf_render.py       get_custom_styles, generate_contract_pdf, generate_note_pdf
  - docx_render.py      generate_note_docx, generate_contract_docx

All public functions are re-exported here so existing imports
(`from app.services.document_generation import generate_contract_pdf`, etc.)
keep working unchanged.
"""

from .placeholders import get_template_placeholders
from .docx_templates import (
    fill_docx_template,
    docx_to_html,
    generate_contract_from_uploaded_template,
)
from .pdf_render import (
    get_custom_styles,
    generate_contract_pdf,
    generate_note_pdf,
)
from .docx_render import (
    generate_note_docx,
    generate_contract_docx,
)

__all__ = [
    "get_template_placeholders",
    "fill_docx_template",
    "docx_to_html",
    "generate_contract_from_uploaded_template",
    "get_custom_styles",
    "generate_contract_pdf",
    "generate_note_pdf",
    "generate_note_docx",
    "generate_contract_docx",
]
