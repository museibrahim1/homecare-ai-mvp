import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class ContractTemplate(Base, TimestampMixin):
    __tablename__ = "contract_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    name = Column(String(255), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    file_type = Column(String(20), nullable=False, default="pdf")
    file_url = Column(Text, nullable=True)
    file_hash = Column(String(64), nullable=True)

    # OCR-extracted raw text
    ocr_text = Column(Text, nullable=True)

    # JSON array of fields detected by OCR + AI
    # [{"field_id": "client_name", "label": "Client Name", "type": "text",
    #   "mapped_to": "client.full_name", "required": true, "position": {...}}]
    detected_fields = Column(JSONB, default=list, nullable=False)

    # JSON map of field_id → database column path
    # {"client_name": "client.full_name", "hourly_rate": "contract.hourly_rate"}
    field_mapping = Column(JSONB, default=dict, nullable=False)

    # Fields detected that have no DB mapping yet (needs manual mapping or schema update)
    unmapped_fields = Column(JSONB, default=list, nullable=False)

    __table_args__ = (
        Index("ix_contract_templates_owner_id", "owner_id"),
        Index("ix_contract_templates_active", "is_active"),
    )
