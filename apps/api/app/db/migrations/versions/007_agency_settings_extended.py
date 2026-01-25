"""Add extended agency settings fields

Revision ID: 007_agency_settings_extended
Revises: 006_agency_settings
Create Date: 2026-01-25
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '007_agency_settings_extended'
down_revision = '006_agency_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to agency_settings table
    op.add_column('agency_settings', sa.Column('tax_id', sa.String(50)))
    op.add_column('agency_settings', sa.Column('license_number', sa.String(100)))
    op.add_column('agency_settings', sa.Column('npi_number', sa.String(20)))
    op.add_column('agency_settings', sa.Column('contact_person', sa.String(255)))
    op.add_column('agency_settings', sa.Column('contact_title', sa.String(100)))
    op.add_column('agency_settings', sa.Column('documents', sa.Text()))


def downgrade() -> None:
    op.drop_column('agency_settings', 'documents')
    op.drop_column('agency_settings', 'contact_title')
    op.drop_column('agency_settings', 'contact_person')
    op.drop_column('agency_settings', 'npi_number')
    op.drop_column('agency_settings', 'license_number')
    op.drop_column('agency_settings', 'tax_id')
