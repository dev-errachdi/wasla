"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Wifi,
  WifiOff,
  MessageCircle,
  Clock,
  RefreshCw,
  BarChart2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getBridgeStatus, getStatsToday } from "@/lib/api";

interface BridgeStatus {
  is_connected: boolean;
  last_sync: string | null;
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

export default function BridgePage() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([
        getBridgeStatus(),
        getStatsToday(),
      ]);
      setStatus(s);
      setStats(st);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <RefreshCw size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="font-bold text-gray-900">حالة البريدج</h1>
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

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Bridge Connection Status */}
        <div
          className={`rounded-2xl p-6 border ${
            status?.is_connected
              ? "bg-green-50 border-green-100"
              : "bg-red-50 border-red-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                status?.is_connected ? "bg-green-500" : "bg-red-400"
              }`}
            >
              {status?.is_connected ? (
                <Wifi size={28} className="text-white" />
              ) : (
                <WifiOff size={28} className="text-white" />
              )}
            </div>

            <div>
              <h2
                className={`text-lg font-bold ${
                  status?.is_connected ? "text-green-700" : "text-red-600"
                }`}
              >
                {status?.is_connected
                  ? "البريدج متصل بواتساب ✅"
                  : "البريدج غير متصل ❌"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {status?.is_connected
                  ? "الرسائل تصل وتُرسل بشكل طبيعي"
                  : "شغّل Terminal 3 لإعادة الاتصال"}
              </p>
            </div>

            {status?.is_connected && (
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "رسائل اليوم",
              value: status?.messages_today ?? 0,
              icon: MessageCircle,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "محادثات جديدة اليوم",
              value: stats?.new_today ?? 0,
              icon: BarChart2,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "محادثات مغلقة اليوم",
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
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div
                className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center mb-3`}
              >
                <item.icon size={18} className={item.color} />
              </div>
              <p className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Last Message */}
        {status?.last_message_content && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              آخر رسالة واردة
            </h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
              {status.last_message_content}
            </p>
            {status.last_message_at && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(status.last_message_at).toLocaleString("ar-MA")}
              </p>
            )}
          </div>
        )}

        {/* Total Stats */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-gray-400" />
            إحصائيات عامة
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">إجمالي المحادثات</span>
              <span className="font-bold text-gray-800">
                {stats?.total_conversations ?? 0}
              </span>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">رسائل اليوم</span>
              <span className="font-bold text-blue-600">
                {stats?.messages_today ?? 0}
              </span>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">محادثات غير مقروءة</span>
              <span className="font-bold text-red-500">
                {stats?.unread ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!status?.is_connected && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
            <h3 className="font-semibold text-yellow-700 mb-3">
              كيف تعيد تشغيل البريدج؟
            </h3>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>1. افتح Terminal جديد</p>
              <p>2. نفّذ:</p>
              <div className="bg-yellow-100 rounded-lg px-3 py-2 font-mono text-xs mt-1">
                cd ~/wasla/scripts/bridge && node index.js
              </div>
              <p>3. امسح QR من واتساب إذا طُلب منك ذلك</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}