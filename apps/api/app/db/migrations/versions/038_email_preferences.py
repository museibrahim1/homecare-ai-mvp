"""Email preference categories for granular unsubscribe

Revision ID: 038
Revises: 037
Create Date: 2026-08-15

Stores per-address opt-in flags so recipients can stop outreach, product tips,
or announcements without losing account mail (password resets, receipts).
"""
from alembic import op

revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS email_preferences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(320) NOT NULL,
            outreach BOOLEAN NOT NULL DEFAULT true,
            product_updates BOOLEAN NOT NULL DEFAULT true,
            announcements BOOLEAN NOT NULL DEFAULT true,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ix_email_preferences_email
            ON email_preferences (email);
        CREATE INDEX IF NOT EXISTS ix_email_preferences_email_lower
            ON email_preferences (lower(email));
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS ix_email_preferences_email_lower;
        DROP INDEX IF EXISTS ix_email_preferences_email;
        DROP TABLE IF EXISTS email_preferences;
        """
    )
