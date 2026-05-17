# Changelog

## 0.1.0 — 2026-05-17

Initial release.

- Resource clients for conversations, messages, contacts, kb, agent, widget,
  integrations, forms, beacons, webhooks, projects.
- `verifyWebhookSignature` / `signWebhookPayload` helpers (Web Crypto, works
  in Node / Workers / Deno / browsers).
- Auto-pagination via `listAll()` async iterators.
- `RogerIQError` with `code`, `status`, `requestId`, `issues`, `retryAfter`.
- Auto-retry on 429 when the server suggests a short backoff.
- Rate-limit + request-id headers surfaced via `onResponse` callback.
- Bring-your-own `fetch` for testing.
