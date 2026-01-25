"""Business authentication and verification tables

Revision ID: 002_business_auth
Revises: 001_initial
Create Date: 2024-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_business_auth'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE verification_status AS ENUM (
                'pending', 'sos_verified', 'documents_submitted', 
                'approved', 'rejected', 'suspended'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE entity_type AS ENUM (
                'llc', 'corporation', 's_corp', 'partnership', 
                'sole_proprietorship', 'nonprofit', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE document_type AS ENUM (
                'business_license', 'home_care_license', 'liability_insurance',
                'workers_comp', 'w9', 'articles_of_incorporation',
                'certificate_of_good_standing', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM (
                'owner', 'admin', 'manager', 'staff'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create businesses table
    op.create_table(
        'businesses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, 
                  server_default=sa.text('gen_random_uuid()')),
        
        # Business Identity
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('dba_name', sa.String(255)),
        sa.Column('entity_type', postgresql.ENUM('llc', 'corporation', 's_corp', 
                  'partnership', 'sole_proprietorship', 'nonprofit', 'other', 
                  name='entity_type', create_type=False), default='llc'),
        
        # State Registration
        sa.Column('state_of_incorporation', sa.String(2), nullable=False),
        sa.Column('registration_number', sa.String(100)),
        sa.Column('ein', sa.String(255)),  # Encrypted
        
        # Contact
        sa.Column('address', sa.Text),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(2)),
        sa.Column('zip_code', sa.String(20)),
        sa.Column('phone', sa.String(20)),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('website', sa.String(255)),
        
        # Verification
        sa.Column('verification_status', postgresql.ENUM('pending', 'sos_verified', 
                  'documents_submitted', 'approved', 'rejected', 'suspended',
                  name='verification_status', create_type=False), default='pending'),
        sa.Column('sos_verification_data', postgresql.JSONB),
        sa.Column('sos_verified_at', sa.DateTime(timezone=True)),
        
        # Approval
        sa.Column('approved_at', sa.DateTime(timezone=True)),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True)),
        sa.Column('rejection_reason', sa.Text),
        
        # Settings
        sa.Column('logo_url', sa.String(500)),
        sa.Column('primary_color', sa.String(7), default='#6366f1'),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), 
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), 
                  server_default=sa.text('NOW()')),
    )
    
    # Create indexes for businesses
    op.create_index('idx_businesses_email', 'businesses', ['email'])
    op.create_index('idx_businesses_status', 'businesses', ['verification_status'])
    op.create_index('idx_businesses_state', 'businesses', ['state_of_incorporation'])
    
    # Create business_documents table
    op.create_table(
        'business_documents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), 
                  sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        
        # Document Info
        sa.Column('document_type', postgresql.ENUM('business_license', 'home_care_license',
                  'liability_insurance', 'workers_comp', 'w9', 'articles_of_incorporation',
                  'certificate_of_good_standing', 'other', 
                  name='document_type', create_type=False), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.String(50)),
        sa.Column('mime_type', sa.String(100)),
        
        # Verification
        sa.Column('is_verified', sa.Boolean, default=False),
        sa.Column('verified_at', sa.DateTime(timezone=True)),
        sa.Column('verified_by', postgresql.UUID(as_uuid=True)),
        sa.Column('verification_notes', sa.Text),
        
        # Expiration
        sa.Column('expiration_date', sa.Date),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
    )
    
    # Create indexes for business_documents
    op.create_index('idx_business_documents_business', 'business_documents', ['business_id'])
    op.create_index('idx_business_documents_type', 'business_documents', ['document_type'])
    
    # Create business_users table
    op.create_table(
        'business_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('business_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False),
        
        # User Info
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(20)),
        
        # Authentication
        sa.Column('password_hash', sa.String(255), nullable=False),
        
        # Role & Status
        sa.Column('role', postgresql.ENUM('owner', 'admin', 'manager', 'staff',
                  name='user_role', create_type=False), default='staff'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_owner', sa.Boolean, default=False),
        
        # Email Verification
        sa.Column('email_verified', sa.Boolean, default=False),
        sa.Column('email_verification_token', sa.String(255)),
        sa.Column('email_verified_at', sa.DateTime(timezone=True)),
        
        # Password Reset
        sa.Column('password_reset_token', sa.String(255)),
        sa.Column('password_reset_expires', sa.DateTime(timezone=True)),
        
        # Activity
        sa.Column('last_login', sa.DateTime(timezone=True)),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
    )
    
    # Create indexes for business_users
    op.create_index('idx_business_users_email', 'business_users', ['email'])
    op.create_index('idx_business_users_business', 'business_users', ['business_id'])
    op.create_index('idx_business_users_role', 'business_users', ['role'])


def downgrade() -> None:
    # Drop tables
    op.drop_table('business_users')
    op.drop_table('business_documents')
    op.drop_table('businesses')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS user_role')
    op.execute('DROP TYPE IF EXISTS document_type')
    op.execute('DROP TYPE IF EXISTS entity_type')
    op.execute('DROP TYPE IF EXISTS verification_status')
