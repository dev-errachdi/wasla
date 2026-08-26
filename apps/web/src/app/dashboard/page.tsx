"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Users,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Clock,
  BarChart2,
  RefreshCw,
  TrendingUp,
  Mail,
  Bot,
} from "lucide-react";
import { getBridgeStatus, getStatsToday, getConversations } from "@/lib/api";
import { getToken, logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface BridgeStatus {
  is_connected: boolean;
  heartbeat_at: string | null;
  messages_today: number;
  last_message_content: string | null;
  last_message_at: string | null;
}

interface Stats {
  total_conversations: number;
  new_today: number;
  closed_today: number;
  messages_today: number;
  unread: number;
}

interface ConversationSummary {
  id: number;
  status: string;
  updated_at: string;
  contact: {
    id: number;
    name: string;
    phone: string;
  };
  last_message: string | null;
  message_count: number;
}

export default function DashboardPage() {
  const router = useRouter();

  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentConversations, setRecentConversations] = useState<
    ConversationSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const [bridgeData, statsData, conversationsData] = await Promise.all([
        getBridgeStatus(),
        getStatsToday(),
        getConversations(),
      ]);

      setBridge(bridgeData);
      setStats(statsData);
      setRecentConversations(conversationsData.slice(0, 5));
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        logout();
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        dir="rtl"
      >
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                لوحة التحكم اليومية
              </h1>
              <p className="text-xs text-gray-400">
                آخر تحديث:{" "}
                {lastRefresh.toLocaleTimeString("ar-MA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>

          <button
            onClick={fetchAll}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Bridge Status */}
        <div
          className={`rounded-2xl p-6 border ${
            bridge?.is_connected
              ? "bg-green-50 border-green-100"
              : "bg-red-50 border-red-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                bridge?.is_connected ? "bg-green-500" : "bg-red-400"
              }`}
            >
              {bridge?.is_connected ? (
                <Wifi size={28} className="text-white" />
              ) : (
                <WifiOff size={28} className="text-white" />
              )}
            </div>

            <div>
              <h2
                className={`text-lg font-bold ${
                  bridge?.is_connected ? "text-green-700" : "text-red-600"
                }`}
              >
                {bridge?.is_connected
                  ? "واتساب متصل ✅"
                  : "واتساب غير متصل ❌"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {bridge?.is_connected
                  ? "الرسائل تصل وتُرسل بشكل طبيعي"
                  : "شغّل البريدج لإعادة الاتصال"}
              </p>
            </div>

            {bridge?.is_connected && (
              <div className="mr-auto">
                <span className="flex items-center gap-1.5 text-green-600 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  مباشر
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "إجمالي المحادثات",
              value: stats?.total_conversations ?? 0,
              icon: Users,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "محادثات جديدة اليوم",
              value: stats?.new_today ?? 0,
              icon: TrendingUp,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "رسائل واردة اليوم",
              value: stats?.messages_today ?? 0,
              icon: Mail,
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              label: "مغلقة اليوم",
              value: stats?.closed_today ?? 0,
              icon: CheckCircle,
              color: "text-gray-600",
              bg: "bg-gray-50",
            },
            {
              label: "غير مقروءة",
              value: stats?.unread ?? 0,
              icon: XCircle,
              color: "text-red-500",
              bg: "bg-red-50",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
            >
              <div
                className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}
              >
                <item.icon size={20} className={item.color} />
              </div>
              <p className={`text-3xl font-bold ${item.color}`}>
                {item.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Last Message */}
        {bridge?.last_message_content && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              آخر رسالة واردة
            </h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              {bridge.last_message_content}
            </p>
            {bridge.last_message_at && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(bridge.last_message_at).toLocaleString("ar-MA")}
              </p>
            )}
          </div>
        )}

        {/* Recent Conversations */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-500" />
              آخر المحادثات
            </h3>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              عرض الكل ←
            </Link>
          </div>

          {recentConversations.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              لا توجد محادثات
            </p>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">
                        {conv.contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {conv.contact.name}
                      </p>
                      {conv.last_message && (
                        <p className="text-xs text-gray-400 line-clamp-1 max-w-[200px]">
                          {conv.last_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <MessageCircle size={12} />
                      {conv.message_count}
                    </span>
                    <span>
                      {new Date(conv.updated_at).toLocaleTimeString("ar-MA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-blue-200 transition text-center"
          >
            <MessageCircle size={24} className="mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">المحادثات</p>
          </Link>

          <Link
            href="/bridge"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-green-200 transition text-center"
          >
            <Wifi size={24} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-gray-700">حالة البريدج</p>
          </Link>

          <Link
            href="/settings/auto-reply"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-yellow-200 transition text-center"
          >
            <Bot size={24} className="mx-auto mb-2 text-yellow-500" />
            <p className="text-sm font-medium text-gray-700">
              الرد التلقائي
            </p>
          </Link>

          <Link
            href="/profile"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-purple-200 transition text-center"
          >
            <Users size={24} className="mx-auto mb-2 text-purple-500" />
            <p className="text-sm font-medium text-gray-700">الملف الشخصي</p>
          </Link>
        </div>
      </main>
    </div>
  );
}