"""Create investors table for fundraising CRM

Revision ID: 027
Revises: 026
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS investors (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fund_name VARCHAR(500) NOT NULL,
            investor_type VARCHAR(50) DEFAULT 'vc_fund',
            website VARCHAR(500),
            description TEXT,
            focus_sectors JSONB DEFAULT '[]'::jsonb,
            focus_stages JSONB DEFAULT '[]'::jsonb,
            check_size_min VARCHAR(50),
            check_size_max VARCHAR(50),
            check_size_display VARCHAR(100),
            location VARCHAR(255),
            contact_name VARCHAR(255),
            contact_email VARCHAR(255),
            contact_title VARCHAR(255),
            contact_linkedin VARCHAR(500),
            contact_twitter VARCHAR(255),
            relevance_reason TEXT,
            portfolio_companies JSONB DEFAULT '[]'::jsonb,
            source VARCHAR(100) DEFAULT 'vcsheet.com',
            status VARCHAR(50) DEFAULT 'new' NOT NULL,
            priority VARCHAR(20) DEFAULT 'medium' NOT NULL,
            notes TEXT,
            last_email_sent_at TIMESTAMPTZ,
            last_email_subject VARCHAR(500),
            email_send_count INTEGER DEFAULT 0,
            email_open_count INTEGER DEFAULT 0,
            last_email_opened_at TIMESTAMPTZ,
            last_response_at TIMESTAMPTZ,
            resend_email_id VARCHAR(255),
            campaign_tag VARCHAR(100),
            activity_log JSONB DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_investors_fund_name ON investors(fund_name);
        CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);
        CREATE INDEX IF NOT EXISTS idx_investors_campaign_tag ON investors(campaign_tag);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS investors;")
