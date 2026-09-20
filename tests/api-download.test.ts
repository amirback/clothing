import { describe, expect, it, vi } from "vitest";

/**
 * The download proxy exists so a result on the provider's CDN can be saved as a
 * file. That makes it a server that fetches a URL a visitor supplies, so the
 * host allowlist is the security boundary worth testing.
 */

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/download/route");
}

const get = (url: string) => new Request(`http://localhost/api/download?url=${encodeURIComponent(url)}`);

describe("GET /api/download", () => {
  it.each([
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost:3000/api/tryon",
    "http://127.0.0.1:22",
    "https://evil.example.com/pixel.jpg",
    "https://cdn.fashn.ai.evil.com/x.jpg",
    "file:///etc/passwd",
    "http://cdn.fashn.ai/x.jpg",
  ])("refuses %s", async (url) => {
    const { GET } = await loadRoute();
    const response = await GET(get(url));

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("BAD_IMAGE");
  });

  it("refuses a request with no address at all", async () => {
    const { GET } = await loadRoute();
    const response = await GET(new Request("http://localhost/api/download"));
    expect(response.status).toBe(400);
  });

  it("refuses a malformed address", async () => {
    const { GET } = await loadRoute();
    const response = await GET(get("h ttp://broken"));
    expect(response.status).toBe(400);
  });

  it("accepts the provider CDN over https and streams it back as an attachment", async () => {
    const { GET } = await loadRoute();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Blob([new Uint8Array([1, 2, 3])]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    const response = await GET(get("https://cdn.fashn.ai/result.jpg"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="try-on-\d+\.jpg"$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    fetchSpy.mockRestore();
  });

  it("reports an unreachable CDN as a service problem, not a bad request", async () => {
    const { GET } = await loadRoute();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const response = await GET(get("https://cdn.fashn.ai/missing.jpg"));

    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("UNAVAILABLE");
    fetchSpy.mockRestore();
  });
});
