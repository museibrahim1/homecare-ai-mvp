"""Add local_documents table for agency file uploads (Local Drive)

Revision ID: 046
Revises: 045
"""

from alembic import op

revision = "046"
down_revision = "045"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS local_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            file_size_bytes INTEGER NOT NULL,
            s3_key VARCHAR(512) NOT NULL,
            uploaded_by_name VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_local_documents_user ON local_documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_local_documents_created ON local_documents(user_id, created_at DESC);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS local_documents;")
