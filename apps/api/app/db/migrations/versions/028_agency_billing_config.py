"""Add billing configuration and rate fields to agency_settings

Lets the AI use each agency's actual rates and location instead of
hardcoded defaults when generating contracts.

Revision ID: 028
Revises: 027
"""

from alembic import op
import sqlalchemy as sa

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE agency_settings
            ADD COLUMN IF NOT EXISTS pay_sources          JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS service_types        JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS billing_type         VARCHAR(50) DEFAULT 'hourly',

            ADD COLUMN IF NOT EXISTS default_hourly_rate        NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS medicaid_companion_rate    NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS medicaid_personal_care_rate NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS medicaid_respite_rate      NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS medicare_skilled_rate      NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS medicare_aide_rate         NUMERIC(10,2),
            ADD COLUMN IF NOT EXISTS private_pay_rate           NUMERIC(10,2),

            ADD COLUMN IF NOT EXISTS overtime_multiplier   NUMERIC(4,2) DEFAULT 1.5,
            ADD COLUMN IF NOT EXISTS min_hours_per_visit   NUMERIC(4,1) DEFAULT 2.0,
            ADD COLUMN IF NOT EXISTS min_hours_per_week    NUMERIC(5,1) DEFAULT 4.0,
            ADD COLUMN IF NOT EXISTS max_hours_per_week    NUMERIC(5,1) DEFAULT 60.0,

            ADD COLUMN IF NOT EXISTS accepts_medicaid     BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS accepts_medicare     BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS accepts_private_pay  BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS accepts_insurance    BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS accepts_va           BOOLEAN DEFAULT FALSE,

            ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE agency_settings
            DROP COLUMN IF EXISTS pay_sources,
            DROP COLUMN IF EXISTS service_types,
            DROP COLUMN IF EXISTS billing_type,
            DROP COLUMN IF EXISTS default_hourly_rate,
            DROP COLUMN IF EXISTS medicaid_companion_rate,
            DROP COLUMN IF EXISTS medicaid_personal_care_rate,
            DROP COLUMN IF EXISTS medicaid_respite_rate,
            DROP COLUMN IF EXISTS medicare_skilled_rate,
            DROP COLUMN IF EXISTS medicare_aide_rate,
            DROP COLUMN IF EXISTS private_pay_rate,
            DROP COLUMN IF EXISTS overtime_multiplier,
            DROP COLUMN IF EXISTS min_hours_per_visit,
            DROP COLUMN IF EXISTS min_hours_per_week,
            DROP COLUMN IF EXISTS max_hours_per_week,
            DROP COLUMN IF EXISTS accepts_medicaid,
            DROP COLUMN IF EXISTS accepts_medicare,
            DROP COLUMN IF EXISTS accepts_private_pay,
            DROP COLUMN IF EXISTS accepts_insurance,
            DROP COLUMN IF EXISTS accepts_va,
            DROP COLUMN IF EXISTS onboarding_completed;
    """)
