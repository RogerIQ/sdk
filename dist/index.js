// src/error.ts
var RogerIQError = class extends Error {
  code;
  status;
  requestId;
  issues;
  retryAfter;
  constructor(message, opts) {
    super(message);
    this.name = "RogerIQError";
    this.code = opts.code ?? `HTTP_${opts.status}`;
    this.status = opts.status;
    this.requestId = opts.requestId;
    this.issues = opts.issues;
    this.retryAfter = opts.retryAfter;
  }
};

// src/http.ts
var HttpClient = class {
  apiKey;
  apiBase;
  fetchFn;
  userAgent;
  onResponse;
  constructor(opts) {
    this.apiKey = opts.apiKey;
    this.apiBase = opts.apiBase.replace(/\/$/, "");
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? "rogeriq-sdk/0.1.0";
    this.onResponse = opts.onResponse;
  }
  async request(method, path, body, opts = {}) {
    const url = this.buildUrl(path, opts.query);
    const headers = {
      "X-API-Key": this.apiKey,
      "User-Agent": this.userAgent,
      Accept: "application/json",
      ...opts.headers
    };
    if (body !== void 0) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await this.fetchFn(url, {
        method,
        headers,
        body: body === void 0 ? void 0 : JSON.stringify(body),
        signal: opts.signal
      });
    } catch (e) {
      throw new RogerIQError(
        `Network error contacting ${url}: ${e instanceof Error ? e.message : String(e)}`,
        { code: "NETWORK_ERROR", status: 0 }
      );
    }
    const meta = this.metaFromResponse(res);
    const text = await res.text();
    const parsed = text ? safeJsonParse(text) : void 0;
    if (!res.ok) {
      const err = parsed ?? {};
      if (res.status === 429 && typeof err.retry_after === "number" && err.retry_after >= 0 && err.retry_after <= 30) {
        await sleep(err.retry_after * 1e3);
        return this.request(method, path, body, opts);
      }
      throw new RogerIQError(err.error ?? `Request failed: ${res.status} ${res.statusText}`, {
        code: err.code,
        status: res.status,
        requestId: meta.requestId,
        issues: err.issues,
        retryAfter: err.retry_after
      });
    }
    this.onResponse?.(meta);
    const data = unwrap(parsed);
    return { data, meta, raw: parsed };
  }
  get(path, opts) {
    return this.request("GET", path, void 0, opts);
  }
  post(path, body, opts) {
    return this.request("POST", path, body, opts);
  }
  patch(path, body, opts) {
    return this.request("PATCH", path, body, opts);
  }
  put(path, body, opts) {
    return this.request("PUT", path, body, opts);
  }
  delete(path, opts) {
    return this.request("DELETE", path, void 0, opts);
  }
  buildUrl(path, query) {
    const url = new URL(path.startsWith("http") ? path : this.apiBase + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === void 0 || v === null) continue;
        if (typeof v === "object") url.searchParams.set(k, JSON.stringify(v));
        else url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
  metaFromResponse(res) {
    const limit = res.headers.get("X-RateLimit-Limit");
    let rateLimit;
    if (limit) {
      rateLimit = {
        limit: Number(limit),
        remaining: Number(res.headers.get("X-RateLimit-Remaining") ?? 0),
        resetAt: Number(res.headers.get("X-RateLimit-Reset") ?? 0)
      };
    }
    return {
      status: res.status,
      requestId: res.headers.get("X-Request-Id") ?? void 0,
      rateLimit
    };
  }
};
function unwrap(parsed) {
  if (parsed && typeof parsed === "object" && "data" in parsed) {
    return parsed.data;
  }
  return parsed;
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/resources/conversations.ts
var ConversationsResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list(params = {}) {
    const { raw } = await this.http.get(
      `/api/v1/projects/${this.projectId}/conversations`,
      { query: params }
    );
    return raw;
  }
  /** Walks every page; yields conversations one at a time. */
  async *listAll(params = {}) {
    let cursor = params.cursor;
    while (true) {
      const page = await this.list({ ...params, cursor });
      for (const item of page.data) yield item;
      if (!page.has_more || !page.cursor) break;
      cursor = page.cursor;
    }
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/conversations/${id}`
    );
    return data;
  }
  async create(body = {}) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/conversations`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/conversations/${id}`,
      body
    );
    return data;
  }
  // Convenience helpers around update()
  resolve(id) {
    return this.update(id, { status: "resolved" });
  }
  snooze(id) {
    return this.update(id, { status: "snoozed" });
  }
  assign(id, userId) {
    return this.update(id, { assigned_to: userId });
  }
  // Messages nested under a conversation
  messages = {
    list: async (conversationId, params = {}) => {
      const { raw } = await this.http.get(
        `/api/v1/projects/${this.projectId}/conversations/${conversationId}/messages`,
        { query: params }
      );
      return raw;
    },
    send: async (conversationId, body) => {
      const { data } = await this.http.post(
        `/api/v1/projects/${this.projectId}/conversations/${conversationId}/messages`,
        body
      );
      return data;
    }
  };
  reply(conversationId, content, opts = {}) {
    return this.messages.send(conversationId, {
      content,
      is_internal: opts.isInternal === true
    });
  }
};

// src/resources/contacts.ts
var ContactsResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list(params = {}) {
    const { raw } = await this.http.get(
      `/api/v1/projects/${this.projectId}/contacts`,
      { query: params }
    );
    return raw;
  }
  async *listAll(params = {}) {
    let cursor = params.cursor;
    while (true) {
      const page = await this.list({ ...params, cursor });
      for (const item of page.data) yield item;
      if (!page.has_more || !page.cursor) break;
      cursor = page.cursor;
    }
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/contacts/${id}`
    );
    return data;
  }
  async upsert(body) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/contacts`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/contacts/${id}`,
      body
    );
    return data;
  }
};

// src/resources/kb.ts
var KbResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list(params = {}) {
    const { raw } = await this.http.get(
      `/api/v1/projects/${this.projectId}/kb/articles`,
      { query: params }
    );
    return raw;
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/kb/articles/${id}`
    );
    return data;
  }
  async create(body) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/kb/articles`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/kb/articles/${id}`,
      body
    );
    return data;
  }
  async delete(id) {
    await this.http.delete(`/api/v1/projects/${this.projectId}/kb/articles/${id}`);
  }
  async publish(id) {
    await this.http.post(`/api/v1/projects/${this.projectId}/kb/articles/${id}/publish`);
  }
  async search(query) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/kb/search`,
      { query: { q: query } }
    );
    return data;
  }
};

// src/resources/agent.ts
var AgentResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async status() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/agent/status`
    );
    return data;
  }
  async getConfig() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/agent/config`
    );
    return data;
  }
  async updateConfig(body) {
    await this.http.patch(
      `/api/v1/projects/${this.projectId}/agent/config`,
      body
    );
  }
  async respond(conversationId, modeOverride) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/agent/respond`,
      { conversation_id: conversationId, mode_override: modeOverride }
    );
    return data;
  }
  async classify(conversationId) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/agent/classify`,
      { conversation_id: conversationId }
    );
    return data;
  }
  async suggest(conversationId) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/agent/suggest`,
      { conversation_id: conversationId }
    );
    return data;
  }
};

// src/resources/widget.ts
var WidgetResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async getConfig() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/widget/config`
    );
    return data;
  }
  async updateConfig(body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/widget/config`,
      body
    );
    return data;
  }
};

// src/resources/integrations.ts
var IntegrationsResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/integrations`
    );
    return data;
  }
  async browseCatalog(params = {}) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/integrations/catalog`,
      { query: params }
    );
    return data;
  }
  async getCatalogItem(provider) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/integrations/catalog/${provider}`
    );
    return data;
  }
  async getInstallUrl(provider) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/integrations/${provider}/install-url`
    );
    return data;
  }
  async updateLifecycle(provider, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/integrations/${provider}/lifecycle`,
      body
    );
    return data;
  }
  async disconnect(provider) {
    await this.http.delete(`/api/v1/projects/${this.projectId}/integrations/${provider}`);
  }
};

// src/resources/webhooks.ts
var WebhooksResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/webhooks`
    );
    return data;
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/webhooks/${id}`
    );
    return data;
  }
  /** Returns the webhook with its `secret` populated. Store it — you cannot read it back later. */
  async create(body) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/webhooks`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/webhooks/${id}`,
      body
    );
    return data;
  }
  async delete(id) {
    await this.http.delete(`/api/v1/projects/${this.projectId}/webhooks/${id}`);
  }
  async test(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/test`
    );
    return data;
  }
  async deliveries(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/deliveries`
    );
    return data;
  }
  async rotateSecret(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/webhooks/${id}/rotate-secret`
    );
    return data;
  }
};

// src/resources/projects.ts
var ProjectsResource = class {
  constructor(http, orgId) {
    this.http = http;
    this.orgId = orgId;
  }
  http;
  orgId;
  async list() {
    const { data } = await this.http.get(`/api/v1/orgs/${this.orgId}/projects`);
    return data;
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/orgs/${this.orgId}/projects/${id}`
    );
    return data;
  }
  async create(body) {
    const { data } = await this.http.post(
      `/api/v1/orgs/${this.orgId}/projects`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/orgs/${this.orgId}/projects/${id}`,
      body
    );
    return data;
  }
  async delete(id) {
    await this.http.delete(`/api/v1/orgs/${this.orgId}/projects/${id}`);
  }
};

// src/resources/forms.ts
var FormsResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/forms`
    );
    return data;
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/forms/${id}`
    );
    return data;
  }
  async create(body) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/forms`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/forms/${id}`,
      body
    );
    return data;
  }
  async archive(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/forms/${id}/archive`
    );
    return data;
  }
  async unarchive(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/forms/${id}/unarchive`
    );
    return data;
  }
  async submissions(id, params = {}) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/forms/${id}/submissions`,
      { query: params }
    );
    return data;
  }
};

// src/resources/beacons.ts
var BeaconsResource = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  http;
  projectId;
  async list() {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/beacons`
    );
    return data;
  }
  async get(id) {
    const { data } = await this.http.get(
      `/api/v1/projects/${this.projectId}/beacons/${id}`
    );
    return data;
  }
  async create(body) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/beacons`,
      body
    );
    return data;
  }
  async update(id, body) {
    const { data } = await this.http.patch(
      `/api/v1/projects/${this.projectId}/beacons/${id}`,
      body
    );
    return data;
  }
  async archive(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/beacons/${id}/archive`
    );
    return data;
  }
  async unarchive(id) {
    const { data } = await this.http.post(
      `/api/v1/projects/${this.projectId}/beacons/${id}/unarchive`
    );
    return data;
  }
};

// src/webhooks-verify.ts
async function verifyWebhookSignature(payload, signature, secret) {
  if (!signature) return false;
  const received = signature.replace(/^sha256=/, "");
  const expected = await signPayload(payload, secret);
  return timingSafeEqualHex(expected, received);
}
async function signWebhookPayload(payload, secret) {
  return `sha256=${await signPayload(payload, secret)}`;
}
async function signPayload(payload, secret) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Web Crypto API not available. Use Node >= 18, Workers, Deno, or a modern browser."
    );
  }
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToHex(new Uint8Array(sig));
}
function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// src/index.ts
var DEFAULT_API_BASE = "https://api.rogeriq.com";
var RogerIQ = class {
  http;
  defaultProjectId;
  defaultOrgId;
  constructor(opts) {
    this.http = new HttpClient({
      apiKey: opts.apiKey,
      apiBase: opts.apiBase ?? DEFAULT_API_BASE,
      fetch: opts.fetch,
      userAgent: opts.userAgent,
      onResponse: opts.onResponse
    });
    this.defaultProjectId = opts.projectId;
    this.defaultOrgId = opts.orgId;
  }
  /** Returns a resource client bound to a specific project. */
  project(projectId) {
    return {
      conversations: new ConversationsResource(this.http, projectId),
      contacts: new ContactsResource(this.http, projectId),
      kb: new KbResource(this.http, projectId),
      agent: new AgentResource(this.http, projectId),
      widget: new WidgetResource(this.http, projectId),
      integrations: new IntegrationsResource(this.http, projectId),
      webhooks: new WebhooksResource(this.http, projectId),
      forms: new FormsResource(this.http, projectId),
      beacons: new BeaconsResource(this.http, projectId)
    };
  }
  /** Org-scoped resources. */
  org(orgId) {
    return {
      projects: new ProjectsResource(this.http, orgId)
    };
  }
  // Convenience accessors using the default project / org if set in constructor.
  get conversations() {
    return new ConversationsResource(this.http, this.requireProjectId());
  }
  get contacts() {
    return new ContactsResource(this.http, this.requireProjectId());
  }
  get kb() {
    return new KbResource(this.http, this.requireProjectId());
  }
  get agent() {
    return new AgentResource(this.http, this.requireProjectId());
  }
  get widget() {
    return new WidgetResource(this.http, this.requireProjectId());
  }
  get integrations() {
    return new IntegrationsResource(this.http, this.requireProjectId());
  }
  get webhooks() {
    return new WebhooksResource(this.http, this.requireProjectId());
  }
  get forms() {
    return new FormsResource(this.http, this.requireProjectId());
  }
  get beacons() {
    return new BeaconsResource(this.http, this.requireProjectId());
  }
  get projects() {
    return new ProjectsResource(this.http, this.requireOrgId());
  }
  requireProjectId() {
    if (!this.defaultProjectId) {
      throw new Error(
        "No default projectId. Pass `projectId` to the RogerIQ constructor, or use `roger.project('prj_xxx').conversations.list(...)`."
      );
    }
    return this.defaultProjectId;
  }
  requireOrgId() {
    if (!this.defaultOrgId) {
      throw new Error(
        "No default orgId. Pass `orgId` to the RogerIQ constructor, or use `roger.org('org_xxx').projects.list()`."
      );
    }
    return this.defaultOrgId;
  }
};
export {
  RogerIQ,
  RogerIQError,
  signWebhookPayload,
  verifyWebhookSignature
};
