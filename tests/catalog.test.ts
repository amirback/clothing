import { describe, expect, it } from "vitest";
import { statSync } from "node:fs";
import path from "node:path";
import { CATALOG, CATALOG_CATEGORIES, catalogImagePath, findCatalogItem } from "@/lib/catalog";
import { readCatalogImageAsDataUri } from "@/lib/catalog.server";
import { en } from "@/lib/i18n/dictionaries/en";
import { kk } from "@/lib/i18n/dictionaries/kk";
import { ru } from "@/lib/i18n/dictionaries/ru";

/**
 * Catalog integrity.
 *
 * The catalog is edited by hand when the client swaps in real product photos,
 * so the likely mistakes are a typo in a file name or a new item added without
 * a translation. Both would only show up as a broken tile in production.
 */

const PUBLIC_CATALOG = path.join(process.cwd(), "public", "catalog");

describe("catalog", () => {
  it("meets the brief: between 5 and 20 items", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(5);
    expect(CATALOG.length).toBeLessThanOrEqual(20);
  });

  it("has unique ids", () => {
    const ids = CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique image files", () => {
    const files = CATALOG.map((item) => item.file);
    expect(new Set(files).size).toBe(files.length);
  });

  it.each(CATALOG)("$id has an image on disk", (item) => {
    const stats = statSync(path.join(PUBLIC_CATALOG, item.file));
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(1024);
  });

  it.each(CATALOG)("$id uses a category the model understands", (item) => {
    expect(CATALOG_CATEGORIES).toContain(item.category);
  });

  it.each(CATALOG)("$id is named in every language", (item) => {
    for (const [locale, dict] of Object.entries({ ru, en, kk })) {
      const name = dict.items[item.id as keyof typeof dict.items];
      expect(name, `${locale} is missing a name for ${item.id}`).toBeTruthy();
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no orphan translations left behind after an item is removed", () => {
    const ids = new Set(CATALOG.map((item) => item.id));
    for (const [locale, dict] of Object.entries({ ru, en, kk })) {
      for (const key of Object.keys(dict.items)) {
        expect(ids.has(key), `${locale} names "${key}", which is not in the catalog`).toBe(true);
      }
    }
  });

  it("serves thumbnails from the public folder", () => {
    expect(catalogImagePath(CATALOG[0])).toBe(`/catalog/${CATALOG[0].file}`);
  });

  it("looks items up by id and rejects unknown ones", () => {
    expect(findCatalogItem(CATALOG[0].id)?.id).toBe(CATALOG[0].id);
    expect(findCatalogItem("no-such-item")).toBeUndefined();
  });

  it("reads a garment as a data URI the model can consume", async () => {
    const dataUri = await readCatalogImageAsDataUri(CATALOG[0]);
    expect(dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(dataUri.length).toBeGreaterThan(2048);
  });
});
