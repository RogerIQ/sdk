import { describe, it, expect, vi } from "vitest";
import { RogerIQ, RogerIQError } from "../index.js";

function jsonResponse(body: unknown, init: Partial<{ status: number; headers: Record<string, string> }> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("RogerIQ client", () => {
  it("sends X-API-Key header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await roger.conversations.list({ status: "open" });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe("riq_test");
    expect(init.method).toBe("GET");
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/v1/projects/prj_x/conversations");
    expect(url).toContain("status=open");
  });

  it("unwraps { data: ... } responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: { id: "con_1", status: "open" } }),
    );
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    const conv = await roger.conversations.get("con_1");
    expect(conv.id).toBe("con_1");
  });

  it("returns paginated lists verbatim", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ id: "con_1" }, { id: "con_2" }], cursor: "abc", has_more: true }),
    );
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    const page = await roger.conversations.list();
    expect(page.data).toHaveLength(2);
    expect(page.cursor).toBe("abc");
    expect(page.has_more).toBe(true);
  });

  it("throws RogerIQError with code + request_id on 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: "Not found", code: "CONVERSATION_NOT_FOUND" },
        { status: 404, headers: { "X-Request-Id": "req_xyz" } },
      ),
    );
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(roger.conversations.get("missing")).rejects.toMatchObject({
      code: "CONVERSATION_NOT_FOUND",
      status: 404,
      requestId: "req_xyz",
    });
  });

  it("auto-retries 429 with short retry_after", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: "rl", code: "RATE_LIMITED", retry_after: 0 }, { status: 429 }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { id: "con_1" } }));
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    const conv = await roger.conversations.get("con_1");
    expect(conv.id).toBe("con_1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("project(id).conversations targets that project", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const roger = new RogerIQ({
      apiKey: "riq_test",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await roger.project("prj_other").conversations.list();
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain("/api/v1/projects/prj_other/conversations");
  });

  it("requires projectId for resource shortcuts", () => {
    const roger = new RogerIQ({
      apiKey: "riq_test",
      fetch: (() => undefined) as unknown as typeof fetch,
    });
    expect(() => roger.conversations).toThrow(/No default projectId/);
  });

  it("surfaces rate limit headers via onResponse", async () => {
    const seen: unknown[] = [];
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { data: [] },
        {
          headers: {
            "X-Request-Id": "req_a",
            "X-RateLimit-Limit": "600",
            "X-RateLimit-Remaining": "599",
            "X-RateLimit-Reset": "1700000000",
          },
        },
      ),
    );
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
      onResponse: (meta) => seen.push(meta),
    });
    await roger.conversations.list();
    expect(seen).toHaveLength(1);
    expect((seen[0] as { requestId: string }).requestId).toBe("req_a");
    expect((seen[0] as { rateLimit: { remaining: number } }).rateLimit.remaining).toBe(599);
  });

  it("RogerIQError instance check works", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "bad", code: "BAD_REQUEST" }, { status: 400 }));
    const roger = new RogerIQ({
      apiKey: "riq_test",
      projectId: "prj_x",
      fetch: fetchMock as unknown as typeof fetch,
    });
    try {
      await roger.conversations.get("x");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RogerIQError);
    }
  });
});
