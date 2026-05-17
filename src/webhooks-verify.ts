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

export async function verifyWebhookSignature(
  payload: string,
  signature: string | null | undefined,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const received = signature.replace(/^sha256=/, "");
  const expected = await signPayload(payload, secret);
  return timingSafeEqualHex(expected, received);
}

/** Useful if you need to forward the signed body across services. */
export async function signWebhookPayload(payload: string, secret: string): Promise<string> {
  return `sha256=${await signPayload(payload, secret)}`;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Web Crypto API not available. Use Node >= 18, Workers, Deno, or a modern browser.",
    );
  }
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToHex(new Uint8Array(sig));
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
