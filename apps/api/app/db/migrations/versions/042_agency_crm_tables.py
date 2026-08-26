"""Agency CRM tables: leads, appointments, care tracker, client activity

Revision ID: 042
Revises: 041
Create Date: 2026-08-25
"""
from alembic import op

revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS agency_leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_by UUID NOT NULL REFERENCES users(id),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            source VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'new',
            notes TEXT,
            insurance_type VARCHAR(50),
            insurance_id VARCHAR(100),
            converted_at TIMESTAMPTZ,
            converted_client_id UUID REFERENCES clients(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_agency_leads_created_by ON agency_leads (created_by);
        CREATE INDEX IF NOT EXISTS ix_agency_leads_status ON agency_leads (created_by, status);

        ALTER TABLE clients ADD COLUMN IF NOT EXISTS estimated_monthly_value INTEGER;
        ALTER TABLE clients ADD COLUMN IF NOT EXISTS converted_from_lead_id UUID;

        CREATE TABLE IF NOT EXISTS appointments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_by UUID NOT NULL REFERENCES users(id),
            client_id UUID REFERENCES clients(id),
            title VARCHAR(500) NOT NULL,
            client_name VARCHAR(255),
            appointment_date DATE NOT NULL,
            appointment_time VARCHAR(10) NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 60,
            location VARCHAR(500),
            appointment_type VARCHAR(50) NOT NULL DEFAULT 'visit',
            notes TEXT,
            google_event_id VARCHAR(255),
            is_follow_up BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_appointments_created_by ON appointments (created_by);
        CREATE INDEX IF NOT EXISTS ix_appointments_date ON appointments (created_by, appointment_date);
        CREATE INDEX IF NOT EXISTS ix_appointments_client ON appointments (client_id);

        CREATE TABLE IF NOT EXISTS care_tracker_entries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_by UUID NOT NULL REFERENCES users(id),
            client_id UUID NOT NULL REFERENCES clients(id),
            caregiver_id UUID REFERENCES caregivers(id),
            stage VARCHAR(50) NOT NULL DEFAULT 'follow_up',
            priority VARCHAR(20) NOT NULL DEFAULT 'routine',
            care_specialty VARCHAR(100),
            start_date DATE,
            target_date DATE,
            last_contact DATE,
            next_follow_up DATE,
            notes TEXT,
            phone VARCHAR(50),
            assigned_to_name VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_care_tracker_created_by ON care_tracker_entries (created_by);
        CREATE INDEX IF NOT EXISTS ix_care_tracker_client ON care_tracker_entries (client_id);
        CREATE INDEX IF NOT EXISTS ix_care_tracker_stage ON care_tracker_entries (created_by, stage);

        CREATE TABLE IF NOT EXISTS client_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES clients(id),
            created_by UUID REFERENCES users(id),
            activity_type VARCHAR(50) NOT NULL,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_client_activities_client ON client_activities (client_id, created_at);
        CREATE INDEX IF NOT EXISTS ix_client_activities_type ON client_activities (activity_type);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE clients DROP COLUMN IF EXISTS converted_from_lead_id;
        ALTER TABLE clients DROP COLUMN IF EXISTS estimated_monthly_value;
        DROP TABLE IF EXISTS client_activities;
        DROP TABLE IF EXISTS care_tracker_entries;
        DROP TABLE IF EXISTS appointments;
        DROP TABLE IF EXISTS agency_leads;
        """
    )
