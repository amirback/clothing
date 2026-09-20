import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { TryOnError } from "@/lib/tryon/types";

/**
 * Contract test for the FASHN provider.
 *
 * A stub server stands in for api.fashn.ai and replies with the shapes their
 * docs describe: POST /v1/run returns a prediction id, GET /v1/run/{id} is
 * polled until it completes. Without this, the paid path would ship having
 * never run — the key is only available to the client.
 */

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type Scenario = {
  runStatus?: number;
  runBody?: unknown;
  /** Statuses returned by successive polls; the last one repeats. */
  polls?: unknown[];
};

let server: Server;
let baseUrl: string;
let scenario: Scenario = {};
let requests: { method: string; url: string; auth?: string; body?: unknown }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        auth: req.headers.authorization,
        body: raw ? JSON.parse(raw) : undefined,
      });

      const send = (status: number, payload: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };

      if (req.method === "POST" && req.url === "/run") {
        send(scenario.runStatus ?? 200, scenario.runBody ?? { id: "pred_1", error: null });
        return;
      }

      if (req.method === "GET" && req.url?.startsWith("/run/")) {
        const polls = scenario.polls ?? [{ id: "pred_1", status: "completed", output: ["https://cdn.fashn.ai/out.jpg"], error: null }];
        const pollCount = requests.filter((r) => r.method === "GET").length;
        send(200, polls[Math.min(pollCount - 1, polls.length - 1)]);
        return;
      }

      send(404, { error: "not found" });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.FASHN_API_BASE = baseUrl;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** Imported lazily so each case picks up the env vars set for it. */
async function makeProvider(apiKey = "test-key") {
  const { createFashnProvider } = await import("@/lib/tryon/fashn");
  return createFashnProvider(apiKey);
}

function reset(next: Scenario) {
  scenario = next;
  requests = [];
}

const request = { personImage: PIXEL, garmentImage: PIXEL, category: "auto" as const };

describe("FASHN provider", () => {
  it("submits the documented payload and returns the finished image", async () => {
    reset({});
    const provider = await makeProvider();
    const result = await provider.run(request);

    expect(result.imageUrl).toBe("https://cdn.fashn.ai/out.jpg");
    expect(result.demo).toBe(false);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);

    const submit = requests[0];
    expect(submit.method).toBe("POST");
    expect(submit.auth).toBe("Bearer test-key");
    const body = submit.body as { model_name: string; inputs: Record<string, unknown> };
    expect(body.model_name).toBe("tryon-v1.6");
    expect(body.inputs.model_image).toBe(PIXEL);
    expect(body.inputs.garment_image).toBe(PIXEL);
    expect(body.inputs.category).toBe("auto");
    expect(body.inputs.num_samples).toBe(1);
  });

  it("keeps polling while the prediction is still running", async () => {
    reset({
      polls: [
        { id: "pred_1", status: "in_queue" },
        { id: "pred_1", status: "processing" },
        { id: "pred_1", status: "completed", output: ["https://cdn.fashn.ai/slow.jpg"] },
      ],
    });
    const provider = await makeProvider();
    const result = await provider.run(request);

    expect(result.imageUrl).toBe("https://cdn.fashn.ai/slow.jpg");
    expect(requests.filter((r) => r.method === "GET").length).toBe(3);
  });

  it("maps a moderation refusal to the MODERATION code", async () => {
    reset({ polls: [{ id: "pred_1", status: "failed", error: { name: "ModerationError", message: "Image failed moderation" } }] });
    const provider = await makeProvider();
    await expect(provider.run(request)).rejects.toBeInstanceOf(TryOnError);
    await expect(provider.run(request)).rejects.toMatchObject({ code: "MODERATION", status: 502 });
  });

  it("maps a missing person to the NO_PERSON code", async () => {
    reset({ polls: [{ id: "pred_1", status: "failed", error: "could not detect a person in the image" }] });
    const provider = await makeProvider();
    await expect(provider.run(request)).rejects.toMatchObject({ code: "NO_PERSON" });
  });

  it("treats a rejected key as a configuration problem, not a user error", async () => {
    reset({ runStatus: 401, runBody: { error: "unauthorized" } });
    const provider = await makeProvider();
    await expect(provider.run(request)).rejects.toMatchObject({ code: "NOT_CONFIGURED", status: 503 });
  });

  it("reports exhausted credits separately so the owner can act", async () => {
    reset({ runStatus: 402, runBody: { error: "insufficient credits" } });
    const provider = await makeProvider();
    await expect(provider.run(request)).rejects.toMatchObject({ code: "NO_CREDITS" });
  });

  it("fails with EMPTY_RESULT when the model returns no image", async () => {
    reset({ polls: [{ id: "pred_1", status: "completed", output: [] }] });
    const provider = await makeProvider();
    await expect(provider.run(request)).rejects.toMatchObject({ code: "EMPTY_RESULT" });
  });

  it("gives up with TIMEOUT instead of polling a stuck prediction forever", async () => {
    reset({ polls: [{ id: "pred_1", status: "processing" }] });
    process.env.TRYON_TIMEOUT_MS = "1200";
    // The ceiling is read when the module loads, so reload it for this case.
    vi.resetModules();
    const provider = await makeProvider();

    // After resetModules the class identity differs, so assert on the shape.
    await expect(provider.run(request)).rejects.toMatchObject({ code: "TIMEOUT", status: 504 });

    delete process.env.TRYON_TIMEOUT_MS;
    vi.resetModules();
  });
});
