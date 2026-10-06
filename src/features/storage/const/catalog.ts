import type { CatalogCategory } from "../types/catalog";

export const CATALOG_CATEGORY_LABELS: Record<CatalogCategory, string> = {
  electronics: "Electrónica",
  books: "Libros",
  clothing: "Ropa",
};

export const CATALOG_CATEGORY_OPTIONS = (
  Object.keys(CATALOG_CATEGORY_LABELS) as CatalogCategory[]
).map((category) => ({
  value: category,
  label: CATALOG_CATEGORY_LABELS[category],
}));

export const DEFAULT_CATALOG_CATEGORY: CatalogCategory = "electronics";

export const CATALOG_CACHE_NAMESPACE = "catalog";
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

export const CATALOG_PREVIEW_ROWS = 20;
