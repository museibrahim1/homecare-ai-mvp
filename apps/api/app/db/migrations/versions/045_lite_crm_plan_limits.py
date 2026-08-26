"""Lite CRM limits: Mobile 15 assessments / 30 clients; Platform 30 / 150

Revision ID: 045
Revises: 044
Create Date: 2026-08-26

Mobile includes lite web CRM with caps. Platform raises caps.
Enterprise stays contact-sales / custom.
"""
from alembic import op

revision = "045"
down_revision = "044"
branch_labels = None
depends_on = None

MOBILE_FEATURES = (
    '["15 AI assessments per month", "Lite web CRM (30 clients)", '
    '"AI voice to contract", "Smart SOAP notes and billables", '
    '"50-state compliance engine", "HIPAA BAA included", '
    '"iPhone app access", "30 day free trial"]'
)

PLATFORM_FEATURES = (
    '["30 AI assessments per month", "Web CRM (150 clients)", '
    '"Everything in Mobile", "Team seats and pipeline", '
    '"Custom contract templates", "Priority support", '
    '"250 GB storage", "30 day free trial"]'
)


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE plans SET
            name = 'PalmCare Mobile',
            description = 'Assessments on iPhone plus lite web CRM. 15 assessments and 30 clients per month.',
            monthly_price = 89.99,
            max_users = 1,
            max_clients = 30,
            max_visits_per_month = 15,
            max_storage_gb = 50,
            is_active = true,
            is_contact_sales = false,
            features = '{MOBILE_FEATURES}'
        WHERE tier = 'mobile'
        """
    )

    op.execute(
        f"""
        UPDATE plans SET
            name = 'PalmCare Platform',
            description = 'Full platform: web CRM, team seats, and 30 assessments per month (150 clients).',
            monthly_price = 199.99,
            max_users = 999,
            max_clients = 150,
            max_visits_per_month = 30,
            max_storage_gb = 250,
            is_active = true,
            is_contact_sales = false,
            features = '{PLATFORM_FEATURES}'
        WHERE tier = 'starter'
        """
    )

    op.execute(
        """
        UPDATE plans SET
            name = 'Enterprise',
            description = 'Custom formula pricing and features for multi-location agencies. Request a quote.',
            monthly_price = 0,
            annual_price = 0,
            max_users = 9999,
            max_clients = 99999,
            max_visits_per_month = 99999,
            is_active = true,
            is_contact_sales = true
        WHERE tier IN ('enterprise', 'professional')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE plans SET max_clients = 50, max_visits_per_month = 99999
        WHERE tier = 'mobile'
        """
    )
    op.execute(
        """
        UPDATE plans SET max_clients = 9999, max_visits_per_month = 99999
        WHERE tier = 'starter'
        """
    )
