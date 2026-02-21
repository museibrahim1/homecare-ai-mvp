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
    op.create_table(
        "contract_templates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("owner_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("file_type", sa.String(20), nullable=False, server_default="'pdf'"),
        sa.Column("file_url", sa.Text, nullable=True),
        sa.Column("file_hash", sa.String(64), nullable=True),
        sa.Column("ocr_text", sa.Text, nullable=True),
        sa.Column("detected_fields", JSONB, nullable=False, server_default="'[]'::jsonb"),
        sa.Column("field_mapping", JSONB, nullable=False, server_default="'{}'::jsonb"),
        sa.Column("unmapped_fields", JSONB, nullable=False, server_default="'[]'::jsonb"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_index("ix_contract_templates_owner_id", "contract_templates", ["owner_id"])
    op.create_index("ix_contract_templates_active", "contract_templates", ["is_active"])


def downgrade():
    op.drop_index("ix_contract_templates_active")
    op.drop_index("ix_contract_templates_owner_id")
    op.drop_table("contract_templates")
