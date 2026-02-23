"""Add email sequence tracking, campaign events, and churn analytics

Revision ID: 025
Revises: 024
"""

from alembic import op
import sqlalchemy as sa

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        -- Email sequence tracking on sales_leads
        ALTER TABLE sales_leads
            ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS sequence_started_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS sequence_completed BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS next_email_scheduled_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS last_template_sent VARCHAR(100);

        -- Individual email campaign events for analytics
        CREATE TABLE IF NOT EXISTS email_campaign_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
            template_id VARCHAR(100) NOT NULL,
            campaign_tag VARCHAR(100),
            event_type VARCHAR(50) NOT NULL,  -- sent, delivered, opened, clicked, replied, bounced, complained
            resend_email_id VARCHAR(255),
            subject VARCHAR(500),
            to_email VARCHAR(255),
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_campaign_events_lead ON email_campaign_events(lead_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_template ON email_campaign_events(template_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON email_campaign_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON email_campaign_events(campaign_tag);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_created ON email_campaign_events(created_at);

        -- Churn / usage analytics
        CREATE TABLE IF NOT EXISTS usage_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            business_id UUID,
            event_type VARCHAR(100) NOT NULL,  -- login, page_view, feature_use, assessment_created, client_added, etc.
            event_data JSONB DEFAULT '{}'::jsonb,
            page_path VARCHAR(500),
            session_id VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_usage_analytics_user ON usage_analytics(user_id);
        CREATE INDEX IF NOT EXISTS idx_usage_analytics_event ON usage_analytics(event_type);
        CREATE INDEX IF NOT EXISTS idx_usage_analytics_created ON usage_analytics(created_at);
        CREATE INDEX IF NOT EXISTS idx_usage_analytics_business ON usage_analytics(business_id);

        -- Provider engagement scores (materialized per-business)
        CREATE TABLE IF NOT EXISTS provider_engagement (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            business_name VARCHAR(500),
            
            -- Activity metrics
            total_logins INTEGER DEFAULT 0,
            last_login_at TIMESTAMPTZ,
            logins_last_7d INTEGER DEFAULT 0,
            logins_last_30d INTEGER DEFAULT 0,
            
            -- Feature usage
            assessments_created INTEGER DEFAULT 0,
            clients_added INTEGER DEFAULT 0,
            contracts_generated INTEGER DEFAULT 0,
            notes_created INTEGER DEFAULT 0,
            
            -- Engagement scoring
            engagement_score DOUBLE PRECISION DEFAULT 0,  -- 0-100
            churn_risk VARCHAR(20) DEFAULT 'low',  -- low, medium, high, critical
            days_since_last_activity INTEGER DEFAULT 0,
            
            -- Subscription
            plan_tier VARCHAR(50),
            subscription_status VARCHAR(50),
            mrr DOUBLE PRECISION DEFAULT 0,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_provider_engagement_business ON provider_engagement(business_id);
        CREATE INDEX IF NOT EXISTS idx_provider_engagement_risk ON provider_engagement(churn_risk);
        CREATE INDEX IF NOT EXISTS idx_provider_engagement_score ON provider_engagement(engagement_score);
    """)


def downgrade():
    op.execute("""
        DROP TABLE IF EXISTS provider_engagement CASCADE;
        DROP TABLE IF EXISTS usage_analytics CASCADE;
        DROP TABLE IF EXISTS email_campaign_events CASCADE;
        ALTER TABLE sales_leads
            DROP COLUMN IF EXISTS sequence_step,
            DROP COLUMN IF EXISTS sequence_started_at,
            DROP COLUMN IF EXISTS sequence_completed,
            DROP COLUMN IF EXISTS next_email_scheduled_at,
            DROP COLUMN IF EXISTS last_template_sent;
    """)
