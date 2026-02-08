"""Add missing database indexes for query performance

Revision ID: 019
Revises: 018
Create Date: 2026-01-29

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '019'
down_revision = '018'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # visits table — frequently joined/filtered columns
    op.create_index('ix_visits_client_id', 'visits', ['client_id'], if_not_exists=True)
    op.create_index('ix_visits_caregiver_id', 'visits', ['caregiver_id'], if_not_exists=True)
    op.create_index('ix_visits_status', 'visits', ['status'], if_not_exists=True)

    # caregivers table
    op.create_index('ix_caregivers_created_by', 'caregivers', ['created_by'], if_not_exists=True)
    op.create_index('ix_caregivers_status', 'caregivers', ['status'], if_not_exists=True)
    op.create_index('ix_caregivers_email', 'caregivers', ['email'], if_not_exists=True)

    # contracts table
    op.create_index('ix_contracts_client_id', 'contracts', ['client_id'], if_not_exists=True)
    op.create_index('ix_contracts_status', 'contracts', ['status'], if_not_exists=True)

    # clients table — created_by for data isolation queries
    op.create_index('ix_clients_created_by', 'clients', ['created_by'], if_not_exists=True)


def downgrade() -> None:
    op.drop_index('ix_clients_created_by', table_name='clients')
    op.drop_index('ix_contracts_status', table_name='contracts')
    op.drop_index('ix_contracts_client_id', table_name='contracts')
    op.drop_index('ix_caregivers_email', table_name='caregivers')
    op.drop_index('ix_caregivers_status', table_name='caregivers')
    op.drop_index('ix_caregivers_created_by', table_name='caregivers')
    op.drop_index('ix_visits_status', table_name='visits')
    op.drop_index('ix_visits_caregiver_id', table_name='visits')
    op.drop_index('ix_visits_client_id', table_name='visits')
