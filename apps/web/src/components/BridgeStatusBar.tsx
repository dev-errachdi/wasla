"use client";

import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, MessageCircle, Clock, RefreshCw } from "lucide-react";
import { getBridgeStatus } from "@/lib/api";

interface BridgeStatus {
  is_connected: boolean;
  last_sync: string | null;
  messages_today: number;
  last_message_content: string | null;
  last_message_at: string | null;
}

export default function BridgeStatusBar() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getBridgeStatus();
      setStatus(data);
    } catch (err) {
      console.error("bridge status error:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!status) return null;

  const lastSync = status.last_message_at
    ? new Date(status.last_message_at).toLocaleTimeString("ar-MA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div
      className={`w-full px-6 py-2 text-xs flex items-center justify-between gap-4 ${
        status.is_connected
          ? "bg-green-50 border-b border-green-100 text-green-700"
          : "bg-red-50 border-b border-red-100 text-red-600"
      }`}
    >
      <div className="flex items-center gap-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-1.5 font-medium">
          {status.is_connected ? (
            <>
              <Wifi size={13} />
              <span>واتساب متصل</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1" />
            </>
          ) : (
            <>
              <WifiOff size={13} />
              <span>واتساب غير متصل</span>
              <span className="w-2 h-2 rounded-full bg-red-400 ml-1" />
            </>
          )}
        </div>

        <div className="h-3 w-px bg-current opacity-20" />

        <div className="flex items-center gap-1">
          <MessageCircle size={12} />
          <span>رسائل اليوم: {status.messages_today}</span>
        </div>

        {status.last_message_at && (
          <>
            <div className="h-3 w-px bg-current opacity-20" />
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>آخر رسالة: {lastSync}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}