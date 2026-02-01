"""Add voiceprint columns to users table

Revision ID: 011
Revises: 010
Create Date: 2026-01-29
"""

from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    # Add voiceprint columns to users table
    op.add_column('users', sa.Column('voiceprint', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('voiceprint_created_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('users', 'voiceprint_created_at')
    op.drop_column('users', 'voiceprint')
