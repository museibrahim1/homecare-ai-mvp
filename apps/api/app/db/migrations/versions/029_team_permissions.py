"""Add team permissions, invited_by, and temp_password to users table

Revision ID: 029
Revises: 028
"""

from alembic import op
import sqlalchemy as sa

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("permissions", sa.JSON(), nullable=True, server_default="[]"))
    op.add_column("users", sa.Column("invited_by", sa.String(36), nullable=True))
    op.add_column("users", sa.Column("temp_password", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("users", "permissions")
    op.drop_column("users", "invited_by")
    op.drop_column("users", "temp_password")
