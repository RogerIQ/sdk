> **Mirror.** This repository is auto-synced from the [`sdk/`](https://github.com/seangeng/rogeriq/tree/main/sdk)
> subdirectory of the rogeriq monorepo on every push to main. **Open issues + PRs there, not here** — anything filed
> against this repo will be overwritten on the next sync. Releases are published to npm from the monorepo.

# `@rogeriq/sdk`

Official TypeScript SDK for the [RogerIQ](https://rogeriq.com) API. Runs
on Node 18+, Cloudflare Workers, Deno, browsers, and any modern edge
runtime. Zero dependencies.

## Install

```bash
npm install @rogeriq/sdk
```

## Quick start

```ts
import { RogerIQ } from "@rogeriq/sdk";

const roger = new RogerIQ({
  apiKey: process.env.RIQ_API_KEY!,
  projectId: process.env.RIQ_PROJECT_ID!, // default project
});

// List open conversations
const open = await roger.conversations.list({ status: "open" });

// Reply
await roger.conversations.reply("con_xxx", "Thanks — looking into it.");

// Let the AI draft + send the response
const result = await roger.agent.respond("con_xxx");

// Search knowledge base
const hits = await roger.kb.search("refund policy");

// Update widget config (busts server-side cache immediately)
await roger.widget.updateConfig({ theme: "dark", color: "#5b21b6" });
```

## Multi-project

```ts
const roger = new RogerIQ({ apiKey: process.env.RIQ_API_KEY! });
await roger.project("prj_a").conversations.list();
await roger.project("prj_b").kb.search("...");
await roger.org("org_x").projects.list();
```

## Pagination

Every list endpoint returns `{ data, cursor, has_more }`. Resource clients
that support pagination also expose `listAll()` which auto-walks pages:

```ts
for await (const conv of roger.conversations.listAll({ status: "open" })) {
  console.log(conv.id, conv.subject);
}
```

## Webhook verification

```ts
import { verifyWebhookSignature } from "@rogeriq/sdk";

// In your HTTP handler:
const rawBody = await req.text();
const sig = req.headers.get("x-rogeriq-signature");
if (!(await verifyWebhookSignature(rawBody, sig, process.env.WEBHOOK_SECRET!))) {
  return new Response("invalid signature", { status: 401 });
}
const event = JSON.parse(rawBody);
```

Uses the Web Crypto API — works in Node, Workers, Deno, browsers.

## Errors

All errors are `RogerIQError` instances. Branch on `code` (machine-readable
enum), not the message. `requestId` is included so you can correlate logs.

```ts
import { RogerIQError } from "@rogeriq/sdk";

try {
  await roger.conversations.get("con_missing");
} catch (e) {
  if (e instanceof RogerIQError) {
    if (e.code === "CONVERSATION_NOT_FOUND") {
      // handle
    }
    console.error(e.code, e.requestId, e.message);
  }
}
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `INSUFFICIENT_SCOPE`,
`CONVERSATION_NOT_FOUND`, `PROJECT_NOT_FOUND`, `RATE_LIMITED`,
`BAD_REQUEST`, `CONFLICT`.

## Rate limits

The SDK auto-retries 429 once when the server suggests a short delay
(≤30s). For longer delays it throws so your code can decide. Watch
headroom via `onResponse`:

```ts
const roger = new RogerIQ({
  apiKey: process.env.RIQ_API_KEY!,
  projectId: process.env.RIQ_PROJECT_ID!,
  onResponse: (meta) => {
    if (meta.rateLimit && meta.rateLimit.remaining < 10) {
      console.warn("approaching rate limit", meta.rateLimit);
    }
  },
});
```

## Cloudflare Workers

```ts
import { RogerIQ } from "@rogeriq/sdk";

export default {
  async fetch(req, env) {
    const roger = new RogerIQ({
      apiKey: env.RIQ_API_KEY,
      projectId: env.RIQ_PROJECT_ID,
    });
    const conversations = await roger.conversations.list({ status: "open" });
    return Response.json(conversations);
  },
};
```

## Bring your own `fetch`

Defaults to `globalThis.fetch`. Override for testing or custom transports:

```ts
const roger = new RogerIQ({
  apiKey: "riq_test",
  projectId: "prj_x",
  fetch: customFetch,
});
```

## Resources covered

| Resource         | Methods                                                      |
|------------------|--------------------------------------------------------------|
| `conversations`  | list, listAll, get, create, update, reply, resolve, snooze, assign |
| `conversations.messages` | list, send                                            |
| `contacts`       | list, listAll, get, upsert, update                           |
| `kb`             | list, get, create, update, delete, publish, search           |
| `agent`          | status, getConfig, updateConfig, respond, classify, suggest  |
| `widget`         | getConfig, updateConfig                                      |
| `integrations`   | list, browseCatalog, getCatalogItem, getInstallUrl, updateLifecycle, disconnect |
| `forms`          | list, get, create, update, archive, unarchive, submissions   |
| `beacons`        | list, get, create, update, archive, unarchive                |
| `webhooks`       | list, get, create, update, delete, test, deliveries, rotateSecret |
| `projects`       | list, get, create, update, delete                            |

## License

MIT
