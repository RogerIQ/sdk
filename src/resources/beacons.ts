import type { HttpClient } from "../http.js";

export interface BeaconRecord {
  id: string;
  project_id: string;
  form_id: string;
  docs_site_id: string | null;
  position: "bottom-right" | "bottom-left";
  primary_color: string;
  button_label: string;
  button_icon: "chat" | "mail" | "help" | "custom_svg";
  custom_svg: string | null;
  greeting_title: string;
  greeting_text: string;
  allowed_origins: string[];
  ai_agent_enabled: boolean;
  messages_enabled: boolean;
  chat_enabled: boolean;
  settings: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
}

export type CreateBeaconBody = Partial<BeaconRecord> & { form_id: string };
export type UpdateBeaconBody = Partial<BeaconRecord>;

export class BeaconsResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(): Promise<BeaconRecord[]> {
    const { data } = await this.http.get<BeaconRecord[]>(
      `/api/v1/projects/${this.projectId}/beacons`,
    );
    return data;
  }

  async get(id: string): Promise<BeaconRecord> {
    const { data } = await this.http.get<BeaconRecord>(
      `/api/v1/projects/${this.projectId}/beacons/${id}`,
    );
    return data;
  }

  async create(body: CreateBeaconBody): Promise<BeaconRecord> {
    const { data } = await this.http.post<BeaconRecord>(
      `/api/v1/projects/${this.projectId}/beacons`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateBeaconBody): Promise<BeaconRecord> {
    const { data } = await this.http.patch<BeaconRecord>(
      `/api/v1/projects/${this.projectId}/beacons/${id}`,
      body,
    );
    return data;
  }

  async archive(id: string): Promise<{ id: string; archived: boolean }> {
    const { data } = await this.http.post<{ id: string; archived: boolean }>(
      `/api/v1/projects/${this.projectId}/beacons/${id}/archive`,
    );
    return data;
  }

  async unarchive(id: string): Promise<{ id: string; archived: boolean }> {
    const { data } = await this.http.post<{ id: string; archived: boolean }>(
      `/api/v1/projects/${this.projectId}/beacons/${id}/unarchive`,
    );
    return data;
  }
}
