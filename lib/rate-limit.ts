/**
 * Best-effort per-IP rate limit.
 *
 * The site has no login, so this is what stands between a public URL and
 * someone burning the owner's generation credits. It is in-memory, so on
 * serverless it limits per warm instance, not globally — good enough to blunt
 * casual abuse. For a hard guarantee, put a platform WAF rate limit or a shared
 * store (Upstash Redis, Vercel KV) in front of this route; see README.
 */

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 6);

const hits = new Map<string, number[]>();

export type RateLimitVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(key: string): RateLimitVerdict {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - recent[0])) / 1000));
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  hits.set(key, recent);

  // Bounded cleanup so a long-lived instance cannot grow the map without limit.
  if (hits.size > 5_000) {
    for (const [existingKey, timestamps] of hits) {
      if (timestamps.every((at) => now - at >= WINDOW_MS)) hits.delete(existingKey);
    }
  }

  return { allowed: true };
}

/** Client IP from the proxy headers set by Vercel/most CDNs. */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
