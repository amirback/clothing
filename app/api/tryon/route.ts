import { findCatalogItem } from "@/lib/catalog";
import { readCatalogImageAsDataUri } from "@/lib/catalog.server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { getTryOnProvider } from "@/lib/tryon";
import { TryOnError, type GarmentCategory } from "@/lib/tryon/types";
import {
  GARMENT_CODES,
  PERSON_CODES,
  ValidationError,
  validateImageDataUri,
} from "@/lib/validation";
import type { ErrorCode } from "@/lib/i18n/dictionaries/ru";

/**
 * POST /api/tryon — runs one virtual try-on.
 *
 * Errors come back as `{ code, params }`, never as prose: the server does not
 * know which language the visitor reads, so the browser does the wording.
 *
 * Privacy: photos are held in memory for the duration of this request only.
 * Nothing is written to disk, to a database or to a log — see README,
 * "Что происходит с фото".
 */

export const runtime = "nodejs";
/** Ceiling for the whole request on the host; the provider aborts earlier. */
export const maxDuration = 60;

const VALID_CATEGORIES: ReadonlySet<string> = new Set(["auto", "tops", "bottoms", "one-pieces"]);

type TryOnBody = {
  personImage?: unknown;
  garmentImage?: unknown;
  garmentId?: unknown;
  category?: unknown;
};

function fail(code: ErrorCode, status: number, params: Record<string, string | number> = {}) {
  return Response.json({ code, params }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return Response.json(
      { code: "RATE_LIMITED", params: { seconds: limit.retryAfterSeconds } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  let body: TryOnBody;
  try {
    body = (await request.json()) as TryOnBody;
  } catch {
    return fail("UNKNOWN", 400);
  }

  try {
    const person = validateImageDataUri(body.personImage, PERSON_CODES);

    // Garment comes either from the catalog (by id) or as the visitor's own upload.
    let garmentImage: string;
    let category: GarmentCategory;

    if (typeof body.garmentId === "string" && body.garmentId.length > 0) {
      const item = findCatalogItem(body.garmentId);
      if (!item) return fail("CATALOG_NOT_FOUND", 400);
      garmentImage = await readCatalogImageAsDataUri(item);
      category = item.category;
    } else {
      garmentImage = validateImageDataUri(body.garmentImage, GARMENT_CODES).dataUri;
      category =
        typeof body.category === "string" && VALID_CATEGORIES.has(body.category)
          ? (body.category as GarmentCategory)
          : "auto";
    }

    const provider = getTryOnProvider();
    const result = await provider.run(
      { personImage: person.dataUri, garmentImage, category },
      request.signal,
    );

    return Response.json(result, {
      // The result references the visitor's photo: never let a cache keep it.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return fail(error.code, 400, error.params);
    }
    if (error instanceof TryOnError) {
      // `detail` carries the provider message; it stays server-side.
      console.error("[tryon] provider error:", error.code, error.detail ?? "");
      return fail(error.code, error.status, error.params);
    }
    console.error("[tryon] unexpected error:", error);
    return fail("UNKNOWN", 500);
  }
}
