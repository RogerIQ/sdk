import type { HttpClient } from "../http.js";

export interface WidgetConfig {
  project_id: string;
  enabled: boolean;
  position: "bottom-right" | "bottom-left";
  color: string;
  welcome_message: string;
  show_branding: boolean;
  theme: "light" | "dark" | "auto";
  locale: string;
  [extra: string]: unknown;
}

export type UpdateWidgetConfigBody = Partial<Omit<WidgetConfig, "project_id">>;

export class WidgetResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async getConfig(): Promise<WidgetConfig> {
    const { data } = await this.http.get<WidgetConfig>(
      `/api/v1/projects/${this.projectId}/widget/config`,
    );
    return data;
  }

  async updateConfig(body: UpdateWidgetConfigBody): Promise<WidgetConfig> {
    const { data } = await this.http.patch<WidgetConfig>(
      `/api/v1/projects/${this.projectId}/widget/config`,
      body,
    );
    return data;
  }
}
