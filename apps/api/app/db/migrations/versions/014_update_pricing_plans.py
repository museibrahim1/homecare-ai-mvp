"""Update pricing plans with new tiers and limits

Revision ID: 014
Revises: 013_client_data_isolation
Create Date: 2026-01-29

Updates pricing:
- Starter: $299/mo, 1 seat, 5 contracts
- Growth: $599/mo, 10 seats, 25 contracts  
- Pro: $1299/mo, unlimited seats, unlimited contracts
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '014'
down_revision = '013_client_data_isolation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing plans or insert if not exists
    
    # First, update existing plans by name
    op.execute("""
        UPDATE plans SET 
            monthly_price = 299,
            annual_price = 3049,
            setup_fee = 0,
            max_users = 1,
            max_clients = 50,
            max_visits_per_month = 5,
            tier = 'starter',
            description = 'For small agencies getting organized',
            features = '["5 contracts per month", "AI billable extraction", "Automatic contract generation", "Care documentation exports", "1 team seat", "Secure cloud workspace", "Email support"]'
        WHERE name = 'Starter'
    """)
    
    op.execute("""
        UPDATE plans SET 
            monthly_price = 599,
            annual_price = 6109,
            setup_fee = 0,
            max_users = 10,
            max_clients = 200,
            max_visits_per_month = 25,
            tier = 'professional',
            description = 'For growing teams',
            features = '["25 contracts per month", "Everything in Starter", "10 team seats", "Advanced templates", "Timesheet exports", "Priority support"]'
        WHERE name = 'Growth'
    """)
    
    op.execute("""
        UPDATE plans SET 
            monthly_price = 1299,
            annual_price = 13249,
            setup_fee = 0,
            max_users = 9999,
            max_clients = 1000,
            max_visits_per_month = 9999,
            tier = 'enterprise',
            description = 'For high-volume teams',
            features = '["Unlimited contracts", "Everything in Growth", "Unlimited team seats", "Multi-location management", "Advanced analytics", "Custom templates", "Integrations & API", "Dedicated onboarding"]'
        WHERE name = 'Pro'
    """)
    
    # Insert Starter plan if it doesn't exist (may have been called Growth before)
    op.execute("""
        INSERT INTO plans (id, name, tier, description, monthly_price, annual_price, setup_fee, max_users, max_clients, max_visits_per_month, max_storage_gb, is_active, is_contact_sales, features)
        SELECT 
            gen_random_uuid(), 'Starter', 'starter', 'For small agencies getting organized', 299, 3049, 0, 1, 50, 5, 10, true, false, 
            '["5 contracts per month", "AI billable extraction", "Automatic contract generation", "Care documentation exports", "1 team seat", "Secure cloud workspace", "Email support"]'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Starter')
    """)
    
    # Insert Growth plan if it doesn't exist
    op.execute("""
        INSERT INTO plans (id, name, tier, description, monthly_price, annual_price, setup_fee, max_users, max_clients, max_visits_per_month, max_storage_gb, is_active, is_contact_sales, features)
        SELECT 
            gen_random_uuid(), 'Growth', 'professional', 'For growing teams', 599, 6109, 0, 10, 200, 25, 50, true, false,
            '["25 contracts per month", "Everything in Starter", "10 team seats", "Advanced templates", "Timesheet exports", "Priority support"]'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Growth')
    """)
    
    # Insert Pro plan if it doesn't exist
    op.execute("""
        INSERT INTO plans (id, name, tier, description, monthly_price, annual_price, setup_fee, max_users, max_clients, max_visits_per_month, max_storage_gb, is_active, is_contact_sales, features)
        SELECT 
            gen_random_uuid(), 'Pro', 'enterprise', 'For high-volume teams', 1299, 13249, 0, 9999, 1000, 9999, 500, true, false,
            '["Unlimited contracts", "Everything in Growth", "Unlimited team seats", "Multi-location management", "Advanced analytics", "Custom templates", "Integrations & API", "Dedicated onboarding"]'
        WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Pro')
    """)


def downgrade() -> None:
    # Revert to previous pricing (optional - pricing changes are typically not rolled back)
    op.execute("""
        UPDATE plans SET 
            monthly_price = 295,
            annual_price = 3009,
            max_users = 3,
            max_visits_per_month = 25
        WHERE name = 'Starter'
    """)
    
    op.execute("""
        UPDATE plans SET 
            monthly_price = 495,
            annual_price = 5049,
            max_visits_per_month = 100
        WHERE name = 'Growth'
    """)
    
    op.execute("""
        UPDATE plans SET 
            monthly_price = 895,
            annual_price = 9129,
            max_visits_per_month = 300
        WHERE name = 'Pro'
    """)
