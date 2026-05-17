type Channel = "email" | "chat" | "slack" | "discord" | "telegram" | "api" | "widget";
type ConversationStatus = "open" | "snoozed" | "resolved" | "closed";
type Priority = "low" | "normal" | "high" | "urgent";
type AgentMode = "autopilot" | "copilot" | "assist";
type ArticleStatus = "draft" | "published" | "archived";
type Scope = "read" | "write" | "admin" | string;
type IntegrationStatus = "active" | "paused" | "disconnected" | "error";
interface Conversation {
    id: string;
    project_id: string;
    contact_id: string | null;
    subject: string | null;
    status: ConversationStatus;
    priority: Priority;
    channel: Channel;
    assigned_to: string | null;
    tags: string[];
    ai_resolved: boolean;
    created_at: string;
    updated_at: string;
}
interface Message {
    id: string;
    conversation_id: string;
    sender_type: "customer" | "agent" | "ai" | "system";
    sender_id: string | null;
    content: string;
    content_type: "text" | "html" | "markdown";
    is_internal: boolean;
    created_at: string;
}
interface Contact {
    id: string;
    project_id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    external_id: string | null;
    company: string | null;
    job_title: string | null;
    metadata: Record<string, unknown>;
    last_seen_at: string | null;
    created_at: string;
}
interface Project {
    id: string;
    org_id: string;
    name: string;
    slug: string;
    domain: string | null;
    agent_mode: AgentMode;
    ai_model: string | null;
    created_at: string;
}
interface KbArticle {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    content: string;
    category: string | null;
    status: ArticleStatus;
    is_public: boolean;
    view_count: number;
    helpful_count: number;
    not_helpful_count: number;
    ai_generated: boolean;
    created_at: string;
    updated_at: string;
}
interface Webhook {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    status: "active" | "disabled";
    failure_count: number;
    last_triggered_at: string | null;
    created_at: string;
}
interface AgentStatus {
    enabled: boolean;
    mode: AgentMode;
    model: string;
    domain: string | null;
    has_byom_key: boolean;
    usage_this_month: {
        calls: number;
        input_tokens: number;
        output_tokens: number;
        cost_usd: number;
    };
}
interface Integration {
    id: string;
    provider: string;
    status: IntegrationStatus;
    display_name: string | null;
    setup_type: string;
    health_status: string;
    sidebar_enabled: boolean;
    last_synced_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    [extra: string]: unknown;
}
interface PaginatedResult<T> {
    data: T[];
    cursor: string | null;
    has_more: boolean;
}
interface ApiErrorBody {
    error: string;
    code?: string;
    request_id?: string;
    issues?: Array<{
        path: string;
        message: string;
    }>;
    retry_after?: number;
}
interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetAt: number;
}
interface RequestMeta {
    status: number;
    requestId?: string;
    rateLimit?: RateLimitInfo;
}
type RequestInitLike = Omit<RequestInit, "body" | "method">;

/**
 * Low-level HTTP wrapper used by every resource client.
 *
 * - Adds X-API-Key + User-Agent.
 * - Surfaces request_id, rate-limit headers, and structured errors.
 * - Auto-retries once on 429 when the server-suggested delay is short.
 */
interface HttpClientOptions {
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
interface RequestOptions {
    query?: Record<string, unknown>;
    signal?: AbortSignal;
    headers?: Record<string, string>;
}
declare class HttpClient {
    private apiKey;
    private apiBase;
    private fetchFn;
    private userAgent;
    private onResponse?;
    constructor(opts: HttpClientOptions);
    request<T>(method: string, path: string, body?: unknown, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    get<T>(path: string, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    patch<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    put<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    delete<T>(path: string, opts?: RequestOptions): Promise<{
        data: T;
        meta: RequestMeta;
        raw: unknown;
    }>;
    private buildUrl;
    private metaFromResponse;
}

interface ListConversationsParams {
    status?: ConversationStatus;
    priority?: Priority;
    channel?: Channel;
    assigned_to?: string;
    contact_id?: string;
    q?: string;
    cursor?: string;
    limit?: number;
}
interface CreateConversationBody {
    subject?: string;
    contact_id?: string;
    channel?: Channel;
    priority?: Priority;
    tags?: string[];
}
interface UpdateConversationBody {
    subject?: string;
    status?: ConversationStatus;
    priority?: Priority;
    assigned_to?: string;
    tags?: string[];
}
interface SendMessageBody {
    content: string;
    sender_type?: "system" | "agent";
    is_internal?: boolean;
}
declare class ConversationsResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(params?: ListConversationsParams): Promise<PaginatedResult<Conversation>>;
    /** Walks every page; yields conversations one at a time. */
    listAll(params?: ListConversationsParams): AsyncIterableIterator<Conversation>;
    get(id: string): Promise<Conversation>;
    create(body?: CreateConversationBody): Promise<Conversation>;
    update(id: string, body: UpdateConversationBody): Promise<Conversation>;
    resolve(id: string): Promise<Conversation>;
    snooze(id: string): Promise<Conversation>;
    assign(id: string, userId: string): Promise<Conversation>;
    messages: {
        list: (conversationId: string, params?: {
            cursor?: string;
            limit?: number;
        }) => Promise<PaginatedResult<Message>>;
        send: (conversationId: string, body: SendMessageBody) => Promise<Message>;
    };
    reply(conversationId: string, content: string, opts?: {
        isInternal?: boolean;
    }): Promise<Message>;
}

interface ListContactsParams {
    q?: string;
    email?: string;
    external_id?: string;
    cursor?: string;
    limit?: number;
}
interface UpsertContactBody {
    email?: string;
    name?: string;
    phone?: string;
    external_id?: string;
    company?: string;
    job_title?: string;
    metadata?: Record<string, unknown>;
}
declare class ContactsResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(params?: ListContactsParams): Promise<PaginatedResult<Contact>>;
    listAll(params?: ListContactsParams): AsyncIterableIterator<Contact>;
    get(id: string): Promise<Contact>;
    upsert(body: UpsertContactBody): Promise<Contact>;
    update(id: string, body: UpsertContactBody): Promise<Contact>;
}

interface ListArticlesParams {
    status?: ArticleStatus;
    category?: string;
    q?: string;
    cursor?: string;
    limit?: number;
}
interface CreateArticleBody {
    title: string;
    content: string;
    category?: string;
    status?: ArticleStatus;
    is_public?: boolean;
}
type UpdateArticleBody = Partial<CreateArticleBody>;
interface SearchHit {
    id: string;
    title: string;
    content?: string;
    score: number;
    [extra: string]: unknown;
}
declare class KbResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(params?: ListArticlesParams): Promise<PaginatedResult<KbArticle>>;
    get(id: string): Promise<KbArticle>;
    create(body: CreateArticleBody): Promise<KbArticle>;
    update(id: string, body: UpdateArticleBody): Promise<KbArticle>;
    delete(id: string): Promise<void>;
    publish(id: string): Promise<void>;
    search(query: string): Promise<SearchHit[]>;
}

interface AgentConfig {
    project_name: string;
    agent_mode: AgentMode;
    ai_model: string | null;
    domain: string | null;
    has_byom_key: boolean;
    settings: Record<string, unknown>;
}
interface UpdateAgentConfigBody {
    agent_mode?: AgentMode;
    ai_model?: string;
    confidence_threshold?: number;
    settings?: Record<string, unknown>;
}
interface AgentRespondResult {
    content: string;
    content_html?: string;
    confidence: number;
    mode: AgentMode;
    effective_mode: AgentMode;
    message_created: boolean;
    message_id?: string;
    sources?: unknown[];
    usage?: Record<string, unknown>;
}
declare class AgentResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    status(): Promise<AgentStatus>;
    getConfig(): Promise<AgentConfig>;
    updateConfig(body: UpdateAgentConfigBody): Promise<void>;
    respond(conversationId: string, modeOverride?: AgentMode): Promise<AgentRespondResult>;
    classify(conversationId: string): Promise<Record<string, unknown>>;
    suggest(conversationId: string): Promise<{
        suggested_response: string;
        sources?: unknown[];
        confidence: number;
    }>;
}

interface WidgetConfig {
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
type UpdateWidgetConfigBody = Partial<Omit<WidgetConfig, "project_id">>;
declare class WidgetResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    getConfig(): Promise<WidgetConfig>;
    updateConfig(body: UpdateWidgetConfigBody): Promise<WidgetConfig>;
}

interface BrowseCatalogParams {
    q?: string;
    category?: string;
    status?: string;
}
interface UpdateLifecycleBody {
    status?: IntegrationStatus;
    display_name?: string;
    sidebar_enabled?: boolean;
    settings?: Record<string, unknown>;
    action_permissions?: Record<string, unknown>;
}
interface InstallUrlResponse {
    provider: string;
    install_url: string;
    setup_type: string;
    message: string;
}
declare class IntegrationsResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(): Promise<Integration[]>;
    browseCatalog(params?: BrowseCatalogParams): Promise<unknown>;
    getCatalogItem(provider: string): Promise<Record<string, unknown>>;
    getInstallUrl(provider: string): Promise<InstallUrlResponse>;
    updateLifecycle(provider: string, body: UpdateLifecycleBody): Promise<Integration | null>;
    disconnect(provider: string): Promise<void>;
}

interface CreateWebhookBody {
    url: string;
    events: string[];
}
type UpdateWebhookBody = Partial<CreateWebhookBody> & {
    status?: "active" | "disabled";
};
interface WebhookDelivery {
    id: string;
    event: string;
    status_code: number | null;
    duration_ms: number;
    attempt: number;
    status: string;
    created_at: string;
}
interface TestWebhookResult {
    delivered: boolean;
    status_code: number | null;
    duration_ms: number;
}
declare class WebhooksResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(): Promise<Webhook[]>;
    get(id: string): Promise<Webhook>;
    /** Returns the webhook with its `secret` populated. Store it — you cannot read it back later. */
    create(body: CreateWebhookBody): Promise<Webhook & {
        secret: string;
    }>;
    update(id: string, body: UpdateWebhookBody): Promise<Webhook>;
    delete(id: string): Promise<void>;
    test(id: string): Promise<TestWebhookResult>;
    deliveries(id: string): Promise<WebhookDelivery[]>;
    rotateSecret(id: string): Promise<{
        secret: string;
    }>;
}

interface CreateProjectBody {
    name: string;
    slug?: string;
    domain?: string;
}
interface UpdateProjectBody {
    name?: string;
    domain?: string;
    agent_mode?: AgentMode;
    ai_model?: string;
}
declare class ProjectsResource {
    private http;
    private orgId;
    constructor(http: HttpClient, orgId: string);
    list(): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(body: CreateProjectBody): Promise<Project>;
    update(id: string, body: UpdateProjectBody): Promise<Project>;
    delete(id: string): Promise<void>;
}

interface FormField {
    id?: string;
    type: string;
    label: string;
    name?: string;
    required?: boolean;
    placeholder?: string | null;
    options?: string[];
}
interface FormRecord {
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
type CreateFormBody = Partial<FormRecord> & {
    name: string;
};
type UpdateFormBody = Partial<FormRecord>;
interface FormSubmission {
    id: string;
    form_id: string;
    payload: Record<string, unknown>;
    submitted_at: string;
    ip_hash: string | null;
}
declare class FormsResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(): Promise<FormRecord[]>;
    get(id: string): Promise<FormRecord>;
    create(body: CreateFormBody): Promise<FormRecord>;
    update(id: string, body: UpdateFormBody): Promise<FormRecord>;
    archive(id: string): Promise<{
        id: string;
        archived: boolean;
    }>;
    unarchive(id: string): Promise<{
        id: string;
        archived: boolean;
    }>;
    submissions(id: string, params?: {
        limit?: number;
    }): Promise<FormSubmission[]>;
}

interface BeaconRecord {
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
type CreateBeaconBody = Partial<BeaconRecord> & {
    form_id: string;
};
type UpdateBeaconBody = Partial<BeaconRecord>;
declare class BeaconsResource {
    private http;
    private projectId;
    constructor(http: HttpClient, projectId: string);
    list(): Promise<BeaconRecord[]>;
    get(id: string): Promise<BeaconRecord>;
    create(body: CreateBeaconBody): Promise<BeaconRecord>;
    update(id: string, body: UpdateBeaconBody): Promise<BeaconRecord>;
    archive(id: string): Promise<{
        id: string;
        archived: boolean;
    }>;
    unarchive(id: string): Promise<{
        id: string;
        archived: boolean;
    }>;
}

declare class RogerIQError extends Error {
    code: string;
    status: number;
    requestId?: string;
    issues?: ApiErrorBody["issues"];
    retryAfter?: number;
    constructor(message: string, opts: {
        code?: string;
        status: number;
        requestId?: string;
        issues?: ApiErrorBody["issues"];
        retryAfter?: number;
    });
}

/**
 * Verify a RogerIQ webhook signature.
 *
 * Uses the Web Crypto API so it works in Node 18+, Cloudflare Workers,
 * Deno, and modern browsers without bringing in a crypto dependency.
 *
 *   import { verifyWebhookSignature } from "@rogeriq/sdk";
 *
 *   const ok = await verifyWebhookSignature(
 *     rawBody,                        // string — the raw request body, NOT JSON-parsed
 *     req.headers["x-rogeriq-signature"],
 *     process.env.WEBHOOK_SECRET!,
 *   );
 */
declare function verifyWebhookSignature(payload: string, signature: string | null | undefined, secret: string): Promise<boolean>;
/** Useful if you need to forward the signed body across services. */
declare function signWebhookPayload(payload: string, secret: string): Promise<string>;

/**
 * @rogeriq/sdk — TypeScript client for the RogerIQ API.
 *
 *   import { RogerIQ } from "@rogeriq/sdk";
 *
 *   const roger = new RogerIQ({
 *     apiKey: process.env.RIQ_API_KEY!,
 *     projectId: process.env.RIQ_PROJECT_ID!,
 *   });
 *
 *   const open = await roger.conversations.list({ status: "open" });
 *   await roger.conversations.reply("con_xxx", "Thanks — looking into it.");
 *   await roger.agent.respond("con_xxx");
 *
 * Webhook verification:
 *
 *   import { verifyWebhookSignature } from "@rogeriq/sdk";
 *   const ok = await verifyWebhookSignature(rawBody, sigHeader, secret);
 */

interface RogerIQOptions extends Omit<HttpClientOptions, "apiBase"> {
    /** Override only if you point at a non-production deployment. */
    apiBase?: string;
    /** Default project for resource clients. Per-resource setProject() overrides. */
    projectId?: string;
    /** Default org for org-scoped resources (projects, keys). */
    orgId?: string;
}
declare class RogerIQ {
    private http;
    private defaultProjectId?;
    private defaultOrgId?;
    constructor(opts: RogerIQOptions);
    /** Returns a resource client bound to a specific project. */
    project(projectId: string): {
        conversations: ConversationsResource;
        contacts: ContactsResource;
        kb: KbResource;
        agent: AgentResource;
        widget: WidgetResource;
        integrations: IntegrationsResource;
        webhooks: WebhooksResource;
        forms: FormsResource;
        beacons: BeaconsResource;
    };
    /** Org-scoped resources. */
    org(orgId: string): {
        projects: ProjectsResource;
    };
    get conversations(): ConversationsResource;
    get contacts(): ContactsResource;
    get kb(): KbResource;
    get agent(): AgentResource;
    get widget(): WidgetResource;
    get integrations(): IntegrationsResource;
    get webhooks(): WebhooksResource;
    get forms(): FormsResource;
    get beacons(): BeaconsResource;
    get projects(): ProjectsResource;
    private requireProjectId;
    private requireOrgId;
}

export { type AgentMode, type AgentStatus, type ApiErrorBody, type ArticleStatus, type Channel, type Contact, type Conversation, type ConversationStatus, type Integration, type IntegrationStatus, type KbArticle, type Message, type PaginatedResult, type Priority, type Project, type RateLimitInfo, type RequestInitLike, type RequestMeta, RogerIQ, RogerIQError, type RogerIQOptions, type Scope, type Webhook, signWebhookPayload, verifyWebhookSignature };
