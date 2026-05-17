import { RogerIQError } from "./error.js";
import type { ApiErrorBody, RateLimitInfo, RequestMeta } from "./types.js";

/**
 * Low-level HTTP wrapper used by every resource client.
 *
 * - Adds X-API-Key + User-Agent.
 * - Surfaces request_id, rate-limit headers, and structured errors.
 * - Auto-retries once on 429 when the server-suggested delay is short.
 */

export interface HttpClientOptions {
  apiKey: string;
  apiBase: string;
  fetch?: typeof fetch;
  userAgent?: string;
  /**
   * Called for every successful response. Useful for logging request IDs or
   * watching rate-limit headroom in agent loops.
   */
  onResponse?: (meta: RequestMeta) => void;
}

export interface RequestOptions {
  query?: Record<string, unknown>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export class HttpClient {
  private apiKey: string;
  private apiBase: string;
  private fetchFn: typeof fetch;
  private userAgent: string;
  private onResponse?: (meta: RequestMeta) => void;

  constructor(opts: HttpClientOptions) {
    this.apiKey = opts.apiKey;
    this.apiBase = opts.apiBase.replace(/\/$/, "");
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? "rogeriq-sdk/0.1.0";
    this.onResponse = opts.onResponse;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: RequestOptions = {},
  ): Promise<{ data: T; meta: RequestMeta; raw: unknown }> {
    const url = this.buildUrl(path, opts.query);
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "User-Agent": this.userAgent,
      Accept: "application/json",
      ...opts.headers,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: opts.signal,
      });
    } catch (e) {
      throw new RogerIQError(
        `Network error contacting ${url}: ${e instanceof Error ? e.message : String(e)}`,
        { code: "NETWORK_ERROR", status: 0 },
      );
    }

    const meta = this.metaFromResponse(res);
    const text = await res.text();
    const parsed: unknown = text ? safeJsonParse(text) : undefined;

    if (!res.ok) {
      const err = (parsed ?? {}) as ApiErrorBody;
      // Auto-retry 429 once when the server gives a short backoff.
      if (
        res.status === 429 &&
        typeof err.retry_after === "number" &&
        err.retry_after >= 0 &&
        err.retry_after <= 30
      ) {
        await sleep(err.retry_after * 1000);
        return this.request<T>(method, path, body, opts);
      }
      throw new RogerIQError(err.error ?? `Request failed: ${res.status} ${res.statusText}`, {
        code: err.code,
        status: res.status,
        requestId: meta.requestId,
        issues: err.issues,
        retryAfter: err.retry_after,
      });
    }

    this.onResponse?.(meta);
    const data = unwrap<T>(parsed);
    return { data, meta, raw: parsed };
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("GET", path, undefined, opts);
  }
  post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("POST", path, body, opts);
  }
  patch<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("PATCH", path, body, opts);
  }
  put<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return this.request<T>("PUT", path, body, opts);
  }
  delete<T>(path: string, opts?: RequestOptions) {
    return this.request<T>("DELETE", path, undefined, opts);
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(path.startsWith("http") ? path : this.apiBase + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (typeof v === "object") url.searchParams.set(k, JSON.stringify(v));
        else url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private metaFromResponse(res: Response): RequestMeta {
    const limit = res.headers.get("X-RateLimit-Limit");
    let rateLimit: RateLimitInfo | undefined;
    if (limit) {
      rateLimit = {
        limit: Number(limit),
        remaining: Number(res.headers.get("X-RateLimit-Remaining") ?? 0),
        resetAt: Number(res.headers.get("X-RateLimit-Reset") ?? 0),
      };
    }
    return {
      status: res.status,
      requestId: res.headers.get("X-Request-Id") ?? undefined,
      rateLimit,
    };
  }
}

function unwrap<T>(parsed: unknown): T {
  if (parsed && typeof parsed === "object" && "data" in (parsed as Record<string, unknown>)) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

function safeJsonParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
