"""Add calls table for Twilio call bridge recording

Revision ID: 003_calls
Revises: 002_business_auth
Create Date: 2024-01-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_calls'
down_revision = '002_business_auth'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create call status enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE call_status AS ENUM (
                'initiated', 'caregiver_ringing', 'caregiver_connected',
                'client_ringing', 'in_progress', 'completed',
                'failed', 'no_answer', 'busy', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create calls table
    op.create_table(
        'calls',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        
        # Twilio identifiers
        sa.Column('caregiver_call_sid', sa.String(50)),
        sa.Column('client_call_sid', sa.String(50)),
        sa.Column('conference_sid', sa.String(50)),
        sa.Column('recording_sid', sa.String(50)),
        
        # Related entities
        sa.Column('visit_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('visits.id', ondelete='SET NULL'), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        
        # Phone numbers
        sa.Column('caregiver_phone', sa.String(20), nullable=False),
        sa.Column('client_phone', sa.String(20), nullable=False),
        sa.Column('twilio_phone', sa.String(20)),
        
        # Status
        sa.Column('status', postgresql.ENUM('initiated', 'caregiver_ringing', 
                  'caregiver_connected', 'client_ringing', 'in_progress',
                  'completed', 'failed', 'no_answer', 'busy', 'cancelled',
                  name='call_status', create_type=False), default='initiated'),
        sa.Column('error_message', sa.Text),
        
        # Call timing
        sa.Column('started_at', sa.DateTime(timezone=True)),
        sa.Column('ended_at', sa.DateTime(timezone=True)),
        sa.Column('duration_seconds', sa.Integer),
        
        # Recording info
        sa.Column('recording_url', sa.String(500)),
        sa.Column('recording_duration_seconds', sa.Integer),
        sa.Column('recording_file_path', sa.String(500)),
        
        # Consent tracking
        sa.Column('caregiver_consent_at', sa.DateTime(timezone=True)),
        sa.Column('client_consent_at', sa.DateTime(timezone=True)),
        sa.Column('consent_message_played', sa.Boolean, default=False),
        
        # Processing status
        sa.Column('recording_downloaded', sa.Boolean, default=False),
        sa.Column('pipeline_submitted', sa.Boolean, default=False),
        sa.Column('audio_asset_id', postgresql.UUID(as_uuid=True)),
        
        # Metadata
        sa.Column('call_metadata', postgresql.JSONB, default=dict),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True),
                  server_default=sa.text('NOW()')),
    )
    
    # Create indexes
    op.create_index('idx_calls_visit', 'calls', ['visit_id'])
    op.create_index('idx_calls_client', 'calls', ['client_id'])
    op.create_index('idx_calls_status', 'calls', ['status'])
    op.create_index('idx_calls_caregiver_sid', 'calls', ['caregiver_call_sid'])
    op.create_index('idx_calls_conference_sid', 'calls', ['conference_sid'])


def downgrade() -> None:
    op.drop_table('calls')
    op.execute('DROP TYPE IF EXISTS call_status')
