"""Add sales_leads table for CEO outbound CRM

Revision ID: 023
Revises: 022
"""

from alembic import op
import sqlalchemy as sa

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS sales_leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- CMS provider data
            provider_name VARCHAR(500) NOT NULL,
            state VARCHAR(2) NOT NULL,
            city VARCHAR(255),
            address VARCHAR(500),
            zip_code VARCHAR(10),
            phone VARCHAR(20),
            ownership_type VARCHAR(100),
            ccn VARCHAR(20) UNIQUE,
            certification_date VARCHAR(20),
            years_in_operation DOUBLE PRECISION,
            star_rating VARCHAR(10),
            
            -- Services offered
            offers_nursing BOOLEAN DEFAULT false,
            offers_pt BOOLEAN DEFAULT false,
            offers_ot BOOLEAN DEFAULT false,
            offers_speech BOOLEAN DEFAULT false,
            offers_social BOOLEAN DEFAULT false,
            offers_aide BOOLEAN DEFAULT false,
            
            -- Contact info (manually added by CEO)
            contact_name VARCHAR(255),
            contact_email VARCHAR(255),
            contact_title VARCHAR(255),
            website VARCHAR(500),
            
            -- Outreach tracking
            status VARCHAR(50) NOT NULL DEFAULT 'new',
            priority VARCHAR(20) NOT NULL DEFAULT 'medium',
            notes TEXT,
            
            -- Email campaign tracking
            last_email_sent_at TIMESTAMPTZ,
            last_email_subject VARCHAR(500),
            email_send_count INTEGER DEFAULT 0,
            email_open_count INTEGER DEFAULT 0,
            last_email_opened_at TIMESTAMPTZ,
            last_response_at TIMESTAMPTZ,
            resend_email_id VARCHAR(255),
            
            -- Campaign tagging
            campaign_tag VARCHAR(100),
            source VARCHAR(100) DEFAULT 'cms_provider_data',
            
            -- Conversion tracking
            is_contacted BOOLEAN DEFAULT false,
            is_converted BOOLEAN DEFAULT false,
            converted_at TIMESTAMPTZ,
            
            -- Activity log
            activity_log JSONB DEFAULT '[]'::jsonb,
            
            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_sales_leads_state ON sales_leads(state);
        CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON sales_leads(status);
        CREATE INDEX IF NOT EXISTS idx_sales_leads_priority ON sales_leads(priority);
        CREATE INDEX IF NOT EXISTS idx_sales_leads_campaign ON sales_leads(campaign_tag);
        CREATE INDEX IF NOT EXISTS idx_sales_leads_name ON sales_leads(provider_name);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS sales_leads CASCADE;")
