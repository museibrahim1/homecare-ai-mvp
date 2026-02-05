"""Add created_by to clients for data isolation

Revision ID: 013
Revises: 012
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_by column to clients table for data isolation
    op.add_column('clients', sa.Column(
        'created_by',
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey('users.id'),
        nullable=True
    ))
    
    # Create index for faster queries
    op.create_index('ix_clients_created_by', 'clients', ['created_by'])


def downgrade() -> None:
    op.drop_index('ix_clients_created_by', table_name='clients')
    op.drop_column('clients', 'created_by')
