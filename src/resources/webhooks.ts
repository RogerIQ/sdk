import type { HttpClient } from "../http.js";
import type { Webhook } from "../types.js";

export interface CreateWebhookBody {
  url: string;
  events: string[];
}

export type UpdateWebhookBody = Partial<CreateWebhookBody> & {
  status?: "active" | "disabled";
};

export interface WebhookDelivery {
  id: string;
  event: string;
  status_code: number | null;
  duration_ms: number;
  attempt: number;
  status: string;
  created_at: string;
}

export interface TestWebhookResult {
  delivered: boolean;
  status_code: number | null;
  duration_ms: number;
}

export class WebhooksResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(): Promise<Webhook[]> {
    const { data } = await this.http.get<Webhook[]>(
      `/api/v1/projects/${this.projectId}/webhooks`,
    );
    return data;
  }

  async get(id: string): Promise<Webhook> {
    const { data } = await this.http.get<Webhook>(
      `/api/v1/projects/${this.projectId}/webhooks/${id}`,
    );
    return data;
  }

  /** Returns the webhook with its `secret` populated. Store it — you cannot read it back later. */
  async create(body: CreateWebhookBody): Promise<Webhook & { secret: string }> {
    const { data } = await this.http.post<Webhook & { secret: string }>(
      `/api/v1/projects/${this.projectId}/webhooks`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateWebhookBody): Promise<Webhook> {
    const { data } = await this.http.patch<Webhook>(
      `/api/v1/projects/${this.projectId}/webhooks/${id}`,
      body,
    );
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/v1/projects/${this.projectId}/webhooks/${id}`);
  }

  async test(id: string): Promise<TestWebhookResult> {
    const { data } = await this.http.post<TestWebhookResult>(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/test`,
    );
    return data;
  }

  async deliveries(id: string): Promise<WebhookDelivery[]> {
    const { data } = await this.http.get<WebhookDelivery[]>(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/deliveries`,
    );
    return data;
  }

  async rotateSecret(id: string): Promise<{ secret: string }> {
    const { data } = await this.http.post<{ secret: string }>(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/rotate-secret`,
    );
    return data;
  }
}
