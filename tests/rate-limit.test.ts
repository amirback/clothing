import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

/**
 * The site has no login, so this limiter is what stands between a public URL
 * and someone spending the owner's generation credits.
 */

async function freshLimiter(env: Record<string, string> = {}) {
  vi.resetModules();
  Object.assign(process.env, { RATE_LIMIT_MAX: "3", RATE_LIMIT_WINDOW_MS: "60000", ...env });
  return import("@/lib/rate-limit");
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("checkRateLimit", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const { checkRateLimit } = await freshLimiter();
    for (let i = 0; i < 3; i += 1) expect(checkRateLimit("1.1.1.1").allowed).toBe(true);

    const blocked = checkRateLimit("1.1.1.1");
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each client separately", async () => {
    const { checkRateLimit } = await freshLimiter();
    for (let i = 0; i < 3; i += 1) checkRateLimit("1.1.1.1");

    expect(checkRateLimit("1.1.1.1").allowed).toBe(false);
    expect(checkRateLimit("2.2.2.2").allowed).toBe(true);
  });

  it("lets a client back in once the window has passed", async () => {
    const { checkRateLimit } = await freshLimiter();
    for (let i = 0; i < 3; i += 1) checkRateLimit("1.1.1.1");
    expect(checkRateLimit("1.1.1.1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit("1.1.1.1").allowed).toBe(true);
  });

  it("reports how long the caller must wait", async () => {
    const { checkRateLimit } = await freshLimiter();
    for (let i = 0; i < 3; i += 1) checkRateLimit("1.1.1.1");

    vi.advanceTimersByTime(20_000);
    const blocked = checkRateLimit("1.1.1.1");
    expect(blocked.allowed).toBe(false);
    // 60s window, 20s elapsed -> about 40s left.
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(35);
  });
});

describe("clientKeyFromHeaders", () => {
  it("takes the original client from x-forwarded-for", async () => {
    const { clientKeyFromHeaders } = await freshLimiter();
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", async () => {
    const { clientKeyFromHeaders } = await freshLimiter();
    expect(clientKeyFromHeaders(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("degrades to a shared bucket rather than throwing when no IP is present", async () => {
    const { clientKeyFromHeaders } = await freshLimiter();
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});
