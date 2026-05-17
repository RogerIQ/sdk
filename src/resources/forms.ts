import type { HttpClient } from "../http.js";

export interface FormField {
  id?: string;
  type: string;
  label: string;
  name?: string;
  required?: boolean;
  placeholder?: string | null;
  options?: string[];
}

export interface FormRecord {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  fields: FormField[];
  success_action: "inline" | "redirect";
  success_message: string;
  redirect_url: string | null;
  allowed_origins: string[];
  rate_limit_per_ip: number;
  rate_limit_window_seconds: number;
  public_api: boolean;
  submit_button_label: string;
  submit_button_align: "left" | "center" | "right" | "full";
  submit_button_color: string | null;
  show_title: boolean;
  logo_url: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateFormBody = Partial<FormRecord> & { name: string };
export type UpdateFormBody = Partial<FormRecord>;

export interface FormSubmission {
  id: string;
  form_id: string;
  payload: Record<string, unknown>;
  submitted_at: string;
  ip_hash: string | null;
}

export class FormsResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(): Promise<FormRecord[]> {
    const { data } = await this.http.get<FormRecord[]>(
      `/api/v1/projects/${this.projectId}/forms`,
    );
    return data;
  }

  async get(id: string): Promise<FormRecord> {
    const { data } = await this.http.get<FormRecord>(
      `/api/v1/projects/${this.projectId}/forms/${id}`,
    );
    return data;
  }

  async create(body: CreateFormBody): Promise<FormRecord> {
    const { data } = await this.http.post<FormRecord>(
      `/api/v1/projects/${this.projectId}/forms`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateFormBody): Promise<FormRecord> {
    const { data } = await this.http.patch<FormRecord>(
      `/api/v1/projects/${this.projectId}/forms/${id}`,
      body,
    );
    return data;
  }

  async archive(id: string): Promise<{ id: string; archived: boolean }> {
    const { data } = await this.http.post<{ id: string; archived: boolean }>(
      `/api/v1/projects/${this.projectId}/forms/${id}/archive`,
    );
    return data;
  }

  async unarchive(id: string): Promise<{ id: string; archived: boolean }> {
    const { data } = await this.http.post<{ id: string; archived: boolean }>(
      `/api/v1/projects/${this.projectId}/forms/${id}/unarchive`,
    );
    return data;
  }

  async submissions(id: string, params: { limit?: number } = {}): Promise<FormSubmission[]> {
    const { data } = await this.http.get<FormSubmission[]>(
      `/api/v1/projects/${this.projectId}/forms/${id}/submissions`,
      { query: params },
    );
    return data;
  }
}
