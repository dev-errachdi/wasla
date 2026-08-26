"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Save,
  RefreshCw,
  Clock,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getAutoReplySettings,
  updateAutoReplySettings,
} from "@/lib/api";

interface AutoReplySettings {
  id: number;
  enabled: boolean;
  reply_text: string;
  outside_hours_only: boolean;
  start_hour: number;
  end_hour: number;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
}

export default function AutoReplySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AutoReplySettings>({
    id: 0,
    enabled: false,
    reply_text: "",
    outside_hours_only: false,
    start_hour: 9,
    end_hour: 18,
    cooldown_minutes: 60,
    created_at: "",
    updated_at: "",
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAutoReplySettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      alert("فشل تحميل إعدادات الرد التلقائي");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = await updateAutoReplySettings({
        enabled: settings.enabled,
        reply_text: settings.reply_text,
        outside_hours_only: settings.outside_hours_only,
        start_hour: Number(settings.start_hour),
        end_hour: Number(settings.end_hour),
        cooldown_minutes: Number(settings.cooldown_minutes),
      });
      setSettings(updated);
      alert("تم حفظ إعدادات الرد التلقائي ✅");
    } catch (err) {
      console.error(err);
      alert("فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight size={18} />
            </Link>

            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900">
                إعدادات الرد التلقائي
              </h1>
              <p className="text-xs text-gray-400">
                تحكم في الردود التلقائية من وصلة
              </p>
            </div>
          </div>

          <button
            onClick={loadSettings}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6"
        >
          {/* تفعيل/تعطيل */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <h2 className="font-semibold text-gray-800">
                تفعيل الرد التلقائي
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                إذا تم تفعيله، يمكن لوصلة إرسال رد تلقائي للعملاء
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
              className="text-blue-600 hover:text-blue-700 transition"
            >
              {settings.enabled ? (
                <ToggleRight size={38} />
              ) : (
                <ToggleLeft size={38} />
              )}
            </button>
          </div>

          {/* نص الرد */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نص الرد التلقائي
            </label>
            <textarea
              value={settings.reply_text}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  reply_text: e.target.value,
                }))
              }
              rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="اكتب نص الرد التلقائي..."
            />
          </div>

          {/* خارج أوقات العمل */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-yellow-500" />
              <div>
                <h3 className="font-medium text-gray-800">
                  العمل فقط خارج أوقات العمل
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  إذا تم التفعيل، سيتم إرسال الرد التلقائي خارج الساعات المحددة فقط
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  outside_hours_only: !prev.outside_hours_only,
                }))
              }
              className="text-yellow-500 hover:text-yellow-600 transition"
            >
              {settings.outside_hours_only ? (
                <ToggleRight size={38} />
              ) : (
                <ToggleLeft size={38} />
              )}
            </button>
          </div>

          {/* ساعات العمل */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">
                بداية وقت العمل
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={settings.start_hour}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    start_hour: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                نهاية وقت العمل
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={settings.end_hour}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    end_hour: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">
                مدة الانتظار بين الردود (بالدقائق)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={settings.cooldown_minutes}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    cooldown_minutes: Number(e.target.value),
                  }))
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ملخص سريع */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">
              ملخص الإعدادات الحالية
            </h3>
            <div className="text-sm text-blue-600 space-y-1">
              <p>
                الحالة:{" "}
                <span className="font-medium">
                  {settings.enabled ? "مفعل" : "معطل"}
                </span>
              </p>
              <p>
                النطاق الزمني:{" "}
                <span className="font-medium">
                  من {settings.start_hour}:00 إلى {settings.end_hour}:00
                </span>
              </p>
              <p>
                التكرار:{" "}
                <span className="font-medium">
                  كل {settings.cooldown_minutes} دقيقة
                </span>
              </p>
              <p>
                الوضع:{" "}
                <span className="font-medium">
                  {settings.outside_hours_only
                    ? "خارج أوقات العمل فقط"
                    : "في جميع الأوقات"}
                </span>
              </p>
            </div>
          </div>

          {/* حفظ */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}