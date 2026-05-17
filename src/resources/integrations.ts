import type { HttpClient } from "../http.js";
import type { Integration, IntegrationStatus } from "../types.js";

export interface BrowseCatalogParams {
  q?: string;
  category?: string;
  status?: string;
}

export interface UpdateLifecycleBody {
  status?: IntegrationStatus;
  display_name?: string;
  sidebar_enabled?: boolean;
  settings?: Record<string, unknown>;
  action_permissions?: Record<string, unknown>;
}

export interface InstallUrlResponse {
  provider: string;
  install_url: string;
  setup_type: string;
  message: string;
}

export class IntegrationsResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(): Promise<Integration[]> {
    const { data } = await this.http.get<Integration[]>(
      `/api/v1/projects/${this.projectId}/integrations`,
    );
    return data;
  }

  async browseCatalog(params: BrowseCatalogParams = {}): Promise<unknown> {
    const { data } = await this.http.get<unknown>(
      `/api/v1/projects/${this.projectId}/integrations/catalog`,
      { query: params as Record<string, unknown> },
    );
    return data;
  }

  async getCatalogItem(provider: string): Promise<Record<string, unknown>> {
    const { data } = await this.http.get<Record<string, unknown>>(
      `/api/v1/projects/${this.projectId}/integrations/catalog/${provider}`,
    );
    return data;
  }

  async getInstallUrl(provider: string): Promise<InstallUrlResponse> {
    const { data } = await this.http.post<InstallUrlResponse>(
      `/api/v1/projects/${this.projectId}/integrations/${provider}/install-url`,
    );
    return data;
  }

  async updateLifecycle(provider: string, body: UpdateLifecycleBody): Promise<Integration | null> {
    const { data } = await this.http.patch<Integration | null>(
      `/api/v1/projects/${this.projectId}/integrations/${provider}/lifecycle`,
      body,
    );
    return data;
  }

  async disconnect(provider: string): Promise<void> {
    await this.http.delete(`/api/v1/projects/${this.projectId}/integrations/${provider}`);
  }
}
