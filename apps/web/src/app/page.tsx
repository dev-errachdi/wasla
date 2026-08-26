"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  BarChart2,
  Flag,
  BellRing,
  Tag,
} from "lucide-react";
import ConversationCard from "@/components/ConversationCard";
import BridgeStatusBar from "@/components/BridgeStatusBar";
import NotificationBell from "@/components/NotificationBell";
import {
  getConversations,
  createConversation,
  updateConversationStatus,
  deleteConversation,
  getMe,
  assignConversationToMe,
  unassignConversation,
} from "@/lib/api";
import { Conversation, ConversationStatus, User } from "@/types";
import { getToken, logout, setUser } from "@/lib/auth";

const STATUS_TABS = [
  { label: "الكل", value: "" },
  { label: "جديد", value: "new" },
  { label: "مفتوح", value: "open" },
  { label: "انتظار", value: "pending" },
  { label: "مغلق", value: "closed" },
];

const ASSIGNMENT_TABS = [
  { label: "كل المحادثات", value: "" },
  { label: "محادثاتي", value: "mine" },
  { label: "غير معينة", value: "unassigned" },
];

const PRIORITY_OPTIONS = [
  { label: "كل الأولويات", value: "" },
  { label: "منخفض", value: "low" },
  { label: "عادي", value: "normal" },
  { label: "عالي", value: "high" },
];

const FOLLOW_UP_OPTIONS = [
  { label: "كل المتابعات", value: "" },
  { label: "متابعة اليوم", value: "today" },
  { label: "متأخرة", value: "overdue" },
];

function getPriorityLabel(priority?: string) {
  switch (priority) {
    case "low":
      return "منخفض";
    case "high":
      return "عالي";
    case "normal":
    default:
      return "عادي";
  }
}

function getPriorityClasses(priority?: string) {
  switch (priority) {
    case "low":
      return "bg-gray-100 text-gray-600";
    case "high":
      return "bg-red-100 text-red-600";
    case "normal":
    default:
      return "bg-blue-100 text-blue-600";
  }
}

export default function Home() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [assignmentTab, setAssignmentTab] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [followUpFilter, setFollowUpFilter] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    first_message: "",
  });

  const lastDataRef = useRef("");

  const verifySession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const me = await getMe();
      setCurrentUser(me);
      setUser(me);
    } catch (err) {
      console.error(err);
      logout();
      return;
    } finally {
      setSessionChecking(false);
    }
  }, [router]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const fetchConversations = useCallback(
    async (silent = false) => {
      if (sessionChecking) return;

      try {
        if (!initialLoaded && !silent) {
          setLoading(true);
        } else if (!silent) {
          setRefreshing(true);
        }

        const data = await getConversations(
          search,
          activeTab,
          assignmentTab,
          priorityFilter,
          followUpFilter
        );

        const newDataString = JSON.stringify(
          data.map((c: Conversation) => ({
            id: c.id,
            status: c.status,
            priority: c.priority,
            follow_up_at: c.follow_up_at,
            updated_at: c.updated_at,
            last_message: c.last_message,
            message_count: c.message_count,
            assigned_user: c.assigned_user?.id ?? null,
            tags: c.tags?.map((t) => `${t.label}:${t.color}`) ?? [],
          }))
        );

        if (newDataString !== lastDataRef.current) {
          setConversations(data);
          lastDataRef.current = newDataString;
        }

        setError("");
      } catch (err) {
        console.error(err);
        if (err instanceof Error && err.message === "UNAUTHORIZED") {
          logout();
          return;
        }
        setError("لا يمكن الاتصال بالخادم ❌");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialLoaded(true);
      }
    },
    [
      search,
      activeTab,
      assignmentTab,
      priorityFilter,
      followUpFilter,
      sessionChecking,
      initialLoaded,
    ]
  );

  useEffect(() => {
    if (!sessionChecking) {
      fetchConversations();
    }
  }, [fetchConversations, sessionChecking]);

  useEffect(() => {
    if (sessionChecking) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchConversations(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, sessionChecking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConversation({
        customer_name: form.customer_name,
        phone: form.phone,
        status: "new",
        first_message: form.first_message,
      });
      setForm({ customer_name: "", phone: "", first_message: "" });
      setShowForm(false);
      fetchConversations(true);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
      alert("حدث خطأ أثناء الإنشاء");
    }
  };

  const handleStatusChange = async (
    id: number,
    status: ConversationStatus
  ) => {
    try {
      await updateConversationStatus(id, status);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
      alert("فشل تحديث الحالة");
    }
  };

  const handleAssignToMe = async (id: number) => {
    try {
      const result = await assignConversationToMe(id);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, assigned_user: result.assigned_user } : c
        )
      );
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
      alert("فشل تعيين المحادثة");
    }
  };

  const handleUnassign = async (id: number) => {
    try {
      await unassignConversation(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, assigned_user: null } : c))
      );
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
      alert("فشل إلغاء التعيين");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحادثة؟")) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
      alert("فشل حذف المحادثة");
    }
  };

  const counts = {
    all: conversations.length,
    new: conversations.filter((c) => c.status === "new").length,
    open: conversations.filter((c) => c.status === "open").length,
    pending: conversations.filter((c) => c.status === "pending").length,
    closed: conversations.filter((c) => c.status === "closed").length,
  };

  if (sessionChecking) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center text-gray-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">جارٍ التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  const showFullLoading = loading && !initialLoaded;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">وصلة</h1>
              <p className="text-xs text-gray-400">نظام إدارة المحادثات</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <Link
                href="/profile"
                className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 hover:bg-gray-100 transition"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {currentUser.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 hidden md:block">
                  {currentUser.name}
                </span>
              </Link>
            )}

            <Link
              href="/dashboard"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
              title="لوحة التحكم"
            >
              <BarChart2 size={16} />
            </Link>

            <Link
              href="/bridge"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <NotificationBell
                onNewMessage={() => fetchConversations(true)}
              />
            </Link>

            <button
              onClick={() => fetchConversations(false)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              محادثة جديدة
            </button>

            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <BridgeStatusBar />

      <main className="max-w-5xl mx-auto px-6 py-6">
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              إنشاء محادثة جديدة
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    اسم العميل
                  </label>
                  <input
                    type="text"
                    required
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm({ ...form, customer_name: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+212600000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  أول رسالة
                </label>
                <textarea
                  value={form.first_message}
                  onChange={(e) =>
                    setForm({ ...form, first_message: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="محتوى الرسالة..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg text-sm hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "الكل", count: counts.all, color: "text-gray-700" },
            { label: "جديد", count: counts.new, color: "text-blue-600" },
            { label: "مفتوح", count: counts.open, color: "text-green-600" },
            {
              label: "انتظار",
              count: counts.pending,
              color: "text-yellow-600",
            },
            { label: "مغلق", count: counts.closed, color: "text-gray-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-4 border border-gray-100 text-center shadow-sm"
            >
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.count}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو ID العميل..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">كل الأولويات</option>
            <option value="low">منخفض</option>
            <option value="normal">عادي</option>
            <option value="high">عالي</option>
          </select>

          <select
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">كل المتابعات</option>
            <option value="today">متابعة اليوم</option>
            <option value="overdue">متأخرة</option>
          </select>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {ASSIGNMENT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setAssignmentTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                assignmentTab === tab.value
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-purple-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
                activeTab === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-blue-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showFullLoading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">جاري التحميل...</p>
          </div>
        ) : error && conversations.length === 0 ? (
          <div className="text-center py-12 text-red-500 bg-white rounded-2xl border border-red-100 p-6">
            <p>{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <MessageCircle size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">
              لا توجد محادثات
            </p>
            <p className="text-xs text-gray-300 mt-1">
              اضغط على محادثة جديدة للبدء
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversations.map((conv) => (
              <div key={conv.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {conv.priority && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        conv.priority === "high"
                          ? "bg-red-100 text-red-600"
                          : conv.priority === "low"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {conv.priority === "high"
                        ? "أولوية عالية"
                        : conv.priority === "low"
                        ? "أولوية منخفضة"
                        : "أولوية عادية"}
                    </span>
                  )}

                  {conv.follow_up_at && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                      متابعة:{" "}
                      {new Date(conv.follow_up_at).toLocaleDateString("ar-MA")}
                    </span>
                  )}

                  {conv.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className={`text-xs px-2 py-1 rounded-full ${
                        tag.color === "red"
                          ? "bg-red-100 text-red-600"
                          : tag.color === "green"
                          ? "bg-green-100 text-green-600"
                          : tag.color === "yellow"
                          ? "bg-yellow-100 text-yellow-600"
                          : tag.color === "purple"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>

                <ConversationCard
                  conversation={conv}
                  currentUserId={currentUser?.id}
                  onClick={() => router.push(`/conversations/${conv.id}`)}
                  onStatusChange={handleStatusChange}
                  onAssignToMe={handleAssignToMe}
                  onUnassign={handleUnassign}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}