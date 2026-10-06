export type CatalogCategory = "electronics" | "books" | "clothing";

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: CatalogCategory;
  brand: string;
  price: number;
  stock: number;
  rating: number;
  tags: string[];
  description: string;
  createdAt: string;
}

export interface CatalogApi {
  getProductsByCategory(
    category: CatalogCategory,
    signal?: AbortSignal
  ): Promise<CatalogProduct[]>;
}

export type CatalogSource = "cache" | "service";

export interface CatalogQueryResult {
  category: CatalogCategory;
  products: CatalogProduct[];
  source: CatalogSource;
  elapsedMs: number;
}

export interface CatalogFeedback {
  kind: "success" | "error";
  text: string;
}
