"""Add PalmCare Mobile plan ($80/mo, iPhone assessments only)

Revision ID: 040
Revises: 039
Create Date: 2026-08-24

Adds the `mobile` plan tier for the $80/month iPhone-only assessment plan
(com.palmcareai.app.mobile.monthly in App Store Connect). The existing
$199 starter tier remains the full web + mobile platform plan.
"""
from alembic import op

revision = "040"
down_revision = "039"
branch_labels = None
depends_on = None

MOBILE_FEATURES = (
    '["Unlimited AI assessments on iPhone", "AI voice to contract", '
    '"Smart SOAP notes and billables", "50-state compliance engine", '
    '"HIPAA BAA included", "iPhone app access", "30 day free trial"]'
)


def upgrade() -> None:
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
            'Assessments on iPhone. Record the visit and PALM writes notes, billables, and the contract. Upgrade to PalmCare Platform for web CRM and team seats.',
            80,
            0,
            0,
            1,
            50,
            99999,
            50,
            true,
            false,
            '{MOBILE_FEATURES}'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE tier = 'mobile')
        """
    )

    # Clarify the full-platform plan name on the public pricing surface.
    op.execute(
        """
        UPDATE plans SET
            name = 'PalmCare Platform',
            description = 'Full platform: web CRM, team seats, analytics, and unlimited assessments on iPhone and web.'
        WHERE tier = 'starter' AND is_active = true
        """
    )


def downgrade() -> None:
    op.execute("UPDATE plans SET is_active = false WHERE tier = 'mobile'")
    op.execute(
        """
        UPDATE plans SET
            name = 'PalmCare AI',
            description = 'One plan, everything included. Unlimited assessments, unlimited team members, and a 14 day free trial.'
        WHERE tier = 'starter'
        """
    )
