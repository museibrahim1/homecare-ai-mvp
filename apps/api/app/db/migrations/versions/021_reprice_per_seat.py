"""Reprice plans to per-seat model

Revision ID: 021
Revises: 020
Create Date: 2026-02-21

New pricing:
- Starter: 29 seats, $379.99/mo ($13.10/seat)
- Growth:  49 seats, $639.99/mo ($13.06/seat)
- Pro:     99 seats, $1,299/mo  ($13.13/seat)
"""
from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE plans SET
            monthly_price = 379.99,
            annual_price = 3876,
            max_users = 29,
            max_clients = 20,
            max_visits_per_month = 5,
            description = '29 seats at $13.10/seat',
            features = '["5 contracts per month", "20 clients in CRM", "10 caregivers", "29 seats included", "AI billable extraction", "Contract generation", "PDF exports", "Email support"]'
        WHERE name = 'Starter'
    """)

    op.execute("""
        UPDATE plans SET
            monthly_price = 639.99,
            annual_price = 6528,
            max_users = 49,
            max_clients = 75,
            max_visits_per_month = 15,
            description = '49 seats at $13.06/seat',
            features = '["15 contracts per month", "75 clients in CRM", "40 caregivers", "49 seats included", "Everything in Starter", "Advanced templates", "Timesheet exports", "Priority support"]'
        WHERE name = 'Growth'
    """)

    op.execute("""
        UPDATE plans SET
            monthly_price = 1299,
            annual_price = 13250,
            max_users = 99,
            max_clients = 500,
            max_visits_per_month = 9999,
            description = '99 seats at $13.13/seat',
            features = '["Unlimited contracts", "500 clients in CRM", "200 caregivers", "99 seats included", "Everything in Growth", "Multi-location management", "Advanced analytics", "Integrations & API", "Dedicated onboarding"]'
        WHERE name = 'Pro'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE plans SET
            monthly_price = 299, annual_price = 3049,
            max_users = 1, max_clients = 50, max_visits_per_month = 5,
            description = 'For small agencies getting organized'
        WHERE name = 'Starter'
    """)
    op.execute("""
        UPDATE plans SET
            monthly_price = 599, annual_price = 6109,
            max_users = 10, max_clients = 200, max_visits_per_month = 25,
            description = 'For growing teams'
        WHERE name = 'Growth'
    """)
    op.execute("""
        UPDATE plans SET
            monthly_price = 1299, annual_price = 13249,
            max_users = 9999, max_clients = 1000, max_visits_per_month = 9999,
            description = 'For high-volume teams'
        WHERE name = 'Pro'
    """)
