import type {
  CatalogCategory,
  CatalogFeedback,
  CatalogProduct,
  CatalogQueryResult,
} from "../types/catalog";
import { CATALOG_CATEGORY_LABELS } from "../const/catalog";

export type CatalogErrorReason = "network" | "http" | "unexpected-response";

export class CatalogApiError extends Error {
  readonly reason: CatalogErrorReason;

  constructor(reason: CatalogErrorReason) {
    super(`Catalog request failed: ${reason}`);
    this.name = "CatalogApiError";
    this.reason = reason;
  }
}

const CATALOG_ERROR_MESSAGES: Record<CatalogErrorReason, string> = {
  network:
    "No fue posible conectar con el servicio del catálogo. Verifica que el backend esté corriendo.",
  http: "El servicio del catálogo rechazó la consulta. Intenta de nuevo.",
  "unexpected-response":
    "El servicio del catálogo respondió con datos inválidos.",
};

const UNKNOWN_ERROR_MESSAGE =
  "No fue posible consultar el catálogo. Intenta de nuevo.";

const priceFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const STRING_FIELDS = [
  "id",
  "sku",
  "name",
  "brand",
  "description",
  "createdAt",
] as const;
const NUMBER_FIELDS = ["price", "stock", "rating"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCatalogProduct = (
  value: unknown,
  category: CatalogCategory
): value is CatalogProduct =>
  isRecord(value) &&
  value.category === category &&
  STRING_FIELDS.every((field) => typeof value[field] === "string") &&
  NUMBER_FIELDS.every((field) => Number.isFinite(value[field])) &&
  Array.isArray(value.tags);

export const isCatalogCategory = (value: string): value is CatalogCategory =>
  Object.hasOwn(CATALOG_CATEGORY_LABELS, value);

export const toCatalogProducts = (
  body: unknown,
  category: CatalogCategory
): CatalogProduct[] => {
  const products = isRecord(body) ? body.products : undefined;
  if (
    !Array.isArray(products) ||
    !products.every((product) => isCatalogProduct(product, category))
  ) {
    throw new CatalogApiError("unexpected-response");
  }
  return products;
};

export const describeCatalogError = (error: unknown): CatalogFeedback => ({
  kind: "error",
  text:
    error instanceof CatalogApiError
      ? CATALOG_ERROR_MESSAGES[error.reason]
      : UNKNOWN_ERROR_MESSAGE,
});

export const formatPrice = (price: number): string =>
  priceFormatter.format(price);

export const estimatePayloadSizeKb = (payload: unknown): number =>
  Math.round(new TextEncoder().encode(JSON.stringify(payload)).length / 1024);

export const describeCatalogResult = ({
  category,
  products,
  source,
}: CatalogQueryResult): CatalogFeedback => {
  const label = CATALOG_CATEGORY_LABELS[category];
  const text =
    source === "cache"
      ? `${products.length} productos de ${label} recuperados desde la caché de IndexedDB.`
      : `${products.length} productos de ${label} consultados al servicio y guardados en caché.`;
  return { kind: "success", text };
};
