import type { GarmentCategory } from "./tryon/types";

/**
 * The MVP catalog.
 *
 * Images live in `public/catalog/` so they are served statically and can be
 * replaced by the client without touching code: drop a JPEG/PNG in that folder
 * and edit the matching row below. See README, "Как заменить каталог".
 */

export type CatalogItem = {
  id: string;
  name: string;
  /** Category passed to the try-on model — it decides what the garment replaces. */
  category: Exclude<GarmentCategory, "auto">;
  /** File name inside `public/catalog/`. */
  file: string;
};

export const CATALOG: readonly CatalogItem[] = [
  { id: "tee-white", name: "Белая футболка", category: "tops", file: "tee-white.png" },
  { id: "tee-black", name: "Чёрная футболка", category: "tops", file: "tee-black.png" },
  { id: "tee-stripe", name: "Футболка в полоску", category: "tops", file: "tee-stripe.png" },
  { id: "shirt-blue", name: "Голубая рубашка", category: "tops", file: "shirt-blue.png" },
  { id: "hoodie-grey", name: "Серое худи", category: "tops", file: "hoodie-grey.png" },
  { id: "hoodie-olive", name: "Худи оливковое", category: "tops", file: "hoodie-olive.png" },
  { id: "sweater-cream", name: "Кремовый свитер", category: "tops", file: "sweater-cream.png" },
  { id: "jacket-denim", name: "Джинсовая куртка", category: "tops", file: "jacket-denim.png" },
  { id: "jeans-blue", name: "Синие джинсы", category: "bottoms", file: "jeans-blue.png" },
  { id: "jeans-black", name: "Чёрные джинсы", category: "bottoms", file: "jeans-black.png" },
  { id: "shorts-beige", name: "Бежевые шорты", category: "bottoms", file: "shorts-beige.png" },
  { id: "skirt-black", name: "Чёрная юбка", category: "bottoms", file: "skirt-black.png" },
  { id: "dress-red", name: "Красное платье", category: "one-pieces", file: "dress-red.png" },
  { id: "dress-floral", name: "Платье с цветами", category: "one-pieces", file: "dress-floral.png" },
];

export const CATALOG_CATEGORY_LABELS: Record<CatalogItem["category"], string> = {
  tops: "Верх",
  bottoms: "Низ",
  "one-pieces": "Платья",
};

export function findCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}

/** Public path used by the browser to render a catalog thumbnail. */
export function catalogImagePath(item: CatalogItem): string {
  return `/catalog/${item.file}`;
}
