from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ==================== AUTH ====================

class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ==================== CONTACT ====================

class ContactCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    email: str | None = None
    created_at: datetime


# ==================== MESSAGE ====================

class MessageCreate(BaseModel):
    sender: str
    content: str
    message_type: str = "text"


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender: str
    direction: str
    source: str
    external_message_id: str | None = None
    content: str
    message_type: str
    created_at: datetime


# ==================== NOTES ====================

class ConversationNoteCreate(BaseModel):
    content: str


class ConversationNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    content: str
    created_at: datetime
    author: UserOut


# ==================== TAGS ====================

class ConversationTagCreate(BaseModel):
    label: str
    color: str = "blue"


class ConversationTagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    label: str
    color: str
    created_at: datetime


# ==================== QUICK REPLIES ====================

class QuickReplyCreate(BaseModel):
    title: str
    content: str


class QuickReplyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    created_at: datetime


# ==================== AUTO REPLY ====================

class AutoReplySettingUpdate(BaseModel):
    enabled: bool
    reply_text: str
    outside_hours_only: bool
    start_hour: int
    end_hour: int
    cooldown_minutes: int


class AutoReplySettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enabled: bool
    reply_text: str
    outside_hours_only: bool
    start_hour: int
    end_hour: int
    cooldown_minutes: int
    created_at: datetime
    updated_at: datetime


# ==================== CONVERSATION ====================

class ConversationCreate(BaseModel):
    customer_name: str
    phone: str
    status: str = "new"
    first_message: str | None = None


class ConversationUpdate(BaseModel):
    status: str


class ConversationPriorityUpdate(BaseModel):
    priority: str


class ConversationFollowUpUpdate(BaseModel):
    follow_up_at: datetime | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    priority: str
    follow_up_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    contact: ContactOut
    messages: list[MessageOut] = []


class ConversationListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    priority: str
    follow_up_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    contact: ContactOut
    last_message: str | None = None
    message_count: int = 0