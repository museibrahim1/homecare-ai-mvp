"""Pydantic models for the contract templates package."""

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class FieldInfo(BaseModel):
    field_id: str
    label: str = ""
    type: str = "text"
    required: bool = False
    section: str = ""
    mapped_to: Optional[str] = None
    is_filled: bool = False


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    version: int
    description: Optional[str]
    is_active: bool
    file_type: str
    detected_fields: list
    field_mapping: dict
    unmapped_fields: list
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class TemplateListItem(BaseModel):
    id: UUID
    name: str
    version: int
    is_active: bool
    file_type: str
    field_count: int
    unmapped_count: int
    created_at: str

    class Config:
        from_attributes = True


class FieldMappingUpdate(BaseModel):
    field_id: str
    mapped_to: str


class ReconciliationReport(BaseModel):
    added_fields: list
    removed_fields: list
    unchanged_fields: list
    total_old: int
    total_new: int
    summary: str

class GalleryItem(BaseModel):
    slug: str
    name: str
    description: str
    file_type: str
    field_count: int
    mapped_count: int
    unmapped_count: int
    sections: List[str]

