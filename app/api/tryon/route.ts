import { findCatalogItem } from "@/lib/catalog";
import { readCatalogImageAsDataUri } from "@/lib/catalog.server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { getTryOnProvider } from "@/lib/tryon";
import { TryOnError, type GarmentCategory } from "@/lib/tryon/types";
import { ValidationError, validateImageDataUri } from "@/lib/validation";

/**
 * POST /api/tryon — runs one virtual try-on.
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

export async function POST(request: Request): Promise<Response> {
  const limit = checkRateLimit(clientKeyFromHeaders(request.headers));
  if (!limit.allowed) {
    return Response.json(
      { error: `Слишком много примерок подряд. Подождите ${limit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: TryOnBody;
  try {
    body = (await request.json()) as TryOnBody;
  } catch {
    return Response.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  try {
    const person = validateImageDataUri(body.personImage, "Фото человека");

    // Garment comes either from the catalog (by id) or as the visitor's own upload.
    let garmentImage: string;
    let category: GarmentCategory;

    if (typeof body.garmentId === "string" && body.garmentId.length > 0) {
      const item = findCatalogItem(body.garmentId);
      if (!item) {
        return Response.json({ error: "Вещь из каталога не найдена." }, { status: 400 });
      }
      garmentImage = await readCatalogImageAsDataUri(item);
      category = item.category;
    } else {
      garmentImage = validateImageDataUri(body.garmentImage, "Фото одежды").dataUri;
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
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TryOnError) {
      // `cause` carries the provider detail; it stays server-side.
      console.error("[tryon] provider error:", error.message, error.cause ?? "");
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[tryon] unexpected error:", error);
    return Response.json({ error: "Не удалось выполнить примерку. Попробуйте ещё раз." }, { status: 500 });
  }
}
