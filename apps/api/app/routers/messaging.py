"""
Team Messaging Router: channels, DMs, messages, and notifications.
Persisted in PostgreSQL so all team members share conversations.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, or_, and_
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.messaging import Channel, Message, Notification

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_platform_admin(user: User) -> bool:
    """Platform admins (e.g. CEO, support) can see any channel."""
    role = str(getattr(user, "role", "") or "").lower()
    email = (user.email or "").lower()
    return role == "admin" and email.endswith("@palmtai.com")


def _channel_membership_or_404(
    db: Session, channel_id: str, user: User
) -> Channel:
    """Load the channel and confirm the caller is a member.

    Returns 404 (not 403) when the user isn't a member so we don't leak
    which channel IDs exist.
    """
    try:
        channel = db.query(Channel).filter(Channel.id == channel_id).first()
    except Exception:
        # Bad UUID/string → treat as not found
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    members = channel.members or []
    if str(user.id) not in members and not _is_platform_admin(user):
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


# ─── Pydantic Schemas ────────────────────────────────────────────

class ChannelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_dm: bool = False
    member_ids: List[str] = []

class ChannelOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    is_dm: bool
    members: list
    created_by: str
    created_at: str
    unread: int = 0

class MessageCreate(BaseModel):
    text: str

class MessageOut(BaseModel):
    id: str
    channel_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str]
    text: str
    created_at: str

class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: str


# ─── Channels ────────────────────────────────────────────────────

@router.get("/channels", response_model=List[ChannelOut])
async def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all channels the user is a member of (admins see everything)."""
    uid = str(current_user.id)
    is_admin = _is_platform_admin(current_user)
    channels = db.query(Channel).filter(
        Channel.is_archived == False,
    ).order_by(Channel.created_at).all()

    results = []
    for ch in channels:
        members = ch.members or []
        # Membership check: admins can list every channel; everyone else must
        # be in the members array (covers both DMs and group channels).
        if not is_admin and uid not in members:
            continue
        unread = db.query(Message).filter(
            Message.channel_id == ch.id,
            Message.sender_id != current_user.id,
            Message.is_deleted == False,
        ).count()
        results.append(ChannelOut(
            id=str(ch.id),
            name=ch.name,
            description=ch.description,
            is_dm=ch.is_dm,
            members=members,
            created_by=str(ch.created_by),
            created_at=ch.created_at.isoformat(),
            unread=unread,
        ))
    return results


@router.post("/channels", response_model=ChannelOut)
async def create_channel(
    data: ChannelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a channel or DM conversation."""
    uid = str(current_user.id)
    member_ids = list(set([uid] + data.member_ids))

    if data.is_dm and len(member_ids) == 2:
        existing = db.query(Channel).filter(
            Channel.is_dm == True,
            Channel.is_archived == False,
        ).all()
        for ch in existing:
            if set(ch.members or []) == set(member_ids):
                return ChannelOut(
                    id=str(ch.id),
                    name=ch.name,
                    description=ch.description,
                    is_dm=ch.is_dm,
                    members=ch.members or [],
                    created_by=str(ch.created_by),
                    created_at=ch.created_at.isoformat(),
                    unread=0,
                )

    channel = Channel(
        name=data.name,
        description=data.description,
        is_dm=data.is_dm,
        created_by=current_user.id,
        members=member_ids,
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)

    return ChannelOut(
        id=str(channel.id),
        name=channel.name,
        description=channel.description,
        is_dm=channel.is_dm,
        members=channel.members or [],
        created_by=str(channel.created_by),
        created_at=channel.created_at.isoformat(),
        unread=0,
    )


# ─── Messages ────────────────────────────────────────────────────

@router.get("/channels/{channel_id}/messages", response_model=List[MessageOut])
async def get_messages(
    channel_id: str,
    limit: int = Query(100, le=500),
    before: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch messages for a channel, newest last. Members only."""
    _channel_membership_or_404(db, channel_id, current_user)

    q = db.query(Message).filter(
        Message.channel_id == channel_id,
        Message.is_deleted == False,
    )
    if before:
        q = q.filter(Message.created_at < before)
    msgs = q.order_by(Message.created_at).limit(limit).all()
    return [
        MessageOut(
            id=str(m.id),
            channel_id=str(m.channel_id),
            sender_id=str(m.sender_id),
            sender_name=m.sender_name,
            sender_avatar=m.sender_avatar,
            text=m.text,
            created_at=m.created_at.isoformat(),
        )
        for m in msgs
    ]


@router.post("/channels/{channel_id}/messages", response_model=MessageOut)
async def send_message(
    channel_id: str,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to a channel/DM and notify other members. Members only."""
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    channel = _channel_membership_or_404(db, channel_id, current_user)

    name = current_user.full_name or current_user.email
    avatar = "".join([w[0] for w in (name or "U").split()[:2]]).upper()

    msg = Message(
        channel_id=channel.id,
        sender_id=current_user.id,
        sender_name=name,
        sender_avatar=avatar,
        text=data.text.strip(),
    )
    db.add(msg)

    members = channel.members or []
    for member_id in members:
        if member_id == str(current_user.id):
            continue
        channel_label = channel.name if not channel.is_dm else f"DM from {name}"
        notif = Notification(
            user_id=uuid.UUID(member_id),
            type="new_message",
            title=channel_label,
            body=data.text.strip()[:200],
            link=f"/team-chat?channel={channel_id}",
            metadata_={
                "channel_id": str(channel.id),
                "sender_id": str(current_user.id),
                "sender_name": name,
            },
        )
        db.add(notif)

    db.commit()
    db.refresh(msg)

    return MessageOut(
        id=str(msg.id),
        channel_id=str(msg.channel_id),
        sender_id=str(msg.sender_id),
        sender_name=msg.sender_name,
        sender_avatar=msg.sender_avatar,
        text=msg.text,
        created_at=msg.created_at.isoformat(),
    )


# ─── Notifications ───────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationOut])
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for the current user."""
    q = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    notifs = q.order_by(desc(Notification.created_at)).limit(limit).all()
    return [
        NotificationOut(
            id=str(n.id),
            type=n.type,
            title=n.title,
            body=n.body,
            link=n.link,
            is_read=n.is_read,
            created_at=n.created_at.isoformat(),
        )
        for n in notifs
    ]


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True, "updated_at": datetime.now(timezone.utc)})
    db.commit()
    return {"ok": True}


@router.get("/notifications/unread-count")
async def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"count": count}
