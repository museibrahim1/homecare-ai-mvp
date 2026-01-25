"""Add agency_settings table

Revision ID: 006_agency_settings
Revises: 005_caregivers_table
Create Date: 2026-01-25
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '006_agency_settings'
down_revision = '005_caregivers_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agency_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False, server_default='Home Care Services Agency'),
        sa.Column('address', sa.Text()),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(50)),
        sa.Column('zip_code', sa.String(20)),
        sa.Column('phone', sa.String(20)),
        sa.Column('email', sa.String(255)),
        sa.Column('website', sa.String(255)),
        sa.Column('logo', sa.Text()),
        sa.Column('primary_color', sa.String(20), server_default='#1e3a8a'),
        sa.Column('secondary_color', sa.String(20), server_default='#3b82f6'),
        sa.Column('contract_template', sa.Text()),
        sa.Column('contract_template_name', sa.String(255)),
        sa.Column('contract_template_type', sa.String(100)),
        sa.Column('cancellation_policy', sa.Text()),
        sa.Column('terms_and_conditions', sa.Text()),
        sa.Column('settings_key', sa.String(50), unique=True, server_default='default'),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Insert default agency settings
    op.execute("""
        INSERT INTO agency_settings (name, settings_key)
        VALUES ('Home Care Services Agency', 'default')
        ON CONFLICT (settings_key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_table('agency_settings')
