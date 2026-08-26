import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta

from database import Base, engine, get_db
from models import (
    User,
    Channel,
    Contact,
    Conversation,
    Message,
    ConversationNote,
    ConversationTag,
    QuickReply,
    AutoReplySetting,
)
from schemas import (
    UserRegister,
    UserLogin,
    UserOut,
    TokenOut,
    ConversationCreate,
    ConversationUpdate,
    ConversationPriorityUpdate,
    ConversationFollowUpUpdate,
    MessageCreate,
    ConversationNoteCreate,
    ConversationTagCreate,
    QuickReplyCreate,
    AutoReplySettingUpdate,
)
from ai_service import (
    classify_conversation,
    suggest_reply,
    generate_daily_report,
    analyze_customer_profile,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from meta_webhook import verify_meta_webhook, ingest_meta_webhook

load_dotenv()

BRIDGE_HEARTBEAT_FILE = Path.home() / "wasla" / ".bridge-heartbeat.json"

app = FastAPI(
    title=os.getenv("APP_NAME", "Wasla API"),
    version=os.getenv("APP_VERSION", "1.0.0"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {"message": "Wasla API is running 🚀", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ==================== AUTH ====================

@app.post("/auth/register", response_model=TokenOut)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="البريد مسجل مسبقاً")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="الحساب معطل")

    token = create_access_token({"user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== HELPERS ====================

def serialize_user(user: User | None):
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


def serialize_channel(channel: Channel | None):
    if not channel:
        return None
    return {
        "id": channel.id,
        "name": channel.name,
        "type": channel.type,
        "provider": channel.provider,
        "phone_number_id": channel.phone_number_id,
        "business_account_id": channel.business_account_id,
        "is_active": channel.is_active,
        "created_at": channel.created_at,
    }


def serialize_tag(tag: ConversationTag):
    return {
        "id": tag.id,
        "conversation_id": tag.conversation_id,
        "label": tag.label,
        "color": tag.color,
        "created_at": tag.created_at,
    }


def serialize_conversation(conv: Conversation):
    last_msg = None
    last_message_at = None

    if conv.messages:
        last_msg_obj = conv.messages[-1]
        last_msg = last_msg_obj.content
        last_message_at = last_msg_obj.created_at

    return {
        "id": conv.id,
        "status": conv.status,
        "priority": conv.priority,
        "follow_up_at": conv.follow_up_at,
        "source": conv.source,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "contact": {
            "id": conv.contact.id,
            "name": conv.contact.name,
            "phone": conv.contact.phone,
            "email": conv.contact.email,
            "created_at": conv.contact.created_at,
        },
        "assigned_user": serialize_user(conv.assigned_user),
        "channel": serialize_channel(conv.channel),
        "tags": [serialize_tag(tag) for tag in conv.tags],
        "last_message": last_msg,
        "last_message_at": last_message_at,
        "message_count": len(conv.messages),
    }


def serialize_auto_reply(setting: AutoReplySetting):
    return {
        "id": setting.id,
        "enabled": setting.enabled,
        "reply_text": setting.reply_text,
        "outside_hours_only": setting.outside_hours_only,
        "start_hour": setting.start_hour,
        "end_hour": setting.end_hour,
        "cooldown_minutes": setting.cooldown_minutes,
        "created_at": setting.created_at,
        "updated_at": setting.updated_at,
    }


def is_process_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except (ProcessLookupError, PermissionError):
        return False
    except Exception:
        return False


def get_or_create_auto_reply_setting(db: Session) -> AutoReplySetting:
    setting = db.query(AutoReplySetting).first()
    if setting:
        return setting

    setting = AutoReplySetting(
        enabled=False,
        reply_text="تم استلام رسالتك، سنرد عليك في أقرب وقت ممكن.",
        outside_hours_only=False,
        start_hour=9,
        end_hour=18,
        cooldown_minutes=60,
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


# ==================== WEBHOOKS / META ====================

@app.get("/webhooks/meta")
def verify_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    is_valid, challenge = verify_meta_webhook(
        mode=hub_mode,
        token=hub_verify_token,
        challenge=hub_challenge,
    )
    if not is_valid:
        raise HTTPException(status_code=403, detail="Webhook verification failed")
    return PlainTextResponse(content=challenge or "")


@app.post("/webhooks/meta")
def receive_meta_webhook(payload: dict, db: Session = Depends(get_db)):
    result = ingest_meta_webhook(payload=payload, db=db)
    return {"received": True, **result}


# ==================== BRIDGE STATUS ====================

@app.get("/bridge/status")
def bridge_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now()
    now_ts = int(time.time())
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_today = (
        db.query(Message)
        .filter(Message.created_at >= today_start, Message.direction == "inbound")
        .count()
    )

    last_message = (
        db.query(Message)
        .filter(Message.direction == "inbound")
        .order_by(Message.created_at.desc())
        .first()
    )

    is_connected = False
    heartbeat_at = None
    pid = None
    bridge_status_value = "unknown"

    if BRIDGE_HEARTBEAT_FILE.exists():
        try:
            raw = json.loads(BRIDGE_HEARTBEAT_FILE.read_text(encoding="utf-8"))
            last_ts = int(raw.get("ts", 0))
            pid = int(raw.get("pid", 0)) if raw.get("pid") else None
            bridge_status_value = raw.get("status", "unknown")

            if last_ts > 0:
                heartbeat_at = datetime.fromtimestamp(last_ts)
                diff = now_ts - last_ts
                process_alive = is_process_alive(pid)
                is_connected = (
                    diff < 25
                    and bridge_status_value == "connected"
                    and process_alive
                )

                # If process is dead, delete heartbeat file
                if not process_alive and BRIDGE_HEARTBEAT_FILE.exists():
                    try:
                        BRIDGE_HEARTBEAT_FILE.unlink()
                    except Exception:
                        pass
        except Exception:
            is_connected = False

    return {
        "is_connected": is_connected,
        "heartbeat_at": heartbeat_at,
        "bridge_pid": pid,
        "bridge_status": bridge_status_value,
        "last_sync": last_message.created_at if last_message else None,
        "messages_today": total_today,
        "last_message_content": last_message.content if last_message else None,
        "last_message_at": last_message.created_at if last_message else None,
    }


@app.get("/stats/today")
def stats_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_conversations = db.query(Conversation).count()

    new_today = db.query(Conversation).filter(
        Conversation.created_at >= today_start,
    ).count()

    closed_today = db.query(Conversation).filter(
        Conversation.updated_at >= today_start,
        Conversation.status == "closed",
    ).count()

    messages_today = db.query(Message).filter(
        Message.created_at >= today_start,
        Message.direction == "inbound",
    ).count()

    unread = db.query(Conversation).filter(
        Conversation.status == "new",
    ).count()

    due_followups = db.query(Conversation).filter(
        Conversation.follow_up_at.isnot(None),
        Conversation.follow_up_at <= now,
        Conversation.status != "closed",
    ).count()

    high_priority = db.query(Conversation).filter(
        Conversation.priority == "high",
        Conversation.status != "closed",
    ).count()

    return {
        "total_conversations": total_conversations,
        "new_today": new_today,
        "closed_today": closed_today,
        "messages_today": messages_today,
        "unread": unread,
        "due_followups": due_followups,
        "high_priority": high_priority,
    }


# ==================== CHANNELS ====================

@app.get("/channels")
def list_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    channels = db.query(Channel).order_by(Channel.id.desc()).all()
    return [serialize_channel(c) for c in channels]


# ==================== QUICK REPLIES ====================

@app.get("/quick-replies")
def list_quick_replies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    replies = db.query(QuickReply).order_by(QuickReply.id.desc()).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "content": item.content,
            "created_at": item.created_at,
        }
        for item in replies
    ]


@app.post("/quick-replies")
def create_quick_reply(
    payload: QuickReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = QuickReply(title=payload.title, content=payload.content)
    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "title": item.title,
        "content": item.content,
        "created_at": item.created_at,
    }


@app.delete("/quick-replies/{reply_id}")
def delete_quick_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(QuickReply).filter(QuickReply.id == reply_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="الرد السريع غير موجود")

    db.delete(item)
    db.commit()
    return {"message": "تم حذف الرد السريع"}


# ==================== AUTO REPLY ====================

@app.get("/auto-reply")
def get_auto_reply(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    setting = get_or_create_auto_reply_setting(db)
    return serialize_auto_reply(setting)


@app.put("/auto-reply")
def update_auto_reply(
    payload: AutoReplySettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    setting = get_or_create_auto_reply_setting(db)

    setting.enabled = payload.enabled
    setting.reply_text = payload.reply_text
    setting.outside_hours_only = payload.outside_hours_only
    setting.start_hour = payload.start_hour
    setting.end_hour = payload.end_hour
    setting.cooldown_minutes = payload.cooldown_minutes

    db.commit()
    db.refresh(setting)

    return serialize_auto_reply(setting)


# ==================== CONVERSATIONS ====================

@app.get("/conversations")
def list_conversations(
    search: str = Query(None),
    status: str = Query(None),
    assignment: str = Query(None),
    priority: str = Query(None),
    follow_up: str = Query(None),  # today | overdue
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Conversation)

    if status:
        query = query.filter(Conversation.status == status)

    if assignment == "mine":
        query = query.filter(Conversation.assigned_user_id == current_user.id)
    elif assignment == "unassigned":
        query = query.filter(Conversation.assigned_user_id.is_(None))

    if priority:
        query = query.filter(Conversation.priority == priority)

    now = datetime.now()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    if follow_up == "today":
        query = query.filter(
            Conversation.follow_up_at.isnot(None),
            Conversation.follow_up_at <= today_end,
            Conversation.status != "closed",
        )
    elif follow_up == "overdue":
        query = query.filter(
            Conversation.follow_up_at.isnot(None),
            Conversation.follow_up_at < now,
            Conversation.status != "closed",
        )

    if search:
        query = query.join(Contact)
        filters = [
            Contact.name.ilike(f"%{search}%"),
            Contact.phone.ilike(f"%{search}%"),
        ]
        if search.isdigit():
            filters.append(Contact.id == int(search))
        query = query.filter(or_(*filters))

    conversations = query.order_by(Conversation.updated_at.desc()).all()
    return [serialize_conversation(c) for c in conversations]


@app.post("/conversations")
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = db.query(Contact).filter(Contact.phone == payload.phone).first()

    if not contact:
        contact = Contact(name=payload.customer_name, phone=payload.phone)
        db.add(contact)
        db.commit()
        db.refresh(contact)

    conversation = Conversation(
        contact_id=contact.id,
        assigned_user_id=current_user.id,
        source="manual",
        status=payload.status,
        priority="normal",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    if payload.first_message:
        message = Message(
            conversation_id=conversation.id,
            sender="customer",
            direction="inbound",
            source="manual",
            content=payload.first_message,
            message_type="text",
        )
        db.add(message)
        db.commit()

    db.refresh(conversation)
    return serialize_conversation(conversation)


@app.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    return {
        "id": conv.id,
        "status": conv.status,
        "priority": conv.priority,
        "follow_up_at": conv.follow_up_at,
        "source": conv.source,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "contact": {
            "id": conv.contact.id,
            "name": conv.contact.name,
            "phone": conv.contact.phone,
            "email": conv.contact.email,
            "created_at": conv.contact.created_at,
        },
        "assigned_user": serialize_user(conv.assigned_user),
        "channel": serialize_channel(conv.channel),
        "tags": [serialize_tag(tag) for tag in conv.tags],
        "messages": [
            {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "sender": msg.sender,
                "direction": msg.direction,
                "source": msg.source,
                "external_message_id": msg.external_message_id,
                "content": msg.content,
                "message_type": msg.message_type,
                "created_at": msg.created_at,
            }
            for msg in conv.messages
        ],
    }


@app.patch("/conversations/{conversation_id}")
def update_conversation(
    conversation_id: int,
    payload: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
    conv.status = payload.status
    db.commit()
    db.refresh(conv)
    return {"message": "تم تحديث الحالة", "status": conv.status}


@app.patch("/conversations/{conversation_id}/priority")
def update_conversation_priority(
    conversation_id: int,
    payload: ConversationPriorityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    conv.priority = payload.priority
    db.commit()
    db.refresh(conv)

    return {
        "message": "تم تحديث الأولوية",
        "priority": conv.priority,
    }


@app.patch("/conversations/{conversation_id}/follow-up")
def update_conversation_follow_up(
    conversation_id: int,
    payload: ConversationFollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    conv.follow_up_at = payload.follow_up_at
    db.commit()
    db.refresh(conv)

    return {
        "message": "تم تحديث وقت المتابعة",
        "follow_up_at": conv.follow_up_at,
    }


@app.patch("/conversations/{conversation_id}/assign-me")
def assign_conversation_to_me(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
    conv.assigned_user_id = current_user.id
    db.commit()
    db.refresh(conv)
    return {
        "message": "تم تعيين المحادثة لك",
        "assigned_user": serialize_user(conv.assigned_user),
    }


@app.patch("/conversations/{conversation_id}/unassign")
def unassign_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
    conv.assigned_user_id = None
    db.commit()
    db.refresh(conv)
    return {"message": "تم إلغاء التعيين", "assigned_user": None}


@app.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.query(ConversationNote).filter(
        ConversationNote.conversation_id == conversation_id
    ).delete()
    db.query(ConversationTag).filter(
        ConversationTag.conversation_id == conversation_id
    ).delete()
    db.delete(conv)
    db.commit()
    return {"message": "تم حذف المحادثة"}


# ==================== MESSAGES ====================

@app.post("/conversations/{conversation_id}/messages")
def add_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    message = Message(
        conversation_id=conversation_id,
        sender=payload.sender,
        direction="outbound" if payload.sender == "agent" else "inbound",
        source=conv.source or "manual",
        content=payload.content,
        message_type=payload.message_type,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    conv.updated_at = message.created_at
    db.commit()

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender": message.sender,
        "direction": message.direction,
        "source": message.source,
        "external_message_id": message.external_message_id,
        "content": message.content,
        "message_type": message.message_type,
        "created_at": message.created_at,
    }


@app.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    return [
        {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender": msg.sender,
            "direction": msg.direction,
            "source": msg.source,
            "external_message_id": msg.external_message_id,
            "content": msg.content,
            "message_type": msg.message_type,
            "created_at": msg.created_at,
        }
        for msg in conv.messages
    ]


# ==================== NOTES ====================

@app.get("/conversations/{conversation_id}/notes")
def list_notes(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    return [
        {
            "id": note.id,
            "conversation_id": note.conversation_id,
            "content": note.content,
            "created_at": note.created_at,
            "author": serialize_user(note.author),
        }
        for note in conv.notes
    ]


@app.post("/conversations/{conversation_id}/notes")
def add_note(
    conversation_id: int,
    payload: ConversationNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    note = ConversationNote(
        conversation_id=conversation_id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "conversation_id": note.conversation_id,
        "content": note.content,
        "created_at": note.created_at,
        "author": serialize_user(current_user),
    }


# ==================== TAGS ====================

@app.get("/conversations/{conversation_id}/tags")
def list_tags(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    return [serialize_tag(tag) for tag in conv.tags]


@app.post("/conversations/{conversation_id}/tags")
def add_tag(
    conversation_id: int,
    payload: ConversationTagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    tag = ConversationTag(
        conversation_id=conversation_id,
        label=payload.label,
        color=payload.color,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)

    return serialize_tag(tag)


@app.delete("/tags/{tag_id}")
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = db.query(ConversationTag).filter(ConversationTag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="الوسم غير موجود")

    db.delete(tag)
    db.commit()
    return {"message": "تم حذف الوسم"}
# ==================== AI ====================

@app.get("/ai/analyze/{conversation_id}")
async def ai_analyze_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    messages = [
        {
            "sender": msg.sender,
            "content": msg.content,
            "created_at": str(msg.created_at),
        }
        for msg in conv.messages
    ]

    result = await classify_conversation(messages)
    return {
        "conversation_id": conversation_id,
        "analysis": result,
    }


@app.get("/ai/suggest-reply/{conversation_id}")
async def ai_suggest_reply(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    messages = [
        {
            "sender": msg.sender,
            "content": msg.content,
        }
        for msg in conv.messages
    ]

    customer_name = conv.contact.name if conv.contact else "العميل"
    reply = await suggest_reply(messages, customer_name)

    return {
        "conversation_id": conversation_id,
        "suggested_reply": reply,
    }


@app.get("/ai/daily-report")
async def ai_daily_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime

    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    conversations = (
        db.query(Conversation)
        .filter(Conversation.updated_at >= today_start)
        .order_by(Conversation.updated_at.desc())
        .limit(20)
        .all()
    )

    conversations_data = [serialize_conversation(c) for c in conversations]
    report = await generate_daily_report(conversations_data)

    return {
        "date": now.strftime("%Y-%m-%d"),
        "total_conversations": len(conversations_data),
        "report": report,
    }


@app.get("/ai/customer-profile/{contact_id}")
async def ai_customer_profile(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="العميل غير موجود")

    all_messages = []
    for conv in contact.conversations:
        for msg in conv.messages:
            all_messages.append(
                {
                    "sender": msg.sender,
                    "content": msg.content,
                    "created_at": str(msg.created_at),
                }
            )

    profile = await analyze_customer_profile(contact.name, all_messages)

    return {
        "contact_id": contact_id,
        "contact_name": contact.name,
        "profile": profile,
    }