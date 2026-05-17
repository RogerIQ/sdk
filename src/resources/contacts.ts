import type { HttpClient } from "../http.js";
import type { Contact, PaginatedResult } from "../types.js";

export interface ListContactsParams {
  q?: string;
  email?: string;
  external_id?: string;
  cursor?: string;
  limit?: number;
}

export interface UpsertContactBody {
  email?: string;
  name?: string;
  phone?: string;
  external_id?: string;
  company?: string;
  job_title?: string;
  metadata?: Record<string, unknown>;
}

export class ContactsResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(params: ListContactsParams = {}): Promise<PaginatedResult<Contact>> {
    const { raw } = await this.http.get<unknown>(
      `/api/v1/projects/${this.projectId}/contacts`,
      { query: params as Record<string, unknown> },
    );
    return raw as PaginatedResult<Contact>;
  }

  async *listAll(params: ListContactsParams = {}): AsyncIterableIterator<Contact> {
    let cursor = params.cursor;
    while (true) {
      const page = await this.list({ ...params, cursor });
      for (const item of page.data) yield item;
      if (!page.has_more || !page.cursor) break;
      cursor = page.cursor;
    }
  }

  async get(id: string): Promise<Contact> {
    const { data } = await this.http.get<Contact>(
      `/api/v1/projects/${this.projectId}/contacts/${id}`,
    );
    return data;
  }

  async upsert(body: UpsertContactBody): Promise<Contact> {
    const { data } = await this.http.post<Contact>(
      `/api/v1/projects/${this.projectId}/contacts`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpsertContactBody): Promise<Contact> {
    const { data } = await this.http.patch<Contact>(
      `/api/v1/projects/${this.projectId}/contacts/${id}`,
      body,
    );
    return data;
  }
}
