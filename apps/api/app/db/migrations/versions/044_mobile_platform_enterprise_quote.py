"""Update plan prices to Mobile $89.99 / Platform $199.99 and Enterprise quote

Revision ID: 044
Revises: 043
Create Date: 2026-08-26

Aligns DB plan rows with the public catalog:
- mobile: $89.99 / month (iPhone assessments only)
- starter (Platform): $199.99 / month (web CRM + mobile)
- enterprise: contact-sales / request-a-quote (no self-serve price)
"""
from alembic import op

revision = "044"
down_revision = "043"
branch_labels = None
depends_on = None

MOBILE_FEATURES = (
    '["Unlimited AI assessments on iPhone", "AI voice to contract", '
    '"Smart SOAP notes and billables", "50-state compliance engine", '
    '"HIPAA BAA included", "iPhone app access", "30 day free trial"]'
)

PLATFORM_FEATURES = (
    '["Everything in Mobile", "Web CRM and pipeline", "Unlimited team seats", '
    '"Custom contract templates", "Priority support", "250 GB storage", '
    '"30 day free trial"]'
)

ENTERPRISE_FEATURES = (
    '["Everything in Platform", "Custom assessment and seat limits", '
    '"SSO and advanced admin controls", "Dedicated success manager", '
    '"Volume pricing"]'
)


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE plans SET
            name = 'PalmCare Mobile',
            description = 'iPhone assessments only. Record the visit and PALM writes notes, billables, and the contract.',
            monthly_price = 89.99,
            annual_price = 0,
            max_users = 1,
            max_clients = 50,
            max_visits_per_month = 99999,
            max_storage_gb = 50,
            is_active = true,
            is_contact_sales = false,
            features = '{MOBILE_FEATURES}'
        WHERE tier = 'mobile'
        """
    )

    op.execute(
        f"""
        INSERT INTO plans (
            id, name, tier, description,
            monthly_price, annual_price, setup_fee,
            max_users, max_clients, max_visits_per_month, max_storage_gb,
            is_active, is_contact_sales, features
        )
        SELECT
            gen_random_uuid(),
            'PalmCare Mobile',
            'mobile',
            'iPhone assessments only. Record the visit and PALM writes notes, billables, and the contract.',
            89.99, 0, 0, 1, 50, 99999, 50, true, false,
            '{MOBILE_FEATURES}'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE tier = 'mobile')
        """
    )

    op.execute(
        f"""
        UPDATE plans SET
            name = 'PalmCare Platform',
            description = 'Full platform: web CRM, team seats, analytics, and unlimited assessments on iPhone and web.',
            monthly_price = 199.99,
            is_active = true,
            is_contact_sales = false,
            features = '{PLATFORM_FEATURES}'
        WHERE tier = 'starter'
        """
    )

    op.execute(
        f"""
        UPDATE plans SET
            name = 'Enterprise',
            description = 'Custom quote for multi-location agencies. Contact sales.',
            monthly_price = 0,
            annual_price = 0,
            is_active = true,
            is_contact_sales = true,
            features = '{ENTERPRISE_FEATURES}'
        WHERE tier IN ('enterprise', 'professional')
        """
    )

    op.execute(
        f"""
        INSERT INTO plans (
            id, name, tier, description,
            monthly_price, annual_price, setup_fee,
            max_users, max_clients, max_visits_per_month, max_storage_gb,
            is_active, is_contact_sales, features
        )
        SELECT
            gen_random_uuid(),
            'Enterprise',
            'enterprise',
            'Custom quote for multi-location agencies. Contact sales.',
            0, 0, 0, 999, 99999, 99999, 1000, true, true,
            '{ENTERPRISE_FEATURES}'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE tier = 'enterprise')
        """
    )

    # Keep legacy Growth rows inactive so they cannot be selected.
    op.execute(
        """
        UPDATE plans SET is_active = false
        WHERE tier = 'growth'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE plans SET monthly_price = 80, name = 'PalmCare Mobile'
        WHERE tier = 'mobile'
        """
    )
    op.execute(
        """
        UPDATE plans SET monthly_price = 199, name = 'PalmCare Platform'
        WHERE tier = 'starter'
        """
    )
