import type { HttpClient } from "../http.js";
import type { KbArticle, ArticleStatus, PaginatedResult } from "../types.js";

export interface ListArticlesParams {
  status?: ArticleStatus;
  category?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateArticleBody {
  title: string;
  content: string;
  category?: string;
  status?: ArticleStatus;
  is_public?: boolean;
}

export type UpdateArticleBody = Partial<CreateArticleBody>;

export interface SearchHit {
  id: string;
  title: string;
  content?: string;
  score: number;
  [extra: string]: unknown;
}

export class KbResource {
  constructor(private http: HttpClient, private projectId: string) {}

  async list(params: ListArticlesParams = {}): Promise<PaginatedResult<KbArticle>> {
    const { raw } = await this.http.get<unknown>(
      `/api/v1/projects/${this.projectId}/kb/articles`,
      { query: params as Record<string, unknown> },
    );
    return raw as PaginatedResult<KbArticle>;
  }

  async get(id: string): Promise<KbArticle> {
    const { data } = await this.http.get<KbArticle>(
      `/api/v1/projects/${this.projectId}/kb/articles/${id}`,
    );
    return data;
  }

  async create(body: CreateArticleBody): Promise<KbArticle> {
    const { data } = await this.http.post<KbArticle>(
      `/api/v1/projects/${this.projectId}/kb/articles`,
      body,
    );
    return data;
  }

  async update(id: string, body: UpdateArticleBody): Promise<KbArticle> {
    const { data } = await this.http.patch<KbArticle>(
      `/api/v1/projects/${this.projectId}/kb/articles/${id}`,
      body,
    );
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/v1/projects/${this.projectId}/kb/articles/${id}`);
  }

  async publish(id: string): Promise<void> {
    await this.http.post(`/api/v1/projects/${this.projectId}/kb/articles/${id}/publish`);
  }

  async search(query: string): Promise<SearchHit[]> {
    const { data } = await this.http.get<SearchHit[]>(
      `/api/v1/projects/${this.projectId}/kb/search`,
      { query: { q: query } },
    );
    return data;
  }
}
