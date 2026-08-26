"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  RefreshCw,
  MessageCircle,
  FileText,
  Sparkles,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  aiDailyReport,
  getConversations,
  getMe,
} from "@/lib/api";
import { getToken, logout, setUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface DailyReport {
  date: string;
  total_conversations: number;
  report: string;
}

export default function AiPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    open: 0,
    pending: 0,
    closed: 0,
  });

  const verifySession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      logout();
    }
  }, [router]);

  const loadStats = useCallback(async () => {
    try {
      const conversations = await getConversations();
      setStats({
        total: conversations.length,
        new: conversations.filter((c: any) => c.status === "new").length,
        open: conversations.filter((c: any) => c.status === "open").length,
        pending: conversations.filter((c: any) => c.status === "pending").length,
        closed: conversations.filter((c: any) => c.status === "closed").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
    loadStats();
  }, [verifySession, loadStats]);

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      const data = await aiDailyReport();
      setDailyReport(data);
    } catch (err) {
      console.error(err);
      alert("فشل إنشاء التقرير، تأكد أن Ollama يعمل");
    } finally {
      setReportLoading(false);
    }
  };

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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight size={18} />
            </Link>

            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900">
                مساعد وصلة الذكي
              </h1>
              <p className="text-xs text-gray-400">
                مدعوم بـ Qwen2.5 — محلي وخاص
              </p>
            </div>
          </div>

          <button
            onClick={loadStats}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "الكل",
              value: stats.total,
              color: "text-gray-700",
              bg: "bg-gray-50",
            },
            {
              label: "جديد",
              value: stats.new,
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "مفتوح",
              value: stats.open,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              label: "انتظار",
              value: stats.pending,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
            },
            {
              label: "مغلق",
              value: stats.closed,
              color: "text-gray-400",
              bg: "bg-gray-50",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-2xl p-4 border border-gray-100 text-center`}
            >
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* AI Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Report */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">التقرير اليومي</h2>
                <p className="text-xs text-gray-400">
                  ملخص ذكي لكل محادثات اليوم
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {reportLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  إنشاء التقرير اليومي
                </>
              )}
            </button>

            {dailyReport && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-600 font-medium">
                    تقرير {dailyReport.date}
                  </span>
                  <span className="text-xs text-gray-400">
                    {dailyReport.total_conversations} محادثة
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {dailyReport.report}
                </p>
              </div>
            )}
          </div>

          {/* AI Features List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Bot size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800">قدرات الذكاء</h2>
                <p className="text-xs text-gray-400">
                  مدعوم بـ Qwen2.5 محلياً
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  icon: MessageCircle,
                  color: "text-blue-500",
                  bg: "bg-blue-50",
                  title: "اقتراح الرد",
                  desc: "يقترح ردًا مناسبًا لكل عميل",
                  available: true,
                },
                {
                  icon: TrendingUp,
                  color: "text-green-500",
                  bg: "bg-green-50",
                  title: "تحليل المحادثة",
                  desc: "يكتشف النية والمزاج والأولوية",
                  available: true,
                },
                {
                  icon: User,
                  color: "text-purple-500",
                  bg: "bg-purple-50",
                  title: "تحليل العميل",
                  desc: "يحدد أسلوب التواصل الأنسب",
                  available: true,
                },
                {
                  icon: FileText,
                  color: "text-orange-500",
                  bg: "bg-orange-50",
                  title: "التقرير اليومي",
                  desc: "ملخص شامل لكل نشاط اليوم",
                  available: true,
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div
                    className={`w-8 h-8 ${feature.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <feature.icon size={16} className={feature.color} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {feature.title}
                    </p>
                    <p className="text-xs text-gray-400">{feature.desc}</p>
                  </div>
                  {feature.available ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <Clock size={16} className="text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-700 mb-1">
                كيف يعمل الذكاء الاصطناعي في وصلة؟
              </h3>
              <p className="text-sm text-purple-600 leading-relaxed">
                يعمل المودل محلياً على جهازك عبر Ollama، وهذا يعني أن
                بياناتك لا تغادر جهازك أبداً.
                لاستخدام ميزات AI في أي محادثة،
                ادخل على صفحة المحادثة وستجد أزرار AI هناك.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-blue-200 transition text-center"
          >
            <MessageCircle size={24} className="mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">المحادثات</p>
            <p className="text-xs text-gray-400 mt-1">
              استخدم AI في كل محادثة
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-green-200 transition text-center"
          >
            <TrendingUp size={24} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-gray-700">Dashboard</p>
            <p className="text-xs text-gray-400 mt-1">إحصائيات اليوم</p>
          </Link>

          <Link
            href="/bridge"
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-purple-200 transition text-center"
          >
            <Bot size={24} className="mx-auto mb-2 text-purple-500" />
            <p className="text-sm font-medium text-gray-700">حالة البريدج</p>
            <p className="text-xs text-gray-400 mt-1">واتساب + AI</p>
          </Link>
        </div>
      </main>
    </div>
  );
}