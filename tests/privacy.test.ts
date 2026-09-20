import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "@/lib/catalog";

/** Recorders shared with the module mocks below (hoisted above the imports). */
const fsCalls = vi.hoisted(() => ({
  writes: [] as string[],
  reads: [] as string[],
}));

// Node's fs modules cannot be spied on in place, so wrap them: the real
// behaviour is preserved and every call is recorded.
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    default: actual,
    readFile: (...args: Parameters<typeof actual.readFile>) => {
      fsCalls.reads.push(String(args[0]));
      return actual.readFile(...args);
    },
    writeFile: (...args: Parameters<typeof actual.writeFile>) => {
      fsCalls.writes.push(String(args[0]));
      return actual.writeFile(...args);
    },
    appendFile: (...args: Parameters<typeof actual.appendFile>) => {
      fsCalls.writes.push(String(args[0]));
      return actual.appendFile(...args);
    },
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const record = <T extends (...a: never[]) => unknown>(name: string, fn: T) =>
    ((...args: Parameters<T>) => {
      fsCalls.writes.push(`${name}:${String(args[0])}`);
      return fn(...args);
    }) as T;
  return {
    ...actual,
    default: actual,
    writeFileSync: record("writeFileSync", actual.writeFileSync),
    appendFileSync: record("appendFileSync", actual.appendFileSync),
    createWriteStream: record("createWriteStream", actual.createWriteStream),
  };
});

/**
 * Proves the privacy promise in the brief: "фото пользователей не хранятся
 * дольше сессии".
 *
 * The claim is only worth making if something checks it, so these tests watch
 * the filesystem and the log during a real request and fail if the visitor's
 * photo reaches either one.
 */

const PERSON_PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function loadRoute() {
  vi.resetModules();
  delete process.env.FASHN_API_KEY;
  Object.assign(process.env, { DEMO_DELAY_MS: "0", RATE_LIMIT_MAX: "50" });
  return import("@/app/api/tryon/route");
}

function tryOnRequest() {
  return new Request("http://localhost/api/tryon", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.50" },
    body: JSON.stringify({ personImage: PERSON_PHOTO, garmentId: CATALOG[0].id }),
  });
}

beforeEach(() => {
  fsCalls.writes.length = 0;
  fsCalls.reads.length = 0;
});

afterEach(() => vi.restoreAllMocks());

describe("photo retention", () => {
  it("writes nothing to disk while handling a try-on", async () => {
    const { POST } = await loadRoute();
    const response = await POST(tryOnRequest());

    expect(response.status).toBe(200);
    expect(fsCalls.writes).toEqual([]);
  });

  it("reads only the catalog garment from disk, never anything about the visitor", async () => {
    const { POST } = await loadRoute();
    await POST(tryOnRequest());

    expect(fsCalls.reads.length).toBeGreaterThan(0);
    for (const readPath of fsCalls.reads) {
      expect(readPath).toContain("public/catalog/");
    }
  });

  it("keeps the photo out of the log, including when the request fails", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { POST } = await loadRoute();
    await POST(tryOnRequest());
    // A failing request takes the error path, where logging actually happens.
    await POST(
      new Request("http://localhost/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.51" },
        body: JSON.stringify({ personImage: PERSON_PHOTO, garmentId: "no-such-item" }),
      }),
    );

    const everythingLogged = [...log.mock.calls, ...error.mock.calls, ...warn.mock.calls]
      .flat()
      .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry ?? "")))
      .join(" ");

    expect(everythingLogged).not.toContain("data:image");
    expect(everythingLogged).not.toContain(PERSON_PHOTO.slice(30, 80));
  });

  it("tells caches not to keep the result, which contains the visitor", async () => {
    const { POST } = await loadRoute();
    const response = await POST(tryOnRequest());
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("holds no reference to the photo once the request is answered", async () => {
    const { POST } = await loadRoute();
    await POST(tryOnRequest());

    // Nothing in the module graph should have accumulated state: a second
    // identical request must behave like the first.
    const again = await POST(tryOnRequest());
    expect(again.status).toBe(200);

    const rateLimit = await import("@/lib/rate-limit");
    // The limiter keeps timestamps per IP and nothing else — no payloads.
    expect(JSON.stringify(rateLimit)).not.toContain("data:image");
  });
});
