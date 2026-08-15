"""Social login: user_identities + nullable password hashes

Revision ID: 037
Revises: 036
Create Date: 2026-08-15

Supports Apple/Google sign-in: store provider subjects, allow social-only
users (no password) on users and business_users.
"""
from alembic import op

revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            ALTER COLUMN hashed_password DROP NOT NULL;

        ALTER TABLE business_users
            ALTER COLUMN password_hash DROP NOT NULL;

        CREATE TABLE IF NOT EXISTS user_identities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider VARCHAR(20) NOT NULL,
            provider_user_id VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_user_identities_provider_sub UNIQUE (provider, provider_user_id)
        );

        CREATE INDEX IF NOT EXISTS ix_user_identities_user_id
            ON user_identities (user_id);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS user_identities;

        -- Only re-add NOT NULL if no nulls remain
        UPDATE users SET hashed_password = '' WHERE hashed_password IS NULL;
        ALTER TABLE users ALTER COLUMN hashed_password SET NOT NULL;

        UPDATE business_users SET password_hash = '' WHERE password_hash IS NULL;
        ALTER TABLE business_users ALTER COLUMN password_hash SET NOT NULL;
        """
    )
