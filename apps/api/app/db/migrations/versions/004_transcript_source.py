"""Add source tracking to transcript segments

Revision ID: 004_transcript_source
Revises: 003_calls
Create Date: 2026-01-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '004_transcript_source'
down_revision: Union[str, None] = '003_calls'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add source column to track where transcript came from
    op.add_column(
        'transcript_segments',
        sa.Column('source', sa.String(50), nullable=True, default='whisper')
    )
    
    # Add external_reference for imported transcripts
    op.add_column(
        'transcript_segments',
        sa.Column('external_reference', sa.String(255), nullable=True)
    )
    
    # Update existing records to have default source
    op.execute("UPDATE transcript_segments SET source = 'whisper' WHERE source IS NULL")


def downgrade() -> None:
    op.drop_column('transcript_segments', 'external_reference')
    op.drop_column('transcript_segments', 'source')
