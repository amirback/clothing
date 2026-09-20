import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "@/lib/catalog";
import { ru } from "@/lib/i18n/dictionaries/ru";

/**
 * End-to-end test of the try-on endpoint, calling the route handler the way
 * the platform does. Covers the contract the browser relies on: every failure
 * is a translation code with parameters, never a sentence.
 */

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function loadRoute(env: Record<string, string> = {}) {
  vi.resetModules();
  // No API key: the demo provider answers, so no test ever spends a credit.
  delete process.env.FASHN_API_KEY;
  // The demo provider's imitated latency would otherwise dominate the suite.
  Object.assign(process.env, { DEMO_DELAY_MS: "0", RATE_LIMIT_MAX: "50", RATE_LIMIT_WINDOW_MS: "60000", ...env });
  return import("@/app/api/tryon/route");
}

let clientIp = 0;

/** A new IP per request so the limiter does not leak between cases. */
function post(body: unknown, ip = `10.0.0.${(clientIp += 1) % 250}`) {
  return new Request("http://localhost/api/tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  clientIp = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/tryon", () => {
  it("completes a try-on against a catalog item", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.imageUrl).toMatch(/^data:image\//);
    expect(payload.demo).toBe(true);
    expect(typeof payload.elapsedMs).toBe("number");
  });

  it("completes a try-on against an uploaded garment", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ personImage: PIXEL, garmentImage: PIXEL, category: "tops" }));
    expect(response.status).toBe(200);
  });

  it("never lets a result be cached, since it contains the visitor's photo", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    [{}, "PERSON_MISSING"],
    [{ personImage: "not-an-image", garmentId: CATALOG[0].id }, "PERSON_FORMAT"],
    [{ personImage: "https://example.com/a.jpg", garmentId: CATALOG[0].id }, "PERSON_FORMAT"],
    [{ personImage: PIXEL }, "GARMENT_MISSING"],
    [{ personImage: PIXEL, garmentImage: "nope" }, "GARMENT_FORMAT"],
    [{ personImage: PIXEL, garmentId: "does-not-exist" }, "CATALOG_NOT_FOUND"],
  ])("rejects %j with %s", async (body, code) => {
    const { POST } = await loadRoute();
    const response = await POST(post(body));

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe(code);
    // The browser must be able to turn every code into text.
    expect(ru.errors[payload.code as keyof typeof ru.errors]).toBeTruthy();
  });

  it("answers malformed JSON without leaking an internal error", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post("{ not json"));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("UNKNOWN");
  });

  it("falls back to automatic detection when the category is not one we accept", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ personImage: PIXEL, garmentImage: PIXEL, category: "hats" }));
    expect(response.status).toBe(200);
  });

  it("blocks a client that runs through its allowance and says when to retry", async () => {
    const { POST } = await loadRoute({ RATE_LIMIT_MAX: "2" });
    const ip = "198.51.100.99";

    await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, ip));
    await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, ip));
    const blocked = await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, ip));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    const payload = await blocked.json();
    expect(payload.code).toBe("RATE_LIMITED");
    expect(payload.params.seconds).toBeGreaterThan(0);
  });

  it("keeps the limit per client, so one abuser cannot lock everyone out", async () => {
    const { POST } = await loadRoute({ RATE_LIMIT_MAX: "1" });
    await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, "203.0.113.1"));

    const blocked = await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, "203.0.113.1"));
    const other = await POST(post({ personImage: PIXEL, garmentId: CATALOG[0].id }, "203.0.113.2"));

    expect(blocked.status).toBe(429);
    expect(other.status).toBe(200);
  });

  it("rejects an oversized payload before reaching the model", async () => {
    const { POST } = await loadRoute();
    const huge = `data:image/jpeg;base64,${Buffer.alloc(9 * 1024 * 1024).toString("base64")}`;
    const response = await POST(post({ personImage: huge, garmentId: CATALOG[0].id }));

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("PERSON_TOO_LARGE");
  });
});
