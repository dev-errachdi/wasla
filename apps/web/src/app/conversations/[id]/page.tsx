"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Send,
  Trash2,
  Phone,
  Clock,
  User,
  MessageCircle,
  UserPlus,
  UserX,
  BadgeInfo,
  RefreshCw,
  StickyNote,
  Zap,
  Plus,
  X,
  Bot,
  Flag,
  Tag,
  BellRing,
  Sparkles,
  Brain,
} from "lucide-react";
import {
  getConversation,
  sendMessage,
  updateConversationStatus,
  deleteConversation,
  assignConversationToMe,
  unassignConversation,
  getConversationNotes,
  addConversationNote,
  getQuickReplies,
  createQuickReply,
  deleteQuickReply,
  updateConversationPriority,
  updateConversationFollowUp,
  getConversationTags,
  addConversationTag,
  deleteConversationTag,
  aiAnalyzeConversation,
  aiSuggestReply,
  aiCustomerProfile,
} from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { User as AppUser } from "@/types";

interface Message {
  id: number;
  sender: string;
  direction?: string;
  source?: string;
  content: string;
  message_type: string;
  created_at: string;
}

interface Note {
  id: number;
  conversation_id: number;
  content: string;
  created_at: string;
  author: { id: number; name: string; email: string; role: string; is_active: boolean; created_at: string };
}

interface QuickReply {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

interface ConversationTag {
  id: number;
  conversation_id: number;
  label: string;
  color: string;
  created_at: string;
}

interface ConversationDetail {
  id: number;
  status: string;
  priority?: string;
  follow_up_at?: string | null;
  source?: string;
  created_at: string;
  updated_at: string;
  contact: { id: number; name: string; phone: string; email?: string | null; created_at: string };
  assigned_user?: AppUser | null;
  tags?: ConversationTag[];
  messages: Message[];
}

const statusColors: Record<string, string> = {
  new: "bg-blue-500",
  open: "bg-green-500",
  pending: "bg-yellow-500",
  closed: "bg-gray-400",
};

function getMessageStyle(sender: string) {
  if (sender === "agent") {
    return { align: "justify-start", bg: "bg-blue-600 text-white rounded-br-md", timeColor: "text-blue-200", label: "You" };
  }
  if (sender === "auto_reply") {
    return { align: "justify-start", bg: "bg-yellow-400 text-gray-900 rounded-br-md", timeColor: "text-yellow-700", label: "Auto Reply" };
  }
  return { align: "justify-end", bg: "bg-gray-50 text-gray-800 border border-gray-200 rounded-bl-md", timeColor: "text-gray-400", label: "Customer" };
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const currentUser = getUser();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [tags, setTags] = useState<ConversationTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState("");

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showQuickReplyForm, setShowQuickReplyForm] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState({ title: "", content: "" });
  const [savingQuickReply, setSavingQuickReply] = useState(false);
  const [newTag, setNewTag] = useState({ label: "", color: "blue" });
  const [savingTag, setSavingTag] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [savingPriority, setSavingPriority] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiReply, setAiReply] = useState("");
  const [aiProfile, setAiProfile] = useState<any>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiProfiling, setAiProfiling] = useState(false);

  const fetchConversation = useCallback(async (silent = false) => {
    try {
      if (!initialLoaded && !silent) setLoading(true);
      else setRefreshing(true);

      const [conversationData, notesData, quickRepliesData, tagsData] = await Promise.all([
        getConversation(id), getConversationNotes(id), getQuickReplies(), getConversationTags(id),
      ]);

      setConversation(conversationData);
      setNotes(notesData);
      setQuickReplies(quickRepliesData);
      setTags(tagsData);
      setPriority(conversationData.priority || "normal");
      setFollowUpAt(toInputDateTime(conversationData.follow_up_at));
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message === "UNAUTHORIZED") { logout(); return; }
      setError("Failed to load conversation");
    } finally {
      setLoading(false); setRefreshing(false); setInitialLoaded(true);
    }
  }, [id, initialLoaded]);

  useEffect(() => { if (id) fetchConversation(); }, [id, fetchConversation]);
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => { if (document.visibilityState === "visible") fetchConversation(true); }, 4000);
    return () => clearInterval(interval);
  }, [id, fetchConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      setSending(true);
      await sendMessage(id, { sender: "agent", content: newMessage, message_type: "text" });
      setNewMessage("");
      fetchConversation(true);
    } catch (err) { console.error(err); alert("Failed to send"); } finally { setSending(false); }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try { setSavingNote(true); await addConversationNote(id, { content: newNote }); setNewNote(""); fetchConversation(true); }
    catch (err) { alert("Failed"); } finally { setSavingNote(false); }
  };

  const handleCreateQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickReply.title.trim() || !newQuickReply.content.trim()) return;
    try { setSavingQuickReply(true); await createQuickReply(newQuickReply); setNewQuickReply({ title: "", content: "" }); setShowQuickReplyForm(false); fetchConversation(true); }
    catch (err) { alert("Failed"); } finally { setSavingQuickReply(false); }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.label.trim()) return;
    try { setSavingTag(true); await addConversationTag(id, newTag); setNewTag({ label: "", color: "blue" }); fetchConversation(true); }
    catch (err) { alert("Failed"); } finally { setSavingTag(false); }
  };

  const handlePrioritySave = async () => {
    try { setSavingPriority(true); await updateConversationPriority(id, priority); fetchConversation(true); }
    catch (err) { alert("Failed"); } finally { setSavingPriority(false); }
  };

  const handleFollowUpSave = async () => {
    try { setSavingFollowUp(true); await updateConversationFollowUp(id, followUpAt || null); fetchConversation(true); }
    catch (err) { alert("Failed"); } finally { setSavingFollowUp(false); }
  };

  // AI Handlers
  const handleAiAnalyze = async () => {
    try { setAiAnalyzing(true); const data = await aiAnalyzeConversation(id); setAiAnalysis(data?.analysis || null); }
    catch (err) { alert("AI Error - Make sure Ollama is running"); } finally { setAiAnalyzing(false); }
  };

  const handleAiSuggest = async () => {
    try { setAiSuggesting(true); const data = await aiSuggestReply(id); if (data?.suggested_reply) { setAiReply(data.suggested_reply); setNewMessage(data.suggested_reply); } }
    catch (err) { alert("AI Error"); } finally { setAiSuggesting(false); }
  };

  const handleAiProfile = async () => {
    if (!conversation?.contact?.id) return;
    try { setAiProfiling(true); const data = await aiCustomerProfile(conversation.contact.id); setAiProfile(data?.profile || null); }
    catch (err) { alert("AI Error"); } finally { setAiProfiling(false); }
  };

  if (loading && !initialLoaded) return <div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Loading...</p></div>;
  if ((error && !conversation) || !conversation) return <div className="flex min-h-screen items-center justify-center"><p className="text-red-500">{error || "Not found"}</p></div>;

  const isAssignedToMe = conversation.assigned_user?.id === currentUser?.id;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"><ArrowRight size={18} /></button>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold">{conversation.contact.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{conversation.contact.name}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400"><Phone size={10} /><span>{conversation.contact.phone}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchConversation(true)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <select value={conversation.status} onChange={(e) => { updateConversationStatus(id, e.target.value as any); fetchConversation(true); }}
              className={`text-white text-xs px-3 py-1.5 rounded-full border-0 cursor-pointer ${statusColors[conversation.status] || "bg-gray-400"}`}>
              <option value="new">New</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option>
            </select>
            {!isAssignedToMe ? (
              <button onClick={() => { assignConversationToMe(id); fetchConversation(true); }} className="p-2 text-purple-500 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition" title="Assign to me"><UserPlus size={16} /></button>
            ) : (
              <button onClick={() => { unassignConversation(id); fetchConversation(true); }} className="p-2 text-purple-500 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition" title="Unassign"><UserX size={16} /></button>
            )}
            <button onClick={() => { if (confirm("Delete?")) { deleteConversation(id); router.push("/"); } }} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"><Trash2 size={16} /></button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-6 text-xs text-gray-400">
          <div className="flex items-center gap-1"><User size={12} /><span>{conversation.contact.name}</span></div>
          <div className="flex items-center gap-1"><Phone size={12} /><span>{conversation.contact.phone}</span></div>
          <div className="flex items-center gap-1"><BadgeInfo size={12} /><span>C-{String(conversation.contact.id).padStart(6, "0")}</span></div>
          <div className="flex items-center gap-1"><Clock size={12} /><span>{new Date(conversation.created_at).toLocaleDateString("ar-MA")}</span></div>
          <div className="flex items-center gap-1"><MessageCircle size={12} /><span>{conversation.messages.length} messages</span></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Tools */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium text-purple-700">
                <Brain size={16} /><span>AI Assistant</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button onClick={handleAiAnalyze} disabled={aiAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-purple-600 rounded-full border border-purple-200 hover:bg-purple-100 transition disabled:opacity-50">
                  {aiAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} Analyze
                </button>

                <button onClick={handleAiSuggest} disabled={aiSuggesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-100 transition disabled:opacity-50">
                  {aiSuggesting ? <RefreshCw size={12} className="animate-spin" /> : <MessageCircle size={12} />} Suggest Reply
                </button>

                <button onClick={handleAiProfile} disabled={aiProfiling}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-green-600 rounded-full border border-green-200 hover:bg-green-100 transition disabled:opacity-50">
                  {aiProfiling ? <RefreshCw size={12} className="animate-spin" /> : <User size={12} />} Customer Profile
                </button>
              </div>

              {aiAnalysis && (
                <div className="bg-white rounded-xl p-3 mb-2 text-sm space-y-1">
                  <p><span className="text-gray-500">Intent:</span> <span className="font-medium">{aiAnalysis.intent}</span></p>
                  <p><span className="text-gray-500">Sentiment:</span> <span className="font-medium">{aiAnalysis.sentiment}</span></p>
                  <p><span className="text-gray-500">Priority:</span> <span className="font-medium">{aiAnalysis.priority}</span></p>
                  <p><span className="text-gray-500">Tone:</span> <span className="font-medium">{aiAnalysis.recommended_tone}</span></p>
                  <p><span className="text-gray-500">Summary:</span> <span className="font-medium">{aiAnalysis.summary}</span></p>
                </div>
              )}

              {aiProfile && (
                <div className="bg-white rounded-xl p-3 mb-2 text-sm space-y-1">
                  <p><span className="text-gray-500">Profile:</span> <span className="font-medium">{aiProfile.profile}</span></p>
                  <p><span className="text-gray-500">Style:</span> <span className="font-medium">{aiProfile.communication_style}</span></p>
                  <p><span className="text-gray-500">Needs:</span> <span className="font-medium">{aiProfile.needs}</span></p>
                  <p><span className="text-gray-500">Recommendation:</span> <span className="font-medium">{aiProfile.recommendation}</span></p>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-semibold text-gray-800 mb-4">Messages</h2>

              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {conversation.messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400"><MessageCircle size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No messages yet</p></div>
                ) : (
                  conversation.messages.map((msg) => {
                    const style = getMessageStyle(msg.sender);
                    return (
                      <div key={msg.id} className={`flex ${style.align}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${style.bg}`}>
                          {msg.sender === "auto_reply" && <div className="flex items-center gap-1 mb-1"><Bot size={14} /><span className="text-xs font-medium">Auto Reply</span></div>}
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <div className={`text-xs mt-1 ${style.timeColor}`}>
                            <span>{style.label} • {new Date(msg.created_at).toLocaleDateString("ar-MA")} • {new Date(msg.created_at).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Replies + Send */}
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700"><Zap size={16} className="text-yellow-500" /><span>Quick Replies</span></div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {quickReplies.length === 0 ? <p className="text-sm text-gray-400">No quick replies</p> : (
                    quickReplies.map((reply) => (
                      <button key={reply.id} onClick={() => setNewMessage(reply.content)} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-full transition" title={reply.title}>{reply.title}</button>
                    ))
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={sending}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={sending || !newMessage.trim()} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"><Send size={18} /></button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Priority + Follow-up + Tags */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-700"><Flag size={15} className="text-red-500" /><span>Priority</span></div>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
              </select>
              <button onClick={handlePrioritySave} disabled={savingPriority} className="w-full bg-red-500 text-white py-2 rounded-lg text-sm hover:bg-red-600 transition disabled:opacity-50">{savingPriority ? "Saving..." : "Save Priority"}</button>

              <div className="flex items-center gap-2 text-sm text-gray-700 mt-4"><BellRing size={15} className="text-yellow-500" /><span>Follow-up</span></div>
              <input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
              <button onClick={handleFollowUpSave} disabled={savingFollowUp} className="w-full bg-yellow-500 text-white py-2 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50">{savingFollowUp ? "Saving..." : "Save Follow-up"}</button>

              <div className="flex items-center gap-2 text-sm text-gray-700 mt-4"><Tag size={15} className="text-blue-500" /><span>Tags</span></div>
              <form onSubmit={handleAddTag} className="space-y-2">
                <input type="text" value={newTag.label} onChange={(e) => setNewTag({ ...newTag, label: e.target.value })} placeholder="Tag name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white" />
                <select value={newTag.color} onChange={(e) => setNewTag({ ...newTag, color: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white">
                  <option value="blue">Blue</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="red">Red</option><option value="purple">Purple</option>
                </select>
                <button type="submit" disabled={savingTag || !newTag.label.trim()} className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 transition disabled:opacity-50">{savingTag ? "Adding..." : "Add Tag"}</button>
              </form>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <button key={tag.id} onClick={() => { deleteConversationTag(tag.id); fetchConversation(true); }}
                      className={`text-xs px-2 py-1 rounded-full ${tag.color === "red" ? "bg-red-100 text-red-600" : tag.color === "green" ? "bg-green-100 text-green-600" : tag.color === "yellow" ? "bg-yellow-100 text-yellow-600" : tag.color === "purple" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                      {tag.label} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700"><StickyNote size={16} className="text-purple-500" /><span>Internal Notes</span></div>
              <form onSubmit={handleAddNote} className="mb-4">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add internal note..." rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button type="submit" disabled={savingNote || !newNote.trim()} className="mt-2 w-full bg-purple-600 text-white py-2 rounded-xl text-sm hover:bg-purple-700 transition disabled:opacity-50">{savingNote ? "Saving..." : "Save Note"}</button>
              </form>
              <div className="space-y-3 max-h-[30vh] overflow-y-auto">
                {notes.length === 0 ? <p className="text-sm text-gray-400">No notes yet</p> : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-sm text-gray-700">{note.content}</p>
                      <div className="text-xs text-gray-400 mt-2"><span>{note.author?.name || "User"}</span>{" • "}<span>{new Date(note.created_at).toLocaleDateString("ar-MA")}</span></div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Reply Manager */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Zap size={16} className="text-yellow-500" /><span>Manage Replies</span></div>
                <button onClick={() => setShowQuickReplyForm(!showQuickReplyForm)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition">{showQuickReplyForm ? <X size={16} /> : <Plus size={16} />}</button>
              </div>
              {showQuickReplyForm && (
                <form onSubmit={handleCreateQuickReply} className="mb-4 space-y-3">
                  <input type="text" value={newQuickReply.title} onChange={(e) => setNewQuickReply({ ...newQuickReply, title: e.target.value })} placeholder="Title" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <textarea value={newQuickReply.content} onChange={(e) => setNewQuickReply({ ...newQuickReply, content: e.target.value })} placeholder="Reply text" rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400" />
                  <button type="submit" disabled={savingQuickReply || !newQuickReply.title.trim() || !newQuickReply.content.trim()} className="w-full bg-yellow-500 text-white py-2 rounded-xl text-sm hover:bg-yellow-600 transition disabled:opacity-50">{savingQuickReply ? "Saving..." : "Add Reply"}</button>
                </form>
              )}
              <div className="space-y-3 max-h-[25vh] overflow-y-auto">
                {quickReplies.length === 0 ? <p className="text-sm text-gray-400">No quick replies</p> : (
                  quickReplies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-start justify-between gap-2">
                        <div><p className="text-sm font-medium text-gray-700">{reply.title}</p><p className="text-xs text-gray-500 mt-1">{reply.content}</p></div>
                        <button onClick={() => { deleteQuickReply(reply.id); fetchConversation(true); }} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}