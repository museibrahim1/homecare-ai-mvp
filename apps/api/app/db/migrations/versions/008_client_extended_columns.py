"""Add extended client columns

Revision ID: 008_client_extended_columns
Revises: 007_agency_settings_extended
Create Date: 2026-01-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '008_client_extended_columns'
down_revision: Union[str, None] = '007_agency_settings_extended'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to clients table
    # Basic Information
    op.add_column('clients', sa.Column('preferred_name', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('gender', sa.String(20), nullable=True))
    
    # Contact Information
    op.add_column('clients', sa.Column('phone_secondary', sa.String(20), nullable=True))
    op.add_column('clients', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('city', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('state', sa.String(50), nullable=True))
    op.add_column('clients', sa.Column('zip_code', sa.String(20), nullable=True))
    
    # Emergency Contacts
    op.add_column('clients', sa.Column('emergency_contact_relationship', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_2_name', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_2_phone', sa.String(20), nullable=True))
    op.add_column('clients', sa.Column('emergency_contact_2_relationship', sa.String(100), nullable=True))
    
    # Medical Information
    op.add_column('clients', sa.Column('primary_diagnosis', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('secondary_diagnoses', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('allergies', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('medications', sa.Text(), nullable=True))
    op.add_column('clients', sa.Column('physician_name', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('physician_phone', sa.String(20), nullable=True))
    
    # Care Information
    op.add_column('clients', sa.Column('mobility_status', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('cognitive_status', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('living_situation', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('care_level', sa.String(50), nullable=True))
    op.add_column('clients', sa.Column('special_requirements', sa.Text(), nullable=True))
    
    # Insurance & Billing
    op.add_column('clients', sa.Column('insurance_provider', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('insurance_id', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('medicaid_id', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('medicare_id', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('billing_address', sa.Text(), nullable=True))
    
    # Scheduling Preferences
    op.add_column('clients', sa.Column('preferred_days', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('preferred_times', sa.String(255), nullable=True))
    
    # Status
    op.add_column('clients', sa.Column('status', sa.String(50), nullable=True, server_default='active'))
    op.add_column('clients', sa.Column('intake_date', sa.Date(), nullable=True))
    op.add_column('clients', sa.Column('discharge_date', sa.Date(), nullable=True))
    
    # Notes (already exists in some versions, use try/except)
    try:
        op.add_column('clients', sa.Column('notes', sa.Text(), nullable=True))
    except Exception:
        pass  # Column may already exist
    
    # External System Integration
    op.add_column('clients', sa.Column('external_id', sa.String(255), nullable=True))
    op.add_column('clients', sa.Column('external_source', sa.String(100), nullable=True))
    
    # Create indexes
    op.create_index('ix_clients_external', 'clients', ['external_source', 'external_id'])
    op.create_index('ix_clients_email', 'clients', ['email'])
    op.create_index('ix_clients_status', 'clients', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_clients_status', table_name='clients')
    op.drop_index('ix_clients_email', table_name='clients')
    op.drop_index('ix_clients_external', table_name='clients')
    
    # Drop columns in reverse order
    op.drop_column('clients', 'external_source')
    op.drop_column('clients', 'external_id')
    op.drop_column('clients', 'notes')
    op.drop_column('clients', 'discharge_date')
    op.drop_column('clients', 'intake_date')
    op.drop_column('clients', 'status')
    op.drop_column('clients', 'preferred_times')
    op.drop_column('clients', 'preferred_days')
    op.drop_column('clients', 'billing_address')
    op.drop_column('clients', 'medicare_id')
    op.drop_column('clients', 'medicaid_id')
    op.drop_column('clients', 'insurance_id')
    op.drop_column('clients', 'insurance_provider')
    op.drop_column('clients', 'special_requirements')
    op.drop_column('clients', 'care_level')
    op.drop_column('clients', 'living_situation')
    op.drop_column('clients', 'cognitive_status')
    op.drop_column('clients', 'mobility_status')
    op.drop_column('clients', 'physician_phone')
    op.drop_column('clients', 'physician_name')
    op.drop_column('clients', 'medications')
    op.drop_column('clients', 'allergies')
    op.drop_column('clients', 'secondary_diagnoses')
    op.drop_column('clients', 'primary_diagnosis')
    op.drop_column('clients', 'emergency_contact_2_relationship')
    op.drop_column('clients', 'emergency_contact_2_phone')
    op.drop_column('clients', 'emergency_contact_2_name')
    op.drop_column('clients', 'emergency_contact_relationship')
    op.drop_column('clients', 'zip_code')
    op.drop_column('clients', 'state')
    op.drop_column('clients', 'city')
    op.drop_column('clients', 'email')
    op.drop_column('clients', 'phone_secondary')
    op.drop_column('clients', 'gender')
    op.drop_column('clients', 'preferred_name')
