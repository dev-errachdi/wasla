import os
from datetime import datetime
from typing import Any
from sqlalchemy.orm import Session

from models import Channel, Contact, Conversation, Message


def verify_meta_webhook(mode: str | None, token: str | None, challenge: str | None):
    expected = os.getenv("META_VERIFY_TOKEN", "wasla_meta_verify_token")
    if mode == "subscribe" and token == expected:
        return True, challenge or ""
    return False, None


def extract_message_content(message: dict[str, Any]) -> tuple[str, str]:
    message_type = message.get("type", "text")

    if message_type == "text":
        return message.get("text", {}).get("body", ""), "text"

    if message_type == "image":
        caption = message.get("image", {}).get("caption")
        return caption or "[image]", "image"

    if message_type == "audio":
        return "[audio]", "audio"

    if message_type == "video":
        caption = message.get("video", {}).get("caption")
        return caption or "[video]", "video"

    if message_type == "document":
        filename = message.get("document", {}).get("filename")
        return filename or "[document]", "document"

    if message_type == "button":
        text = message.get("button", {}).get("text")
        return text or "[button]", "button"

    if message_type == "interactive":
        return "[interactive]", "interactive"

    return f"[{message_type}]", message_type


def get_or_create_channel(
    db: Session,
    phone_number_id: str | None,
    business_account_id: str | None,
) -> Channel:
    channel = None

    if phone_number_id:
        channel = (
            db.query(Channel)
            .filter(Channel.phone_number_id == phone_number_id)
            .first()
        )

    if channel:
        return channel

    suffix = phone_number_id[-4:] if phone_number_id else "meta"
    channel = Channel(
        name=f"WhatsApp {suffix}",
        type="whatsapp",
        provider="meta",
        phone_number_id=phone_number_id,
        business_account_id=business_account_id,
        is_active=True,
    )
    db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel


def get_or_create_contact(
    db: Session,
    wa_id: str,
    profile_name: str | None,
) -> Contact:
    contact = db.query(Contact).filter(Contact.phone == wa_id).first()
    if contact:
        if profile_name and contact.name != profile_name:
            contact.name = profile_name
            db.commit()
            db.refresh(contact)
        return contact

    contact = Contact(
        name=profile_name or wa_id,
        phone=wa_id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def get_or_create_open_conversation(
    db: Session,
    contact: Contact,
    channel: Channel,
    external_contact_id: str,
) -> Conversation:
    conversation = (
        db.query(Conversation)
        .filter(
            Conversation.contact_id == contact.id,
            Conversation.channel_id == channel.id,
            Conversation.status != "closed",
        )
        .order_by(Conversation.updated_at.desc())
        .first()
    )

    if conversation:
        return conversation

    conversation = Conversation(
        contact_id=contact.id,
        channel_id=channel.id,
        source="whatsapp",
        external_contact_id=external_contact_id,
        status="new",
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def ingest_meta_webhook(payload: dict[str, Any], db: Session) -> dict[str, int]:
    created_messages = 0
    created_conversations = 0

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})

            if change.get("field") != "messages":
                continue

            metadata = value.get("metadata", {})
            phone_number_id = metadata.get("phone_number_id")
            business_account_id = value.get("business_account_id")

            channel = get_or_create_channel(
                db=db,
                phone_number_id=phone_number_id,
                business_account_id=business_account_id,
            )

            contacts = value.get("contacts", [])
            contact_data = contacts[0] if contacts else {}
            profile_name = contact_data.get("profile", {}).get("name")

            for inbound in value.get("messages", []):
                external_message_id = inbound.get("id")

                exists = (
                    db.query(Message)
                    .filter(Message.external_message_id == external_message_id)
                    .first()
                )
                if exists:
                    continue

                wa_id = inbound.get("from")
                if not wa_id:
                    continue

                contact = get_or_create_contact(
                    db=db,
                    wa_id=wa_id,
                    profile_name=profile_name,
                )

                existing_open = (
                    db.query(Conversation)
                    .filter(
                        Conversation.contact_id == contact.id,
                        Conversation.channel_id == channel.id,
                        Conversation.status != "closed",
                    )
                    .first()
                )

                conversation = get_or_create_open_conversation(
                    db=db,
                    contact=contact,
                    channel=channel,
                    external_contact_id=wa_id,
                )

                if existing_open is None:
                    created_conversations += 1

                content, message_type = extract_message_content(inbound)

                message = Message(
                    conversation_id=conversation.id,
                    sender="customer",
                    direction="inbound",
                    source="whatsapp",
                    external_message_id=external_message_id,
                    content=content,
                    message_type=message_type,
                )
                db.add(message)

                conversation.updated_at = datetime.utcnow()
                conversation.source = "whatsapp"
                conversation.external_contact_id = wa_id

                db.commit()
                created_messages += 1

    return {
        "messages_created": created_messages,
        "conversations_created": created_conversations,
    }