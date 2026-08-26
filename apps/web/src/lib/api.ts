import { ConversationStatus, User } from "@/types";
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleError(
  res: Response,
  fallbackMessage: string
): Promise<never> {
  let message = fallbackMessage;

  try {
    const data = await res.json();
    message = data.detail || data.message || fallbackMessage;
  } catch {
    // ignore
  }

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  throw new Error(message);
}

// ==================== AUTH ====================

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "بيانات الدخول غير صحيحة");
  }

  return res.json();
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل إنشاء الحساب");
  }

  return res.json();
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    await handleError(res, "غير مصرح");
  }

  return res.json();
}

// ==================== CONVERSATIONS ====================

export async function getConversations(
  search?: string,
  status?: string,
  assignment?: string,
  priority?: string,
  followUp?: string
) {
  const params = new URLSearchParams();

  if (search) params.append("search", search);
  if (status) params.append("status", status);
  if (assignment) params.append("assignment", assignment);
  if (priority) params.append("priority", priority);
  if (followUp) params.append("follow_up", followUp);

  const url = `${API_URL}/conversations${
    params.toString() ? "?" + params.toString() : ""
  }`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحميل المحادثات");
  }

  return res.json();
}

export async function getConversation(id: number) {
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحميل المحادثة");
  }

  return res.json();
}

export async function createConversation(data: {
  customer_name: string;
  phone: string;
  status?: ConversationStatus;
  first_message?: string;
}) {
  const res = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل إنشاء المحادثة");
  }

  return res.json();
}

export async function updateConversationStatus(
  id: number,
  status: ConversationStatus
) {
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحديث الحالة");
  }

  return res.json();
}

export async function updateConversationPriority(
  id: number,
  priority: string
) {
  const res = await fetch(`${API_URL}/conversations/${id}/priority`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ priority }),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحديث الأولوية");
  }

  return res.json();
}

export async function updateConversationFollowUp(
  id: number,
  follow_up_at: string | null
) {
  const res = await fetch(`${API_URL}/conversations/${id}/follow-up`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ follow_up_at }),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحديث موعد المتابعة");
  }

  return res.json();
}

export async function assignConversationToMe(id: number) {
  const res = await fetch(`${API_URL}/conversations/${id}/assign-me`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تعيين المحادثة");
  }

  return res.json();
}

export async function unassignConversation(id: number) {
  const res = await fetch(`${API_URL}/conversations/${id}/unassign`, {
    method: "PATCH",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل إلغاء التعيين");
  }

  return res.json();
}

export async function deleteConversation(id: number) {
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل حذف المحادثة");
  }

  return res.json();
}

// ==================== MESSAGES ====================

export async function sendMessage(
  conversationId: number,
  data: {
    sender: string;
    content: string;
    message_type?: string;
  }
) {
  const res = await fetch(
    `${API_URL}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    await handleError(res, "فشل إرسال الرسالة");
  }

  return res.json();
}

// ==================== NOTES ====================

export async function getConversationNotes(conversationId: number) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/notes`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحميل الملاحظات");
  }

  return res.json();
}

export async function addConversationNote(
  conversationId: number,
  data: { content: string }
) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/notes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل إضافة الملاحظة");
  }

  return res.json();
}

// ==================== TAGS ====================

export async function getConversationTags(conversationId: number) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/tags`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحميل الوسوم");
  }

  return res.json();
}

export async function addConversationTag(
  conversationId: number,
  data: {
    label: string;
    color?: string;
  }
) {
  const res = await fetch(`${API_URL}/conversations/${conversationId}/tags`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل إضافة الوسم");
  }

  return res.json();
}

export async function deleteConversationTag(tagId: number) {
  const res = await fetch(`${API_URL}/tags/${tagId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل حذف الوسم");
  }

  return res.json();
}

// ==================== QUICK REPLIES ====================

export async function getQuickReplies() {
  const res = await fetch(`${API_URL}/quick-replies`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحميل الردود السريعة");
  }

  return res.json();
}

export async function createQuickReply(data: {
  title: string;
  content: string;
}) {
  const res = await fetch(`${API_URL}/quick-replies`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل إنشاء الرد السريع");
  }

  return res.json();
}

export async function deleteQuickReply(id: number) {
  const res = await fetch(`${API_URL}/quick-replies/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!res.ok) {
    await handleError(res, "فشل حذف الرد السريع");
  }

  return res.json();
}

// ==================== AUTO REPLY ====================

export async function getAutoReplySettings() {
  const res = await fetch(`${API_URL}/auto-reply`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return {
      id: 0,
      enabled: false,
      reply_text: "",
      outside_hours_only: false,
      start_hour: 9,
      end_hour: 18,
      cooldown_minutes: 60,
      created_at: "",
      updated_at: "",
    };
  }

  return res.json();
}

export async function updateAutoReplySettings(data: {
  enabled: boolean;
  reply_text: string;
  outside_hours_only: boolean;
  start_hour: number;
  end_hour: number;
  cooldown_minutes: number;
}) {
  const res = await fetch(`${API_URL}/auto-reply`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    await handleError(res, "فشل تحديث إعدادات الرد التلقائي");
  }

  return res.json();
}

// ==================== BRIDGE & STATS ====================

export async function getBridgeStatus() {
  const res = await fetch(`${API_URL}/bridge/status`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return {
      is_connected: false,
      heartbeat_at: null,
      bridge_pid: null,
      bridge_status: "unknown",
      last_sync: null,
      messages_today: 0,
      last_message_content: null,
      last_message_at: null,
    };
  }

  return res.json();
}

export async function getStatsToday() {
  const res = await fetch(`${API_URL}/stats/today`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return {
      total_conversations: 0,
      new_today: 0,
      closed_today: 0,
      messages_today: 0,
      unread: 0,
      due_followups: 0,
      high_priority: 0,
    };
  }

  return res.json();
}

// ==================== AI ====================

export async function aiAnalyzeConversation(conversationId: number) {
  const res = await fetch(`${API_URL}/ai/analyze/${conversationId}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function aiSuggestReply(conversationId: number) {
  const res = await fetch(`${API_URL}/ai/suggest-reply/${conversationId}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function aiDailyReport() {
  const res = await fetch(`${API_URL}/ai/daily-report`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function aiCustomerProfile(contactId: number) {
  const res = await fetch(`${API_URL}/ai/customer-profile/${contactId}`, {
    cache: "no-store",
    headers: authHeaders(),
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}