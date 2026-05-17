import type { HttpClient } from "../http.js";
import type {
  Conversation,
  ConversationStatus,
  Priority,
  Channel,
  Message,
  PaginatedResult,
} from "../types.js";

export interface ListConversationsParams {
  status?: ConversationStatus;
  priority?: Priority;
  channel?: Channel;
  assigned_to?: string;
  contact_id?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateConversationBody {
  subject?: string;
  contact_id?: string;
  channel?: Channel;
  priority?: Priority;
  tags?: string[];
}

export interface UpdateConversationBody {
  subject?: string;
  status?: ConversationStatus;
  priority?: Priority;
  assigned_to?: string;
  tags?: string[];
}

export interface SendMessageBody {
  content: string;
  sender_type?: "system" | "agent";
  is_internal?: boolean;
}

export class ConversationsResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(params: ListConversationsParams = {}): Promise<PaginatedResult<Conversation>> {
    const { raw } = await this.http.get<unknown>(
      `/api/v1/projects/${this.projectId}/conversations`,
      { query: params as Record<string, unknown> },
    );
    return raw as PaginatedResult<Conversation>;
  }

  /** Walks every page; yields conversations one at a time. */
  async *listAll(params: ListConversationsParams = {}): AsyncIterableIterator<Conversation> {
    let cursor = params.cursor;
    while (true) {
      const page = await this.list({ ...params, cursor });
      for (const item of page.data) yield item;
      if (!page.has_more || !page.cursor) break;
      cursor = page.cursor;
    }
  }

  async get(id: string): Promise<Conversation> {
    const { data } = await this.http.get<Conversation>(
      `/api/v1/projects/${this.projectId}/conversations/${id}`,
    );
    return data;
  }

  async create(body: CreateConversationBody = {}): Promise<Conversation> {
    const { data } = await this.http.post<Conversation>(
      `/api/v1/projects/${this.projectId}/conversations`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateConversationBody): Promise<Conversation> {
    const { data } = await this.http.patch<Conversation>(
      `/api/v1/projects/${this.projectId}/conversations/${id}`,
      body,
    );
    return data;
  }

  // Convenience helpers around update()
  resolve(id: string) { return this.update(id, { status: "resolved" }); }
  snooze(id: string) { return this.update(id, { status: "snoozed" }); }
  assign(id: string, userId: string) { return this.update(id, { assigned_to: userId }); }

  // Messages nested under a conversation
  messages = {
    list: async (
      conversationId: string,
      params: { cursor?: string; limit?: number } = {},
    ): Promise<PaginatedResult<Message>> => {
      const { raw } = await this.http.get<unknown>(
        `/api/v1/projects/${this.projectId}/conversations/${conversationId}/messages`,
        { query: params },
      );
      return raw as PaginatedResult<Message>;
    },
    send: async (conversationId: string, body: SendMessageBody): Promise<Message> => {
      const { data } = await this.http.post<Message>(
        `/api/v1/projects/${this.projectId}/conversations/${conversationId}/messages`,
        body,
      );
      return data;
    },
  };

  reply(conversationId: string, content: string, opts: { isInternal?: boolean } = {}) {
    return this.messages.send(conversationId, {
      content,
      is_internal: opts.isInternal === true,
    });
  }
}
