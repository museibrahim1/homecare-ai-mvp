"""Add agreement_send tracking JSONB on visits

Revision ID: 036
Revises: 035
Create Date: 2026-08-15

Stores the latest agreement email send for a visit so caregivers can see
sent / awaiting signature / signed / bounced without restarting the flow.
Gmail sends start as "sent"; caregivers can mark signed or bounced.
"""
from alembic import op

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE visits
            ADD COLUMN IF NOT EXISTS agreement_send JSONB;

        COMMENT ON COLUMN visits.agreement_send IS
            'Latest agreement email send: recipient, status (sent|delivered|opened|bounced|signed), timestamps';
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE visits
            DROP COLUMN IF EXISTS agreement_send;
        """
    )
