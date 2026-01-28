"""Add admin features: subscriptions, support tickets

Revision ID: 009
Revises: 008
Create Date: 2025-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create plans table
    op.create_table(
        'plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('tier', sa.String(20), nullable=False, default='free'),
        sa.Column('description', sa.Text),
        sa.Column('monthly_price', sa.Numeric(10, 2), default=0),
        sa.Column('annual_price', sa.Numeric(10, 2), default=0),
        sa.Column('setup_fee', sa.Numeric(10, 2), default=0),
        # Stripe integration
        sa.Column('stripe_product_id', sa.String(255)),
        sa.Column('stripe_price_id_monthly', sa.String(255)),
        sa.Column('stripe_price_id_annual', sa.String(255)),
        sa.Column('stripe_price_id_setup', sa.String(255)),
        # Limits
        sa.Column('max_users', sa.Integer, default=1),
        sa.Column('max_clients', sa.Integer, default=10),
        sa.Column('max_visits_per_month', sa.Integer, default=50),
        sa.Column('max_storage_gb', sa.Integer, default=1),
        sa.Column('features', sa.Text),
        sa.Column('is_contact_sales', sa.Boolean, default=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('plans.id'), nullable=False),
        sa.Column('status', sa.String(20), default='trial'),
        sa.Column('billing_cycle', sa.String(20), default='monthly'),
        sa.Column('current_period_start', sa.DateTime(timezone=True)),
        sa.Column('current_period_end', sa.DateTime(timezone=True)),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True)),
        sa.Column('stripe_subscription_id', sa.String(255)),
        sa.Column('stripe_customer_id', sa.String(255)),
        sa.Column('visits_this_month', sa.Integer, default=0),
        sa.Column('storage_used_mb', sa.Integer, default=0),
        sa.Column('cancelled_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_subscriptions_business', 'subscriptions', ['business_id'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    
    # Create invoices table
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('subscription_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('subscriptions.id'), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('businesses.id'), nullable=False),
        sa.Column('invoice_number', sa.String(50), unique=True),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('invoice_date', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('due_date', sa.DateTime(timezone=True)),
        sa.Column('paid_at', sa.DateTime(timezone=True)),
        sa.Column('stripe_invoice_id', sa.String(255)),
        sa.Column('description', sa.Text),
        sa.Column('line_items', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create support_tickets table
    op.create_table(
        'support_tickets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ticket_number', sa.String(20), unique=True, nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('businesses.id')),
        sa.Column('submitted_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('submitted_by_email', sa.String(255), nullable=False),
        sa.Column('submitted_by_name', sa.String(255)),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('category', sa.String(30), default='general'),
        sa.Column('priority', sa.String(20), default='medium'),
        sa.Column('status', sa.String(30), default='open'),
        sa.Column('assigned_to_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('resolution', sa.Text),
        sa.Column('resolved_at', sa.DateTime(timezone=True)),
        sa.Column('resolved_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('first_response_at', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_support_tickets_status', 'support_tickets', ['status'])
    op.create_index('ix_support_tickets_business', 'support_tickets', ['business_id'])
    
    # Create ticket_responses table
    op.create_table(
        'ticket_responses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('support_tickets.id'), nullable=False),
        sa.Column('responder_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('responder_email', sa.String(255), nullable=False),
        sa.Column('responder_name', sa.String(255)),
        sa.Column('is_admin_response', sa.String(10), default='false'),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('attachments', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_ticket_responses_ticket', 'ticket_responses', ['ticket_id'])
    
    # Seed default plans - Business pricing model
    op.execute("""
        INSERT INTO plans (id, name, tier, description, monthly_price, annual_price, setup_fee, max_users, max_clients, max_visits_per_month, max_storage_gb, is_active, is_contact_sales, features)
        VALUES 
        (gen_random_uuid(), 'Growth', 'starter', 'Built for growing home healthcare agencies', 899, 8091, 1500, 5, 500, 9999, 50, true, false, 
         '["Unlimited assessments & transcripts", "AI billable extraction", "Automatic contract generation", "Care documentation exports", "Billing-ready reports", "Up to 5 admin users", "Secure cloud workspace", "Fast onboarding"]'),
        (gen_random_uuid(), 'Pro', 'professional', 'For multi-location and high-volume teams', 1499, 13491, 2500, 9999, 9999, 9999, 500, true, false,
         '["Everything in Growth", "Unlimited users", "Multi-location management", "Advanced analytics", "Custom templates", "Integrations & API", "Priority support", "Dedicated onboarding"]'),
        (gen_random_uuid(), 'Enterprise', 'enterprise', 'Custom solutions for large organizations', 0, 0, 0, 9999, 9999, 9999, 9999, true, true,
         '["Everything in Pro", "Custom integrations", "Dedicated account manager", "SLA guarantees", "Custom contracts", "On-premise option", "White-label available"]')
    """)


def downgrade() -> None:
    op.drop_table('ticket_responses')
    op.drop_table('support_tickets')
    op.drop_table('invoices')
    op.drop_table('subscriptions')
    op.drop_table('plans')
