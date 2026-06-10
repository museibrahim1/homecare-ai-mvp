"""Add "send from my business email" (Gmail OAuth) fields to users.

Lets caregivers/agencies connect their own mailbox so service agreements are
sent from their address. Tokens are stored encrypted at rest via the model's
encrypt/decrypt property wrappers.

Revision ID: 032
Revises: 031
"""
from alembic import op
import sqlalchemy as sa


revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_sender_connected", sa.Boolean(), nullable=True, server_default="false"))
    op.add_column("users", sa.Column("email_sender_provider", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("email_sender_address", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("email_sender_access_token", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("email_sender_refresh_token", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("email_sender_token_expiry", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE users SET email_sender_connected = false WHERE email_sender_connected IS NULL")
    op.alter_column("users", "email_sender_connected", nullable=False)


def downgrade():
    op.drop_column("users", "email_sender_token_expiry")
    op.drop_column("users", "email_sender_refresh_token")
    op.drop_column("users", "email_sender_access_token")
    op.drop_column("users", "email_sender_address")
    op.drop_column("users", "email_sender_provider")
    op.drop_column("users", "email_sender_connected")
