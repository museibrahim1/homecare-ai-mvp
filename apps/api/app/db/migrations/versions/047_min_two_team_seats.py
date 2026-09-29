"""Guarantee owner + one teammate on every plan (min max_users = 2)

Revision ID: 047
Revises: 046
Create Date: 2026-09-29

Mobile/Free catalog rows were seeded with max_users = 1, which blocked the
first staff invite. Product rule: every agency can add at least one user
outside the main account.
"""
from alembic import op

revision = "047"
down_revision = "046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE plans
        SET max_users = 2
        WHERE max_users IS NULL OR max_users < 2
        """
    )


def downgrade() -> None:
    # Restore prior Mobile default only; other tiers were already >= 2.
    op.execute(
        """
        UPDATE plans
        SET max_users = 1
        WHERE tier = 'mobile' AND max_users = 2
        """
    )
