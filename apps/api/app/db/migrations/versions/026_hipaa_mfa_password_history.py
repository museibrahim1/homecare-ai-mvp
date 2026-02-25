"""Add MFA fields and password history to users table for HIPAA compliance

Revision ID: 026
Revises: 025
"""

from alembic import op
import sqlalchemy as sa

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255),
            ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS password_history JSONB DEFAULT '[]'::jsonb;
    """)


def downgrade():
    op.execute("""
        ALTER TABLE users
            DROP COLUMN IF EXISTS mfa_secret,
            DROP COLUMN IF EXISTS mfa_enabled,
            DROP COLUMN IF EXISTS password_history;
    """)
