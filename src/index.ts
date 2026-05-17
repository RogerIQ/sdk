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

import { HttpClient, type HttpClientOptions } from "./http.js";
import { ConversationsResource } from "./resources/conversations.js";
import { ContactsResource } from "./resources/contacts.js";
import { KbResource } from "./resources/kb.js";
import { AgentResource } from "./resources/agent.js";
import { WidgetResource } from "./resources/widget.js";
import { IntegrationsResource } from "./resources/integrations.js";
import { WebhooksResource } from "./resources/webhooks.js";
import { ProjectsResource } from "./resources/projects.js";
import { FormsResource } from "./resources/forms.js";
import { BeaconsResource } from "./resources/beacons.js";

export * from "./types.js";
export { RogerIQError } from "./error.js";
export { verifyWebhookSignature, signWebhookPayload } from "./webhooks-verify.js";

export interface RogerIQOptions extends Omit<HttpClientOptions, "apiBase"> {
  /** Override only if you point at a non-production deployment. */
  apiBase?: string;
  /** Default project for resource clients. Per-resource setProject() overrides. */
  projectId?: string;
  /** Default org for org-scoped resources (projects, keys). */
  orgId?: string;
}

const DEFAULT_API_BASE = "https://api.rogeriq.com";

export class RogerIQ {
  private http: HttpClient;
  private defaultProjectId?: string;
  private defaultOrgId?: string;

  constructor(opts: RogerIQOptions) {
    this.http = new HttpClient({
      apiKey: opts.apiKey,
      apiBase: opts.apiBase ?? DEFAULT_API_BASE,
      fetch: opts.fetch,
      userAgent: opts.userAgent,
      onResponse: opts.onResponse,
    });
    this.defaultProjectId = opts.projectId;
    this.defaultOrgId = opts.orgId;
  }

  /** Returns a resource client bound to a specific project. */
  project(projectId: string) {
    return {
      conversations: new ConversationsResource(this.http, projectId),
      contacts: new ContactsResource(this.http, projectId),
      kb: new KbResource(this.http, projectId),
      agent: new AgentResource(this.http, projectId),
      widget: new WidgetResource(this.http, projectId),
      integrations: new IntegrationsResource(this.http, projectId),
      webhooks: new WebhooksResource(this.http, projectId),
      forms: new FormsResource(this.http, projectId),
      beacons: new BeaconsResource(this.http, projectId),
    };
  }

  /** Org-scoped resources. */
  org(orgId: string) {
    return {
      projects: new ProjectsResource(this.http, orgId),
    };
  }

  // Convenience accessors using the default project / org if set in constructor.
  get conversations() { return new ConversationsResource(this.http, this.requireProjectId()); }
  get contacts() { return new ContactsResource(this.http, this.requireProjectId()); }
  get kb() { return new KbResource(this.http, this.requireProjectId()); }
  get agent() { return new AgentResource(this.http, this.requireProjectId()); }
  get widget() { return new WidgetResource(this.http, this.requireProjectId()); }
  get integrations() { return new IntegrationsResource(this.http, this.requireProjectId()); }
  get webhooks() { return new WebhooksResource(this.http, this.requireProjectId()); }
  get forms() { return new FormsResource(this.http, this.requireProjectId()); }
  get beacons() { return new BeaconsResource(this.http, this.requireProjectId()); }
  get projects() { return new ProjectsResource(this.http, this.requireOrgId()); }

  private requireProjectId(): string {
    if (!this.defaultProjectId) {
      throw new Error(
        "No default projectId. Pass `projectId` to the RogerIQ constructor, or use `roger.project('prj_xxx').conversations.list(...)`.",
      );
    }
    return this.defaultProjectId;
  }

  private requireOrgId(): string {
    if (!this.defaultOrgId) {
      throw new Error(
        "No default orgId. Pass `orgId` to the RogerIQ constructor, or use `roger.org('org_xxx').projects.list()`.",
      );
    }
    return this.defaultOrgId;
  }
}
