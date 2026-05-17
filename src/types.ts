// Shared type surface. Kept loose where the API allows extension.

export type Channel = "email" | "chat" | "slack" | "discord" | "telegram" | "api" | "widget";
export type ConversationStatus = "open" | "snoozed" | "resolved" | "closed";
export type Priority = "low" | "normal" | "high" | "urgent";
export type AgentMode = "autopilot" | "copilot" | "assist";
export type ArticleStatus = "draft" | "published" | "archived";
export type Scope = "read" | "write" | "admin" | string;
export type IntegrationStatus = "active" | "paused" | "disconnected" | "error";

export interface Conversation {
  id: string;
  project_id: string;
  contact_id: string | null;
  subject: string | null;
  status: ConversationStatus;
  priority: Priority;
  channel: Channel;
  assigned_to: string | null;
  tags: string[];
  ai_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent" | "ai" | "system";
  sender_id: string | null;
  content: string;
  content_type: "text" | "html" | "markdown";
  is_internal: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  project_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  external_id: string | null;
  company: string | null;
  job_title: string | null;
  metadata: Record<string, unknown>;
  last_seen_at: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  domain: string | null;
  agent_mode: AgentMode;
  ai_model: string | null;
  created_at: string;
}

export interface KbArticle {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  status: ArticleStatus;
  is_public: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string; // only on create
  status: "active" | "disabled";
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface AgentStatus {
  enabled: boolean;
  mode: AgentMode;
  model: string;
  domain: string | null;
  has_byom_key: boolean;
  usage_this_month: {
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  };
}

export interface Integration {
  id: string;
  provider: string;
  status: IntegrationStatus;
  display_name: string | null;
  setup_type: string;
  health_status: string;
  sidebar_enabled: boolean;
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  [extra: string]: unknown;
}

export interface PaginatedResult<T> {
  data: T[];
  cursor: string | null;
  has_more: boolean;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  request_id?: string;
  issues?: Array<{ path: string; message: string }>;
  retry_after?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RequestMeta {
  status: number;
  requestId?: string;
  rateLimit?: RateLimitInfo;
}

export type RequestInitLike = Omit<RequestInit, "body" | "method">;
