"""Add incidents and incident_updates tables for status page

Revision ID: 020
Revises: 019
Create Date: 2026-01-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(500) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'investigating',
            impact VARCHAR(50) NOT NULL DEFAULT 'minor',
            service_name VARCHAR(100) NOT NULL DEFAULT 'PalmCare AI Platform',
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_incidents_status ON incidents (status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_incidents_created_at ON incidents (created_at)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS incident_updates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_incident_updates_incident_id ON incident_updates (incident_id)")


def downgrade() -> None:
    op.drop_table("incident_updates")
    op.drop_table("incidents")
