import type { HttpClient } from "../http.js";
import type { AgentMode, AgentStatus } from "../types.js";

export interface AgentConfig {
  project_name: string;
  agent_mode: AgentMode;
  ai_model: string | null;
  domain: string | null;
  has_byom_key: boolean;
  settings: Record<string, unknown>;
}

export interface UpdateAgentConfigBody {
  agent_mode?: AgentMode;
  ai_model?: string;
  confidence_threshold?: number;
  settings?: Record<string, unknown>;
}

export interface AgentRespondResult {
  content: string;
  content_html?: string;
  confidence: number;
  mode: AgentMode;
  effective_mode: AgentMode;
  message_created: boolean;
  message_id?: string;
  sources?: unknown[];
  usage?: Record<string, unknown>;
}

export class AgentResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async status(): Promise<AgentStatus> {
    const { data } = await this.http.get<AgentStatus>(
      `/api/v1/projects/${this.projectId}/agent/status`,
    );
    return data;
  }

  async getConfig(): Promise<AgentConfig> {
    const { data } = await this.http.get<AgentConfig>(
      `/api/v1/projects/${this.projectId}/agent/config`,
    );
    return data;
  }

  async updateConfig(body: UpdateAgentConfigBody): Promise<void> {
    await this.http.patch(
      `/api/v1/projects/${this.projectId}/agent/config`,
      body,
    );
  }

  async respond(conversationId: string, modeOverride?: AgentMode): Promise<AgentRespondResult> {
    const { data } = await this.http.post<AgentRespondResult>(
      `/api/v1/projects/${this.projectId}/agent/respond`,
      { conversation_id: conversationId, mode_override: modeOverride },
    );
    return data;
  }

  async classify(conversationId: string): Promise<Record<string, unknown>> {
    const { data } = await this.http.post<Record<string, unknown>>(
      `/api/v1/projects/${this.projectId}/agent/classify`,
      { conversation_id: conversationId },
    );
    return data;
  }

  async suggest(conversationId: string): Promise<{
    suggested_response: string;
    sources?: unknown[];
    confidence: number;
  }> {
    const { data } = await this.http.post<{
      suggested_response: string;
      sources?: unknown[];
      confidence: number;
    }>(
      `/api/v1/projects/${this.projectId}/agent/suggest`,
      { conversation_id: conversationId },
    );
    return data;
  }
}
