"""Add contract_templates table for OCR-powered template management

Revision ID: 022
Revises: 021
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS contract_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id UUID NOT NULL REFERENCES users(id),
            name VARCHAR(255) NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            description TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            file_type VARCHAR(20) NOT NULL DEFAULT 'pdf',
            file_url TEXT,
            file_hash VARCHAR(64),
            ocr_text TEXT,
            detected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
            field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
            unmapped_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_contract_templates_owner_id ON contract_templates (owner_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_contract_templates_active ON contract_templates (is_active)")


def downgrade():
    op.drop_index("ix_contract_templates_active")
    op.drop_index("ix_contract_templates_owner_id")
    op.drop_table("contract_templates")
