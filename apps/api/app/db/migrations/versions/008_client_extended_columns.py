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
    # This migration may run against databases that already have some of these
    # columns (e.g., created via an older init.sql). Use Postgres IF NOT EXISTS
    # so the migration is safe to re-run.

    def add_col(sql: str) -> None:
        op.execute(sa.text(f"ALTER TABLE clients ADD COLUMN IF NOT EXISTS {sql}"))

    # Basic Information
    add_col("preferred_name VARCHAR(100)")
    add_col("gender VARCHAR(20)")

    # Contact Information
    add_col("phone_secondary VARCHAR(20)")
    add_col("email VARCHAR(255)")
    add_col("city VARCHAR(100)")
    add_col("state VARCHAR(50)")
    add_col("zip_code VARCHAR(20)")

    # Emergency Contacts
    add_col("emergency_contact_relationship VARCHAR(100)")
    add_col("emergency_contact_2_name VARCHAR(255)")
    add_col("emergency_contact_2_phone VARCHAR(20)")
    add_col("emergency_contact_2_relationship VARCHAR(100)")

    # Medical Information
    add_col("primary_diagnosis VARCHAR(255)")
    add_col("secondary_diagnoses TEXT")
    add_col("allergies TEXT")
    add_col("medications TEXT")
    add_col("physician_name VARCHAR(255)")
    add_col("physician_phone VARCHAR(20)")

    # Care Information
    add_col("mobility_status VARCHAR(100)")
    add_col("cognitive_status VARCHAR(100)")
    add_col("living_situation VARCHAR(100)")
    add_col("care_level VARCHAR(50)")
    add_col("special_requirements TEXT")

    # Insurance & Billing
    add_col("insurance_provider VARCHAR(255)")
    add_col("insurance_id VARCHAR(100)")
    add_col("medicaid_id VARCHAR(100)")
    add_col("medicare_id VARCHAR(100)")
    add_col("billing_address TEXT")

    # Scheduling Preferences
    add_col("preferred_days VARCHAR(255)")
    add_col("preferred_times VARCHAR(255)")

    # Status
    add_col("status VARCHAR(50) DEFAULT 'active'")
    add_col("intake_date DATE")
    add_col("discharge_date DATE")

    # Notes
    add_col("notes TEXT")

    # External System Integration
    add_col("external_id VARCHAR(255)")
    add_col("external_source VARCHAR(100)")

    # Indexes
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_clients_external ON clients (external_source, external_id)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_clients_email ON clients (email)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_clients_status ON clients (status)"))


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
