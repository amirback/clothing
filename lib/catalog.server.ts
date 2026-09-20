import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CatalogItem } from "./catalog";

/**
 * Server-only half of the catalog.
 *
 * Kept apart from `lib/catalog.ts` because that module is imported by client
 * components; pulling `node:fs` into it would break the browser bundle.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * Reads a catalog image from disk as a `data:` URI.
 *
 * Deliberately not a public URL: the model provider must be able to read the
 * garment, and on localhost (or behind auth/preview protection) our own
 * `/catalog/...` URLs are not reachable from the outside.
 */
export async function readCatalogImageAsDataUri(item: CatalogItem): Promise<string> {
  const extension = path.extname(item.file).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new Error(`Unsupported catalog image type: ${item.file}`);
  }
  // `item.file` comes from the hardcoded CATALOG table, never from user input.
  const absolute = path.join(process.cwd(), "public", "catalog", item.file);
  const bytes = await readFile(absolute);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
