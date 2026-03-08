"""
SmartNotes Router

CRUD for notes, tasks, and reminders with AI task extraction.

IMPORTANT: /tasks/* and /reminders/* routes MUST be declared before
/{note_id} to prevent FastAPI from matching "tasks"/"reminders" as a UUID.
"""

import logging
import os
import json
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.smart_note import SmartNote
from app.models.task import Task
from app.models.reminder import Reminder
from app.schemas.smart_note import (
    SmartNoteCreate, SmartNoteUpdate, SmartNoteResponse, SmartNoteDetail,
    TaskCreate, TaskUpdate, TaskResponse,
    ReminderCreate, ReminderUpdate, ReminderResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── AI Extraction Helper ───

def _extract_tasks_from_content(note_title: str, note_content: str) -> dict:
    """Call Claude to extract summary, tasks, and reminders from note content."""
    api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("CLAUDE_API_KEY")
    if not api_key:
        return {"summary": None, "tasks": [], "reminders": []}

    try:
        import httpx

        prompt = f"""Analyze this note and extract:
1. A 1-2 sentence summary
2. Any actionable tasks mentioned
3. Any dates/deadlines that should have reminders

Return ONLY valid JSON with this exact structure:
{{
  "summary": "Brief summary of the note",
  "tasks": [
    {{"title": "Task description", "priority": "low|medium|high|urgent", "due_date": "YYYY-MM-DD or null"}}
  ],
  "reminders": [
    {{"title": "Reminder description", "remind_at": "YYYY-MM-DDTHH:MM:SS or null"}}
  ]
}}

Note title: {note_title}
Note content:
{note_content}"""

        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30.0,
        )

        if resp.status_code == 200:
            text = resp.json()["content"][0]["text"]
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
    except Exception as e:
        logger.error(f"AI extraction failed: {e}")

    return {"summary": None, "tasks": [], "reminders": []}


# ─── Notes: collection endpoints (no path params) ───

@router.post("", response_model=SmartNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_in: SmartNoteCreate,
    extract: bool = Query(True, description="Auto-extract tasks with AI"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a note, optionally running AI task extraction."""
    if note_in.related_client_id:
        from app.models.client import Client
        client = db.query(Client).filter(
            Client.id == note_in.related_client_id,
            Client.created_by == current_user.id,
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

    note = SmartNote(
        user_id=current_user.id,
        title=note_in.title,
        content=note_in.content,
        tags=note_in.tags or [],
        is_pinned=note_in.is_pinned or False,
        color=note_in.color or "default",
        related_client_id=note_in.related_client_id,
        source=note_in.source or "manual",
    )
    db.add(note)
    db.flush()

    if extract and note_in.content.strip():
        result = _extract_tasks_from_content(note_in.title, note_in.content)
        if result.get("summary"):
            note.ai_summary = result["summary"]

        for t in result.get("tasks", []):
            due = None
            if t.get("due_date"):
                try:
                    due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
                except ValueError:
                    pass
            task = Task(
                user_id=current_user.id,
                smart_note_id=note.id,
                title=t.get("title", "Untitled task"),
                priority=t.get("priority", "medium"),
                due_date=due,
                related_client_id=note_in.related_client_id,
            )
            db.add(task)

        for r in result.get("reminders", []):
            remind_at = None
            if r.get("remind_at"):
                try:
                    remind_at = datetime.fromisoformat(r["remind_at"]).replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
            if remind_at:
                reminder = Reminder(
                    user_id=current_user.id,
                    smart_note_id=note.id,
                    title=r.get("title", "Reminder"),
                    remind_at=remind_at,
                )
                db.add(reminder)

    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=List[SmartNoteResponse])
async def list_notes(
    search: Optional[str] = None,
    tag: Optional[str] = None,
    client_id: Optional[UUID] = None,
    pinned: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notes with optional filters."""
    query = db.query(SmartNote).filter(SmartNote.user_id == current_user.id)

    if search:
        query = query.filter(
            or_(
                SmartNote.title.ilike(f"%{search}%"),
                SmartNote.content.ilike(f"%{search}%"),
            )
        )
    if tag:
        query = query.filter(SmartNote.tags.contains([tag]))
    if client_id:
        query = query.filter(SmartNote.related_client_id == client_id)
    if pinned is not None:
        query = query.filter(SmartNote.is_pinned == pinned)

    return query.order_by(SmartNote.is_pinned.desc(), SmartNote.updated_at.desc()).all()


# ─── Tasks CRUD (must be before /{note_id}) ───

@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
async def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if task_in.smart_note_id:
        note = db.query(SmartNote).filter(
            SmartNote.id == task_in.smart_note_id,
            SmartNote.user_id == current_user.id,
        ).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

    if task_in.related_client_id:
        from app.models.client import Client
        client = db.query(Client).filter(
            Client.id == task_in.related_client_id,
            Client.created_by == current_user.id,
        ).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

    task = Task(
        user_id=current_user.id,
        smart_note_id=task_in.smart_note_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or "todo",
        priority=task_in.priority or "medium",
        due_date=task_in.due_date,
        related_client_id=task_in.related_client_id,
        assigned_to_id=task_in.assigned_to_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks", response_model=List[TaskResponse], tags=["Tasks"])
async def list_tasks(
    task_status: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    due_before: Optional[str] = None,
    note_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)
    if task_status:
        query = query.filter(Task.status == task_status)
    if priority:
        query = query.filter(Task.priority == priority)
    if due_before:
        try:
            cutoff = datetime.strptime(due_before, "%Y-%m-%d").date()
            query = query.filter(Task.due_date <= cutoff)
        except ValueError:
            pass
    if note_id:
        query = query.filter(Task.smart_note_id == note_id)

    return query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()


@router.put("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
async def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.put("/tasks/{task_id}/complete", response_model=TaskResponse, tags=["Tasks"])
async def complete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "done"
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tasks"])
async def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()


# ─── Reminders CRUD (must be before /{note_id}) ───

@router.post("/reminders", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED, tags=["Reminders"])
async def create_reminder(
    rem_in: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if rem_in.smart_note_id:
        note = db.query(SmartNote).filter(
            SmartNote.id == rem_in.smart_note_id,
            SmartNote.user_id == current_user.id,
        ).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

    if rem_in.task_id:
        task = db.query(Task).filter(
            Task.id == rem_in.task_id,
            Task.user_id == current_user.id,
        ).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    reminder = Reminder(
        user_id=current_user.id,
        task_id=rem_in.task_id,
        smart_note_id=rem_in.smart_note_id,
        title=rem_in.title,
        description=rem_in.description,
        remind_at=rem_in.remind_at,
        reminder_type=rem_in.reminder_type or "one_time",
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/reminders", response_model=List[ReminderResponse], tags=["Reminders"])
async def list_reminders(
    upcoming: Optional[bool] = None,
    dismissed: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Reminder).filter(Reminder.user_id == current_user.id)

    if upcoming:
        query = query.filter(
            Reminder.is_dismissed == False,
            Reminder.remind_at <= datetime.now(timezone.utc) + timedelta(hours=1),
        )
    if dismissed is not None:
        query = query.filter(Reminder.is_dismissed == dismissed)

    return query.order_by(Reminder.remind_at.asc()).all()


@router.put("/reminders/{reminder_id}/dismiss", response_model=ReminderResponse, tags=["Reminders"])
async def dismiss_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id,
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_dismissed = True
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Reminders"])
async def delete_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reminder = db.query(Reminder).filter(
        Reminder.id == reminder_id,
        Reminder.user_id == current_user.id,
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()


@router.post("/reminders/send-due-notifications", tags=["Reminders"])
async def send_due_reminder_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send email notifications for reminders due within the next hour. Idempotent."""
    now = datetime.now(timezone.utc)
    due_reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.is_dismissed == False,
        Reminder.notification_sent == False,
        Reminder.remind_at <= now + timedelta(hours=1),
    ).all()

    sent_count = 0
    try:
        from app.services.email import get_email_service
        email_svc = get_email_service()
    except Exception:
        email_svc = None

    for rem in due_reminders:
        rem.notification_sent = True
        if email_svc and current_user.email:
            try:
                email_svc.send_follow_up_reminder(
                    user_email=current_user.email,
                    client_name=rem.title,
                    client_id="",
                    days_since_last_visit=0,
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send reminder email: {e}")

    db.commit()
    return {"due_count": len(due_reminders), "emails_sent": sent_count}


# ─── Notes: single-item routes (/{note_id} MUST be last) ───

@router.get("/{note_id}", response_model=SmartNoteDetail)
async def get_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get note detail with linked tasks and reminders."""
    note = db.query(SmartNote).filter(
        SmartNote.id == note_id,
        SmartNote.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    tasks = db.query(Task).filter(
        Task.smart_note_id == note_id, Task.user_id == current_user.id
    ).order_by(Task.created_at).all()
    reminders = db.query(Reminder).filter(
        Reminder.smart_note_id == note_id, Reminder.user_id == current_user.id
    ).order_by(Reminder.remind_at).all()

    result = SmartNoteDetail.model_validate(note)
    result.tasks = [TaskResponse.model_validate(t) for t in tasks]
    result.reminders = [ReminderResponse.model_validate(r) for r in reminders]
    return result


@router.put("/{note_id}", response_model=SmartNoteResponse)
async def update_note(
    note_id: UUID,
    note_in: SmartNoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a note."""
    note = db.query(SmartNote).filter(
        SmartNote.id == note_id,
        SmartNote.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = note_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(note, field, value)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.query(SmartNote).filter(
        SmartNote.id == note_id,
        SmartNote.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()


@router.post("/{note_id}/extract-tasks", response_model=dict)
async def extract_tasks_from_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-run AI task extraction on an existing note."""
    note = db.query(SmartNote).filter(
        SmartNote.id == note_id,
        SmartNote.user_id == current_user.id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    result = _extract_tasks_from_content(note.title, note.content)

    if result.get("summary"):
        note.ai_summary = result["summary"]

    tasks_created = 0
    reminders_created = 0

    for t in result.get("tasks", []):
        due = None
        if t.get("due_date"):
            try:
                due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        task = Task(
            user_id=current_user.id,
            smart_note_id=note.id,
            title=t.get("title", "Untitled task"),
            priority=t.get("priority", "medium"),
            due_date=due,
            related_client_id=note.related_client_id,
        )
        db.add(task)
        tasks_created += 1

    for r in result.get("reminders", []):
        remind_at = None
        if r.get("remind_at"):
            try:
                remind_at = datetime.fromisoformat(r["remind_at"]).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if remind_at:
            reminder = Reminder(
                user_id=current_user.id,
                smart_note_id=note.id,
                title=r.get("title", "Reminder"),
                remind_at=remind_at,
            )
            db.add(reminder)
            reminders_created += 1

    db.commit()
    db.refresh(note)

    return {
        "summary": note.ai_summary,
        "tasks_created": tasks_created,
        "reminders_created": reminders_created,
    }
