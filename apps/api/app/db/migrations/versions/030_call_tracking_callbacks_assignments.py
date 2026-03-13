"""Add called_at, callback fields, and team assignment to sales_leads

Revision ID: 030
Revises: 029
"""

from alembic import op
import sqlalchemy as sa

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Accurate call tracking (replaces unreliable updated_at proxy)
    op.add_column("sales_leads", sa.Column("called_at", sa.DateTime(timezone=True), nullable=True))

    # Callback tracking
    op.add_column("sales_leads", sa.Column("callback_requested", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("sales_leads", sa.Column("callback_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("sales_leads", sa.Column("callback_notes", sa.Text(), nullable=True))

    # Team assignment
    op.add_column("sales_leads", sa.Column("assigned_to", sa.String(36), nullable=True))
    op.add_column("sales_leads", sa.Column("assigned_type", sa.String(20), nullable=True))

    # Backfill called_at from updated_at where is_contacted=true
    op.execute("""
        UPDATE sales_leads
        SET called_at = updated_at
        WHERE is_contacted = true AND called_at IS NULL
    """)

    op.create_index("ix_sales_leads_called_at", "sales_leads", ["called_at"])
    op.create_index("ix_sales_leads_assigned_to", "sales_leads", ["assigned_to"])
    op.create_index("ix_sales_leads_callback_requested", "sales_leads", ["callback_requested"])


def downgrade() -> None:
    op.drop_index("ix_sales_leads_callback_requested")
    op.drop_index("ix_sales_leads_assigned_to")
    op.drop_index("ix_sales_leads_called_at")
    op.drop_column("sales_leads", "assigned_type")
    op.drop_column("sales_leads", "assigned_to")
    op.drop_column("sales_leads", "callback_notes")
    op.drop_column("sales_leads", "callback_date")
    op.drop_column("sales_leads", "callback_requested")
    op.drop_column("sales_leads", "called_at")
