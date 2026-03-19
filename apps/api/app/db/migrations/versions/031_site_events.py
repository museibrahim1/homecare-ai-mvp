"""Add site_events table for public analytics (clicks, page views, funnel tracking)."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "site_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.String(64), nullable=False, index=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("page_path", sa.String(500), nullable=True, index=True),
        sa.Column("element_id", sa.String(200), nullable=True),
        sa.Column("element_text", sa.String(500), nullable=True),
        sa.Column("element_tag", sa.String(50), nullable=True),
        sa.Column("click_x", sa.Integer, nullable=True),
        sa.Column("click_y", sa.Integer, nullable=True),
        sa.Column("viewport_w", sa.Integer, nullable=True),
        sa.Column("viewport_h", sa.Integer, nullable=True),
        sa.Column("funnel_step", sa.Integer, nullable=True, index=True),
        sa.Column("funnel_name", sa.String(100), nullable=True, index=True),
        sa.Column("referrer", sa.String(1000), nullable=True),
        sa.Column("user_agent", sa.String(1000), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True, index=True),
        sa.Column("metadata", sa.JSON, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("ix_site_events_created_at", "site_events", ["created_at"])
    op.create_index(
        "ix_site_events_funnel",
        "site_events",
        ["funnel_name", "funnel_step", "created_at"],
    )


def downgrade():
    op.drop_table("site_events")
