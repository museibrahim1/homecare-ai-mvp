"""Add Google Calendar integration fields to users

Revision ID: 010
Revises: 009
Create Date: 2026-01-29
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade():
    # Add Google Calendar columns to users table
    op.add_column('users', sa.Column('google_calendar_connected', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('users', sa.Column('google_calendar_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_calendar_refresh_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('google_calendar_token_expiry', sa.DateTime(timezone=True), nullable=True))
    
    # Set default value for existing rows
    op.execute("UPDATE users SET google_calendar_connected = false WHERE google_calendar_connected IS NULL")
    
    # Make column non-nullable
    op.alter_column('users', 'google_calendar_connected', nullable=False)


def downgrade():
    op.drop_column('users', 'google_calendar_token_expiry')
    op.drop_column('users', 'google_calendar_refresh_token')
    op.drop_column('users', 'google_calendar_access_token')
    op.drop_column('users', 'google_calendar_connected')
