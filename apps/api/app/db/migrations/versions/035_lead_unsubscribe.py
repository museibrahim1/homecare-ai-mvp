"""Add unsubscribe / suppression tracking to sales_leads

Revision ID: 035
Revises: 034
Create Date: 2026-08-14

Records when a lead opts out of marketing email so every send path can skip
them (CAN-SPAM: honor unsubscribes promptly). Backs the one-click unsubscribe
link in the outreach emails and the List-Unsubscribe header on the Resend
sender.
"""
from alembic import op

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE sales_leads
            ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

        CREATE INDEX IF NOT EXISTS ix_sales_leads_unsubscribed
            ON sales_leads (unsubscribed);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS ix_sales_leads_unsubscribed;
        ALTER TABLE sales_leads
            DROP COLUMN IF EXISTS unsubscribed,
            DROP COLUMN IF EXISTS unsubscribed_at;
        """
    )
