"""Add 2FA columns to business_users and backfill email_verified

Revision ID: 033
Revises: 032
"""

from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE business_users
            ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
    """)
    # Grandfather existing accounts so enforcement never locks them out.
    op.execute("""
        UPDATE business_users
        SET email_verified = true,
            email_verified_at = COALESCE(email_verified_at, now())
        WHERE email_verified IS NOT TRUE;
    """)


def downgrade():
    op.execute("""
        ALTER TABLE business_users
            DROP COLUMN IF EXISTS two_factor_secret,
            DROP COLUMN IF EXISTS two_factor_enabled;
    """)
