"""Add certification expiry tracking, smart_notes, tasks, and reminders tables

Revision ID: 024
Revises: 023
"""

from alembic import op
import sqlalchemy as sa

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade():
    # Certification expiry tracking on caregivers
    op.execute("""
        ALTER TABLE caregivers
        ADD COLUMN IF NOT EXISTS certification_expiry_dates JSONB DEFAULT '{}'::jsonb;
    """)

    # Smart Notes table
    op.execute("""
        CREATE TABLE IF NOT EXISTS smart_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            ai_summary TEXT,
            tags JSONB DEFAULT '[]'::jsonb,
            is_pinned BOOLEAN DEFAULT false,
            color VARCHAR(20) DEFAULT 'default',
            related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
            source VARCHAR(20) NOT NULL DEFAULT 'manual',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_smart_notes_user ON smart_notes(user_id);
        CREATE INDEX IF NOT EXISTS idx_smart_notes_pinned ON smart_notes(user_id, is_pinned);
        CREATE INDEX IF NOT EXISTS idx_smart_notes_client ON smart_notes(related_client_id);
    """)

    # Tasks table
    op.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            smart_note_id UUID REFERENCES smart_notes(id) ON DELETE SET NULL,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'todo',
            priority VARCHAR(20) NOT NULL DEFAULT 'medium',
            due_date DATE,
            completed_at TIMESTAMPTZ,
            related_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
            assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(user_id, status);
        CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(user_id, due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_note ON tasks(smart_note_id);
    """)

    # Reminders table
    op.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
            smart_note_id UUID REFERENCES smart_notes(id) ON DELETE SET NULL,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            remind_at TIMESTAMPTZ NOT NULL,
            is_dismissed BOOLEAN DEFAULT false,
            reminder_type VARCHAR(20) NOT NULL DEFAULT 'one_time',
            notification_sent BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
        CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(user_id, remind_at, is_dismissed);
        CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS reminders CASCADE;")
    op.execute("DROP TABLE IF EXISTS tasks CASCADE;")
    op.execute("DROP TABLE IF EXISTS smart_notes CASCADE;")
    op.execute("ALTER TABLE caregivers DROP COLUMN IF EXISTS certification_expiry_dates;")
