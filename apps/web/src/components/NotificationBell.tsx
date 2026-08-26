"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { getStatsToday } from "@/lib/api";

interface Props {
  onNewMessage?: () => void;
}

export default function NotificationBell({ onNewMessage }: Props) {
  const [unread, setUnread] = useState(0);
  const [prevUnread, setPrevUnread] = useState(0);
  const [showPulse, setShowPulse] = useState(false);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (err) {
      // audio not supported
    }
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const stats = await getStatsToday();
      const newUnread = stats.unread || 0;

      if (newUnread > prevUnread && prevUnread !== 0) {
        playNotificationSound();
        setShowPulse(true);
        onNewMessage?.();
        setTimeout(() => setShowPulse(false), 3000);
      }

      setPrevUnread(newUnread);
      setUnread(newUnread);
    } catch (err) {
      console.error("notification error:", err);
    }
  }, [prevUnread, playNotificationSound, onNewMessage]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const base = "وصلة";
    if (unread > 0) {
      document.title = `(${unread}) ${base}`;
    } else {
      document.title = base;
    }
  }, [unread]);

  return (
    <div className="relative">
      <Bell
        size={18}
        className={`text-gray-500 hover:text-gray-700 transition ${
          showPulse ? "animate-bounce text-blue-500" : ""
        }`}
      />
      {unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </div>
  );
}