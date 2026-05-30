"""Shared paths, gallery directory resolution, and response helper."""

from pathlib import Path

from app.models.contract_template import ContractTemplate

from .schemas import TemplateResponse

_API_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # apps/api
_WORKDIR_ROOT = Path("/app")

if (_API_ROOT / "templates" / "contracts").is_dir():
    GALLERY_DIR = _API_ROOT / "templates" / "contracts"
elif (_WORKDIR_ROOT / "templates" / "contracts").is_dir():
    GALLERY_DIR = _WORKDIR_ROOT / "templates" / "contracts"
else:
    GALLERY_DIR = _API_ROOT / "templates" / "contracts"


def _template_to_response(template: ContractTemplate) -> TemplateResponse:
    return TemplateResponse(
        id=template.id,
        name=template.name,
        version=template.version,
        description=template.description,
        is_active=template.is_active,
        file_type=template.file_type,
        detected_fields=template.detected_fields or [],
        field_mapping=template.field_mapping or {},
        unmapped_fields=template.unmapped_fields or [],
        created_at=str(template.created_at),
        updated_at=str(template.updated_at),
    )
