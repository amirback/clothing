import type { GarmentCategory } from "./tryon/types";

/**
 * The MVP catalog.
 *
 * Only structure lives here — the visible name of every item comes from the
 * dictionaries (`lib/i18n/dictionaries/*.ts`, key `items.<id>`), so the catalog
 * is translated like the rest of the interface.
 *
 * Images live in `public/catalog/` and are served statically, so the client can
 * swap them without touching code. See README, "Как заменить каталог".
 */

export type CatalogCategory = Exclude<GarmentCategory, "auto">;

export type CatalogItem = {
  id: string;
  /** Category passed to the try-on model — it decides what the garment replaces. */
  category: CatalogCategory;
  /** File name inside `public/catalog/`. */
  file: string;
};

export const CATALOG: readonly CatalogItem[] = [
  { id: "tee-white", category: "tops", file: "tee-white.jpg" },
  { id: "tee-black", category: "tops", file: "tee-black.jpg" },
  { id: "tee-stripe", category: "tops", file: "tee-stripe.jpg" },
  { id: "shirt-denim", category: "tops", file: "shirt-denim.jpg" },
  { id: "shirt-floral", category: "tops", file: "shirt-floral.jpg" },
  { id: "sweatshirt-grey", category: "tops", file: "sweatshirt-grey.jpg" },
  { id: "hoodie-print", category: "tops", file: "hoodie-print.jpg" },
  { id: "sweater-white", category: "tops", file: "sweater-white.jpg" },
  { id: "jacket-denim", category: "tops", file: "jacket-denim.jpg" },
  { id: "top-slip-black", category: "tops", file: "top-slip-black.jpg" },
  { id: "jeans-blue", category: "bottoms", file: "jeans-blue.jpg" },
  { id: "jeans-black", category: "bottoms", file: "jeans-black.jpg" },
  { id: "shorts-beige", category: "bottoms", file: "shorts-beige.jpg" },
  { id: "skirt-black", category: "bottoms", file: "skirt-black.jpg" },
  { id: "dress-terracotta", category: "one-pieces", file: "dress-terracotta.jpg" },
];

export const CATALOG_CATEGORIES: readonly CatalogCategory[] = ["tops", "bottoms", "one-pieces"];

export function findCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

/** Public path used by the browser to render a catalog thumbnail. */
export function catalogImagePath(item: CatalogItem): string {
  return `/catalog/${item.file}`;
}
