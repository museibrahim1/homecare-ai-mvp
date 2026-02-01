"""Add company_name to users table

Revision ID: 012
Revises: 011
Create Date: 2026-02-01
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade():
    # Add company_name column to users table
    op.add_column('users', sa.Column('company_name', sa.String(255), nullable=True))
    
    # Change role from enum to string (more flexible)
    # Note: PostgreSQL doesn't easily allow enum modification, so we use a string type
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::VARCHAR(50)")


def downgrade():
    op.drop_column('users', 'company_name')
    # Note: Downgrade doesn't restore the enum type
