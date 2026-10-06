import type {
  CatalogApi,
  CatalogCategory,
  CatalogProduct,
} from "../types/catalog";
import { CatalogApiError, toCatalogProducts } from "./catalogHelpers";

const DEFAULT_CATALOG_API_URL = "http://localhost:4000";

export class HttpCatalogApi implements CatalogApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async getProductsByCategory(
    category: CatalogCategory,
    signal?: AbortSignal
  ): Promise<CatalogProduct[]> {
    const query = new URLSearchParams({ category });
    const response = await this.send(`/api/catalog/products?${query}`, signal);
    if (!response.ok) {
      throw new CatalogApiError("http");
    }
    const body = await response.json().catch(() => null);
    return toCatalogProducts(body, category);
  }

  private async send(path: string, signal?: AbortSignal): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new CatalogApiError("network");
    }
  }
}

export const catalogApi: CatalogApi = new HttpCatalogApi(
  import.meta.env.VITE_API_URL ?? DEFAULT_CATALOG_API_URL
);
