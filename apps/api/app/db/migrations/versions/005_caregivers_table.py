"""Create caregivers table

Revision ID: 005_caregivers_table
Revises: 004_transcript_source
Create Date: 2026-01-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '005_caregivers_table'
down_revision: Union[str, None] = '004_transcript_source'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'caregivers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        
        # Basic Info
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('preferred_name', sa.String(100)),
        sa.Column('date_of_birth', sa.Date),
        sa.Column('gender', sa.String(20)),
        
        # Contact
        sa.Column('phone', sa.String(20)),
        sa.Column('phone_secondary', sa.String(20)),
        sa.Column('email', sa.String(255)),
        sa.Column('address', sa.Text),
        sa.Column('city', sa.String(100)),
        sa.Column('state', sa.String(50)),
        sa.Column('zip_code', sa.String(20)),
        
        # Professional Info
        sa.Column('employee_id', sa.String(100)),
        sa.Column('hire_date', sa.Date),
        sa.Column('certification_level', sa.String(100)),
        sa.Column('certifications', postgresql.JSONB, server_default='[]'),
        sa.Column('specializations', postgresql.JSONB, server_default='[]'),
        sa.Column('languages', postgresql.JSONB, server_default='["English"]'),
        
        # Care Capabilities
        sa.Column('can_handle_high_care', sa.Boolean, server_default='false'),
        sa.Column('can_handle_moderate_care', sa.Boolean, server_default='true'),
        sa.Column('can_handle_low_care', sa.Boolean, server_default='true'),
        sa.Column('max_clients', sa.Integer, server_default='5'),
        sa.Column('current_client_count', sa.Integer, server_default='0'),
        
        # Availability
        sa.Column('available_days', sa.String(255)),
        sa.Column('available_hours', sa.String(255)),
        sa.Column('preferred_areas', sa.Text),
        sa.Column('max_travel_miles', sa.Integer, server_default='25'),
        
        # Performance
        sa.Column('years_experience', sa.Integer, server_default='0'),
        sa.Column('rating', sa.Float, server_default='5.0'),
        sa.Column('total_assignments', sa.Integer, server_default='0'),
        
        # Status
        sa.Column('status', sa.String(50), server_default="'active'"),
        
        # Notes
        sa.Column('notes', sa.Text),
        sa.Column('background_check_date', sa.Date),
        sa.Column('background_check_status', sa.String(50)),
        
        # External Integration
        sa.Column('external_id', sa.String(255)),
        sa.Column('external_source', sa.String(100)),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    
    # Create index on status for filtering
    op.create_index('ix_caregivers_status', 'caregivers', ['status'])
    op.create_index('ix_caregivers_email', 'caregivers', ['email'])


def downgrade() -> None:
    op.drop_index('ix_caregivers_email', table_name='caregivers')
    op.drop_index('ix_caregivers_status', table_name='caregivers')
    op.drop_table('caregivers')
