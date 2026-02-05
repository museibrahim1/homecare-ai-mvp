"""Add user_id to agency_settings for data isolation

Revision ID: 016
Revises: 015
Create Date: 2026-01-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_id column to agency_settings for data isolation
    op.add_column('agency_settings', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_agency_settings_user_id', 'agency_settings', 'users', ['user_id'], ['id'])
    
    # Remove the unique constraint on settings_key since each user has their own settings
    op.drop_constraint('agency_settings_settings_key_key', 'agency_settings', type_='unique')


def downgrade() -> None:
    op.create_unique_constraint('agency_settings_settings_key_key', 'agency_settings', ['settings_key'])
    op.drop_constraint('fk_agency_settings_user_id', 'agency_settings', type_='foreignkey')
    op.drop_column('agency_settings', 'user_id')
