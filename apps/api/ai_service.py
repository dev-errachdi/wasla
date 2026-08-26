import httpx
import json
from datetime import datetime

OLLAMA_URL = "http://localhost:11434/api/generate"
AI_MODEL = "qwen2.5:0.5b"


async def ask_ai(prompt: str, system: str = "") -> str:
    full_prompt = f"{system}\n\n{prompt}" if system else prompt

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": AI_MODEL,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_predict": 512,
                    },
                },
                headers={"Content-Type": "application/json"},
            )
            data = response.json()
            return data.get("response", "").strip()
    except Exception as e:
        return f"AI Error: {str(e)}"


async def classify_conversation(messages: list[dict]) -> dict:
    if not messages:
        return {
            "intent": "unknown",
            "sentiment": "neutral",
            "priority": "normal",
            "summary": "لا توجد رسائل",
        }

    messages_text = "\n".join(
        [
            f"{'العميل' if m.get('sender') == 'customer' else 'الموظف'}: {m.get('content', '')}"
            for m in messages[-10:]
        ]
    )

    system = """You are an AI assistant for a WhatsApp business management system.
Analyze the conversation and respond ONLY with valid JSON.
No explanation, no markdown, just raw JSON."""

    prompt = f"""Analyze this conversation and return JSON with these exact fields:
- intent: one of (inquiry, complaint, purchase, followup, support, other)
- sentiment: one of (positive, neutral, negative, angry)
- priority: one of (low, normal, high, urgent)
- summary: short summary in Arabic (max 50 words)
- recommended_tone: one of (formal, friendly, calm, direct)

Conversation:
{messages_text}

Return only JSON, nothing else."""

    result = await ask_ai(prompt, system)

    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except Exception:
        pass

    return {
        "intent": "unknown",
        "sentiment": "neutral",
        "priority": "normal",
        "summary": result[:200] if result else "لم يتمكن من التحليل",
        "recommended_tone": "formal",
    }


async def suggest_reply(
    messages: list[dict],
    customer_name: str = "العميل",
) -> str:
    if not messages:
        return "مرحبًا، كيف يمكنني مساعدتك؟"

    messages_text = "\n".join(
        [
            f"{'العميل' if m.get('sender') == 'customer' else 'الموظف'}: {m.get('content', '')}"
            for m in messages[-10:]
        ]
    )

    last_message = messages[-1].get("content", "") if messages else ""

    prompt = f"""أنت موظف خدمة عملاء محترف.
اسم العميل: {customer_name}

المحادثة:
{messages_text}

آخر رسالة من العميل: {last_message}

اكتب رداً مناسباً باللغة العربية. الرد يجب أن يكون:
- قصير ومباشر
- محترف ولطيف
- يعالج طلب العميل
- لا يتجاوز 3 جمل

اكتب الرد فقط بدون أي مقدمات أو شرح:"""

    return await ask_ai(prompt)


async def generate_daily_report(conversations_data: list[dict]) -> str:
    if not conversations_data:
        return "لا توجد محادثات اليوم."

    today = datetime.now().strftime("%Y-%m-%d")

    summary_lines = []
    for conv in conversations_data[:20]:
        contact = conv.get("contact", {})
        name = contact.get("name", "غير معروف")
        status = conv.get("status", "")
        msg_count = conv.get("message_count", 0)
        last_msg = conv.get("last_message", "")

        summary_lines.append(
            f"- {name}: الحالة={status}, رسائل={msg_count}, آخر رسالة: {last_msg[:50] if last_msg else 'لا توجد'}"
        )

    summary_text = "\n".join(summary_lines)

    prompt = f"""أنت مساعد ذكاء اصطناعي لنظام إدارة محادثات تجاري.

اليوم: {today}
عدد المحادثات: {len(conversations_data)}

ملخص المحادثات:
{summary_text}

اكتب تقريراً يومياً باللغة العربية يشمل:
1. ملخص عام لليوم
2. أبرز الزبائن الذين يحتاجون متابعة
3. توصيات للموظفين

التقرير يجب أن يكون واضحاً ومفيداً ولا يتجاوز 200 كلمة:"""

    return await ask_ai(prompt)


async def analyze_customer_profile(
    customer_name: str,
    messages: list[dict],
) -> dict:
    if not messages:
        return {
            "profile": "عميل جديد",
            "communication_style": "formal",
            "needs": "غير معروف",
            "recommendation": "تعامل بأسلوب رسمي ولطيف",
        }

    messages_text = "\n".join(
        [
            f"العميل: {m.get('content', '')}"
            for m in messages
            if m.get("sender") == "customer"
        ][-15:]
    )

    prompt = f"""حلل أسلوب التواصل لهذا العميل:
الاسم: {customer_name}

رسائله:
{messages_text}

أجب بـ JSON فقط يحتوي على:
- profile: وصف قصير للعميل
- communication_style: formal أو friendly أو direct أو emotional
- needs: ما يحتاجه العميل
- recommendation: كيف تتعامل معه بأفضل طريقة

JSON فقط:"""

    result = await ask_ai(prompt)

    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(result[start:end])
    except Exception:
        pass

    return {
        "profile": "عميل عادي",
        "communication_style": "formal",
        "needs": result[:100] if result else "غير محدد",
        "recommendation": "تعامل بأسلوب رسمي ومحترم",
    }
