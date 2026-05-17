import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, signWebhookPayload } from "../webhooks-verify.js";

const SECRET = "whsec_test_secret_value";

describe("webhook verification", () => {
  it("signs and verifies a payload round-trip", async () => {
    const payload = JSON.stringify({ event: "conversation.created", id: "evt_1" });
    const sig = await signWebhookPayload(payload, SECRET);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(await verifyWebhookSignature(payload, sig, SECRET)).toBe(true);
  });

  it("rejects modified payload", async () => {
    const payload = JSON.stringify({ event: "conversation.created", id: "evt_1" });
    const sig = await signWebhookPayload(payload, SECRET);
    const tampered = payload.replace("evt_1", "evt_2");
    expect(await verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects wrong secret", async () => {
    const payload = "abc";
    const sig = await signWebhookPayload(payload, SECRET);
    expect(await verifyWebhookSignature(payload, sig, "whsec_other")).toBe(false);
  });

  it("accepts bare hex signature (no sha256= prefix)", async () => {
    const payload = "hello";
    const sig = await signWebhookPayload(payload, SECRET);
    const bare = sig.replace(/^sha256=/, "");
    expect(await verifyWebhookSignature(payload, bare, SECRET)).toBe(true);
  });

  it("returns false for null/undefined signature", async () => {
    expect(await verifyWebhookSignature("body", null, SECRET)).toBe(false);
    expect(await verifyWebhookSignature("body", undefined, SECRET)).toBe(false);
  });
});
