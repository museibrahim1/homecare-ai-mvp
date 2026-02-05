"""Add created_by to caregivers for data isolation

Revision ID: 015
Revises: 014
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add created_by column to caregivers for data isolation
    op.add_column('caregivers', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_caregivers_created_by', 'caregivers', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_caregivers_created_by', 'caregivers', type_='foreignkey')
    op.drop_column('caregivers', 'created_by')
