"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'caregiver', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Clients table
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('emergency_contact_name', sa.String(255), nullable=True),
        sa.Column('emergency_contact_phone', sa.String(20), nullable=True),
        sa.Column('medical_notes', sa.Text(), nullable=True),
        sa.Column('care_plan', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Visits table
    op.create_table(
        'visits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('caregiver_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scheduled_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='scheduled'),
        sa.Column('pipeline_state', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.ForeignKeyConstraint(['caregiver_id'], ['users.id']),
    )

    # Audio assets table
    op.create_table(
        'audio_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('s3_key', sa.String(512), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=True),
        sa.Column('content_type', sa.String(100), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('sample_rate', sa.Integer(), nullable=True),
        sa.Column('channels', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='uploaded'),
        sa.Column('speech_ratio', sa.Float(), nullable=True),
        sa.Column('avg_confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id']),
    )

    # Transcript segments table
    op.create_table(
        'transcript_segments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('audio_asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('start_ms', sa.Integer(), nullable=False),
        sa.Column('end_ms', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('speaker_label', sa.String(50), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id']),
        sa.ForeignKeyConstraint(['audio_asset_id'], ['audio_assets.id']),
    )

    # Diarization turns table
    op.create_table(
        'diarization_turns',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('audio_asset_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('speaker', sa.String(50), nullable=False),
        sa.Column('start_ms', sa.Integer(), nullable=False),
        sa.Column('end_ms', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id']),
        sa.ForeignKeyConstraint(['audio_asset_id'], ['audio_assets.id']),
    )

    # Billable items table
    op.create_table(
        'billable_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_ms', sa.Integer(), nullable=False),
        sa.Column('end_ms', sa.Integer(), nullable=False),
        sa.Column('minutes', sa.Integer(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(), nullable=False, default=[]),
        sa.Column('is_approved', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, default=False),
        sa.Column('flag_reason', sa.Text(), nullable=True),
        sa.Column('adjusted_minutes', sa.Integer(), nullable=True),
        sa.Column('adjustment_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id']),
    )

    # Notes table
    op.create_table(
        'notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visit_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('structured_data', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('narrative', sa.Text(), nullable=True),
        sa.Column('is_approved', sa.Boolean(), nullable=False, default=False),
        sa.Column('approved_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('version', sa.String(20), nullable=False, default='1.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id']),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id']),
        sa.UniqueConstraint('visit_id'),
    )

    # Contracts table
    op.create_table(
        'contracts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contract_number', sa.String(50), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('services', postgresql.JSONB(), nullable=False, default=[]),
        sa.Column('schedule', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('hourly_rate', sa.Numeric(10, 2), nullable=True),
        sa.Column('weekly_hours', sa.Numeric(10, 2), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('cancellation_policy', sa.Text(), nullable=True),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='draft'),
        sa.Column('client_signature_date', sa.Date(), nullable=True),
        sa.Column('agency_signature_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.UniqueConstraint('contract_number'),
    )

    # Audit logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('changes', postgresql.JSONB(), nullable=False, default={}),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )


def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('contracts')
    op.drop_table('notes')
    op.drop_table('billable_items')
    op.drop_table('diarization_turns')
    op.drop_table('transcript_segments')
    op.drop_table('audio_assets')
    op.drop_table('visits')
    op.drop_table('clients')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS userrole')
