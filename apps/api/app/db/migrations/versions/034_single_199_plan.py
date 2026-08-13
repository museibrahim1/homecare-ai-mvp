"""Collapse pricing to a single $199/month plan

Revision ID: 034
Revises: 033
Create Date: 2026-08-13

PalmCare now sells one plan: $199/month, everything included, 14 day free
trial. The STARTER-tier row becomes the single active "PalmCare AI" plan
(matching the com.palmcareai.app.starter.monthly product ID, already priced
at $199 in App Store Connect). The Growth, Professional, and Enterprise rows
are deactivated so they no longer appear on the public pricing surface, but
they are left in place so existing subscriptions that reference them keep
resolving.
"""
from alembic import op

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


UNLIMITED_FEATURES = (
    '["Unlimited AI assessments", "Unlimited team members", '
    '"AI voice to contract", "Smart SOAP notes", '
    '"Advanced analytics and reporting", "Custom contract templates", '
    '"50 state compliance engine", "HIPAA BAA included", '
    '"Priority support", "250 GB storage", "14 day free trial"]'
)


def upgrade() -> None:
    # The single active plan (STARTER tier → $199, everything included).
    op.execute(
        f"""
        UPDATE plans SET
            name = 'PalmCare AI',
            description = 'One plan, everything included. Unlimited assessments, unlimited team members, and a 14 day free trial.',
            monthly_price = 199,
            annual_price = 0,
            setup_fee = 0,
            max_users = 999,
            max_clients = 9999,
            max_visits_per_month = 99999,
            max_storage_gb = 250,
            is_contact_sales = false,
            is_active = true,
            features = '{UNLIMITED_FEATURES}'
        WHERE tier = 'starter'
        """
    )

    # Retire the legacy tiers (kept for existing subscription rows).
    op.execute(
        """
        UPDATE plans SET
            is_active = false,
            monthly_price = 199,
            annual_price = 0
        WHERE tier IN ('growth', 'professional', 'enterprise')
        """
    )


def downgrade() -> None:
    # Restore the prior three-tier prices (best-effort; pricing rollbacks are
    # not usually exercised).
    op.execute(
        """
        UPDATE plans SET
            name = 'Starter', monthly_price = 199, annual_price = 1899.99,
            max_users = 5, max_clients = 50, max_visits_per_month = 20,
            max_storage_gb = 10, is_active = true
        WHERE tier = 'starter'
        """
    )
    op.execute(
        """
        UPDATE plans SET
            monthly_price = 699, annual_price = 6699.99, is_active = true
        WHERE tier = 'growth'
        """
    )
    op.execute(
        """
        UPDATE plans SET
            monthly_price = 1199.99, annual_price = 10000, is_active = true
        WHERE tier = 'enterprise'
        """
    )
