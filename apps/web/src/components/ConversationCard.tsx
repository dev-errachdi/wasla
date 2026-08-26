import {
  MessageCircle,
  Phone,
  Clock,
  Hash,
  CheckCircle,
  AlertCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  UserPlus,
  UserX,
  User,
  BadgeInfo,
} from "lucide-react";
import { Conversation, ConversationStatus } from "@/types";

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  open: "bg-green-500",
  pending: "bg-yellow-500",
  closed: "bg-gray-400",
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  open: "مفتوح",
  pending: "انتظار",
  closed: "مغلق",
};

function formatCustomerId(id: number) {
  return `C-${String(id).padStart(6, "0")}`;
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return `${date.toLocaleDateString("ar-MA")} • ${date.toLocaleTimeString("ar-MA", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

interface Props {
  conversation: Conversation;
  currentUserId?: number;
  onClick?: () => void;
  onStatusChange?: (id: number, status: ConversationStatus) => void;
  onAssignToMe?: (id: number) => void;
  onUnassign?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function ConversationCard({
  conversation,
  currentUserId,
  onClick,
  onStatusChange,
  onAssignToMe,
  onUnassign,
  onDelete,
}: Props) {
  const firstLetter =
    conversation.contact?.name?.charAt(0)?.toUpperCase() || "?";

  const isAssignedToMe = conversation.assigned_user?.id === currentUserId;

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-bold text-sm">
              {firstLetter}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {conversation.contact?.name || "غير معروف"}
            </h3>

            <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
              <Phone size={10} />
              <span>{conversation.contact?.phone || "غير متوفر"}</span>
            </div>

            <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
              <BadgeInfo size={10} />
              <span>ID العميل: {formatCustomerId(conversation.contact.id)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-white text-xs px-2 py-1 rounded-full ${
              statusColors[conversation.status] || "bg-gray-400"
            }`}
          >
            {statusLabels[conversation.status] || conversation.status}
          </span>
          <ChevronLeft
            size={14}
            className="text-gray-300 group-hover:text-blue-400 transition"
          />
        </div>
      </div>

      {conversation.assigned_user ? (
        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1 mb-3 w-fit">
          <User size={12} />
          <span>
            المسؤول: {conversation.assigned_user.name}
            {isAssignedToMe ? " (أنا)" : ""}
          </span>
        </div>
      ) : (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-2 py-1 mb-3 w-fit">
          غير معينة
        </div>
      )}

      {conversation.last_message && (
        <div className="flex items-start gap-2 text-gray-500 text-xs bg-gray-50 rounded-lg p-2 mb-3">
          <MessageCircle
            size={12}
            className="mt-0.5 flex-shrink-0 text-gray-400"
          />
          <div>
            <p className="line-clamp-2">{conversation.last_message}</p>
            <p className="text-[11px] text-gray-300 mt-1">
              {formatDateTime(conversation.last_message_at || conversation.updated_at)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-gray-300 text-xs">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{formatDateTime(conversation.updated_at)}</span>
          </div>
          {conversation.message_count !== undefined && (
            <div className="flex items-center gap-1">
              <Hash size={10} />
              <span>{conversation.message_count} رسالة</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          {!isAssignedToMe ? (
            <button
              onClick={(e) =>
                handleAction(e, () => onAssignToMe?.(conversation.id))
              }
              title="تعيين لي"
              className="p-1.5 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 transition"
            >
              <UserPlus size={14} />
            </button>
          ) : (
            <button
              onClick={(e) =>
                handleAction(e, () => onUnassign?.(conversation.id))
              }
              title="إلغاء التعيين"
              className="p-1.5 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 transition"
            >
              <UserX size={14} />
            </button>
          )}

          {conversation.status !== "open" && (
            <button
              onClick={(e) =>
                handleAction(e, () =>
                  onStatusChange?.(conversation.id, "open")
                )
              }
              title="فتح"
              className="p-1.5 rounded-lg bg-green-50 text-green-500 hover:bg-green-100 transition"
            >
              <CheckCircle size={14} />
            </button>
          )}

          {conversation.status !== "pending" && (
            <button
              onClick={(e) =>
                handleAction(e, () =>
                  onStatusChange?.(conversation.id, "pending")
                )
              }
              title="انتظار"
              className="p-1.5 rounded-lg bg-yellow-50 text-yellow-500 hover:bg-yellow-100 transition"
            >
              <AlertCircle size={14} />
            </button>
          )}

          {conversation.status !== "closed" && (
            <button
              onClick={(e) =>
                handleAction(e, () =>
                  onStatusChange?.(conversation.id, "closed")
                )
              }
              title="إغلاق"
              className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition"
            >
              <XCircle size={14} />
            </button>
          )}

          <button
            onClick={(e) => handleAction(e, () => onDelete?.(conversation.id))}
            title="حذف"
            className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}