"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LogOut, Mail, Shield, Calendar, UserCircle } from "lucide-react";
import { getMe } from "@/lib/api";
import { User } from "@/types";
import { getToken, logout, setUser } from "@/lib/auth";

export default function ProfilePage() {
  const [user, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getToken();
      if (!token) {
        logout();
        return;
      }

      try {
        const me = await getMe();
        setCurrentUser(me);
        setUser(me);
      } catch (err) {
        console.error(err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <p className="text-gray-500">جاري تحميل الملف الشخصي...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">الملف الشخصي</h1>
              <p className="text-xs text-gray-400">معلومات حسابك في وصلة</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition"
          >
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Mail size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                <p className="text-sm font-medium text-gray-800">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Shield size={18} className="text-green-500" />
              <div>
                <p className="text-xs text-gray-400">الدور</p>
                <p className="text-sm font-medium text-gray-800">
                  {user.role === "admin" ? "مدير" : "موظف"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <UserCircle size={18} className="text-purple-500" />
              <div>
                <p className="text-xs text-gray-400">حالة الحساب</p>
                <p className="text-sm font-medium text-gray-800">
                  {user.is_active ? "نشط" : "معطل"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Calendar size={18} className="text-orange-500" />
              <div>
                <p className="text-xs text-gray-400">تاريخ الإنشاء</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(user.created_at).toLocaleDateString("ar-MA")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}