"""Drop circular FK clients.converted_from_lead_id -> agency_leads

Revision ID: 042
Revises: 041
Create Date: 2026-08-25

clients.converted_from_lead_id stays as a plain UUID; agency_leads.converted_client_id
keeps the FK to clients. Avoids circular DROP issues in tests and migrations.
"""
from alembic import op

revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS fk_clients_converted_from_lead;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE clients
            ADD CONSTRAINT fk_clients_converted_from_lead
            FOREIGN KEY (converted_from_lead_id) REFERENCES agency_leads(id)
            NOT VALID;
        """
    )
