import type { HttpClient } from "../http.js";
import type { AgentMode, Project } from "../types.js";

export interface CreateProjectBody {
  name: string;
  slug?: string;
  domain?: string;
}

export interface UpdateProjectBody {
  name?: string;
  domain?: string;
  agent_mode?: AgentMode;
  ai_model?: string;
}

export class ProjectsResource {
  constructor(private http: HttpClient, private orgId: string) {}

  async list(): Promise<Project[]> {
    const { data } = await this.http.get<Project[]>(`/api/v1/orgs/${this.orgId}/projects`);
    return data;
  }

  async get(id: string): Promise<Project> {
    const { data } = await this.http.get<Project>(
      `/api/v1/orgs/${this.orgId}/projects/${id}`,
    );
    return data;
  }

  async create(body: CreateProjectBody): Promise<Project> {
    const { data } = await this.http.post<Project>(
      `/api/v1/orgs/${this.orgId}/projects`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateProjectBody): Promise<Project> {
    const { data } = await this.http.patch<Project>(
      `/api/v1/orgs/${this.orgId}/projects/${id}`,
      body,
    );
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/v1/orgs/${this.orgId}/projects/${id}`);
  }
}
