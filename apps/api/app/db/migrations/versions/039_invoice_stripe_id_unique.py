"""Unique invoices.stripe_invoice_id for Apple/Stripe charge idempotency

Revision ID: 039
Revises: 038
Create Date: 2026-08-20

Prevents two paid invoice rows for the same external charge id when a verify
call and a DID_RENEW notification race past the pre-insert lookup.
"""
from alembic import op

revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep the earliest invoice per external charge id; drop later race dupes.
    # NULLs stay allowed (Postgres UNIQUE permits multiple NULLs).
    op.execute(
        """
        DELETE FROM invoices
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY stripe_invoice_id
                           ORDER BY created_at ASC NULLS LAST, id ASC
                       ) AS rn
                FROM invoices
                WHERE stripe_invoice_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ix_invoices_stripe_invoice_id
            ON invoices (stripe_invoice_id);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_invoices_stripe_invoice_id;")
