from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="agent")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assigned_conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="assigned_user"
    )
    notes: Mapped[list["ConversationNote"]] = relationship(
        back_populates="author"
    )


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(30), default="whatsapp")
    provider: Mapped[str] = mapped_column(String(30), default="meta")
    phone_number_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    business_account_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="channel"
    )


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="contact"
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contact_id: Mapped[int] = mapped_column(Integer, ForeignKey("contacts.id"))
    assigned_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    channel_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("channels.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(30), default="manual")
    external_contact_id: Mapped[str | None] = mapped_column(
        String(120), nullable=True
    )
    external_conversation_id: Mapped[str | None] = mapped_column(
        String(120), nullable=True
    )
    status: Mapped[str] = mapped_column(String(30), default="new")
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    follow_up_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contact: Mapped["Contact"] = relationship(back_populates="conversations")
    assigned_user: Mapped["User | None"] = relationship(
        back_populates="assigned_conversations"
    )
    channel: Mapped["Channel | None"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        order_by="Message.created_at",
    )
    notes: Mapped[list["ConversationNote"]] = relationship(
        back_populates="conversation",
        order_by="ConversationNote.created_at",
    )
    tags: Mapped[list["ConversationTag"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id")
    )
    sender: Mapped[str] = mapped_column(String(20))
    direction: Mapped[str] = mapped_column(String(20), default="inbound")
    source: Mapped[str] = mapped_column(String(30), default="manual")
    external_message_id: Mapped[str | None] = mapped_column(
        String(150), nullable=True
    )
    content: Mapped[str] = mapped_column(Text)
    message_type: Mapped[str] = mapped_column(String(20), default="text")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class ConversationNote(Base):
    __tablename__ = "conversation_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id")
    )
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="notes")
    author: Mapped["User"] = relationship(back_populates="notes")


class ConversationTag(Base):
    __tablename__ = "conversation_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("conversations.id")
    )
    label: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(20), default="blue")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="tags")


class QuickReply(Base):
    __tablename__ = "quick_replies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(100))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AutoReplySetting(Base):
    __tablename__ = "auto_reply_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_text: Mapped[str] = mapped_column(
        Text,
        default="تم استلام رسالتك، سنرد عليك في أقرب وقت ممكن."
    )
    outside_hours_only: Mapped[bool] = mapped_column(Boolean, default=False)
    start_hour: Mapped[int] = mapped_column(Integer, default=9)
    end_hour: Mapped[int] = mapped_column(Integer, default=18)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )