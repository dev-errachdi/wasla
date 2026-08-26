export type ConversationStatus = "new" | "open" | "pending" | "closed";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: "customer" | "agent" | "auto_reply";
  direction?: "inbound" | "outbound";
  source?: string;
  external_message_id?: string | null;
  content: string;
  message_type: string;
  created_at: string;
}

export interface ConversationTag {
  id: number;
  conversation_id: number;
  label: string;
  color: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  status: ConversationStatus;
  priority?: string;
  follow_up_at?: string | null;
  created_at: string;
  updated_at: string;
  source?: string;
  contact: Contact;
  assigned_user?: User | null;
  channel?: {
    id: number;
    name: string;
    type: string;
    provider: string;
    phone_number_id?: string | null;
    business_account_id?: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
  tags?: ConversationTag[];
  last_message?: string | null;
  last_message_at?: string | null;
  message_count?: number;
  messages?: Message[];
}