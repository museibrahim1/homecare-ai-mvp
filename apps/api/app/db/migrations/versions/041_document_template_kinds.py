"""Add doc_kind to contract_templates for contracts, assessments, care plans.

Revision ID: 041
Revises: 040
Create Date: 2026-08-25
"""
from alembic import op
import sqlalchemy as sa

revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "contract_templates",
        sa.Column(
            "doc_kind",
            sa.String(length=32),
            nullable=False,
            server_default="contract",
        ),
    )
    op.create_index(
        "ix_contract_templates_doc_kind",
        "contract_templates",
        ["doc_kind"],
    )


def downgrade() -> None:
    op.drop_index("ix_contract_templates_doc_kind", table_name="contract_templates")
    op.drop_column("contract_templates", "doc_kind")
