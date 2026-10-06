export const CATALOG_CATEGORIES = ['electronics', 'books', 'clothing'] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

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

export interface ProductCatalog {
  listByCategory(category: CatalogCategory): CatalogProduct[];
}

export type Wait = (ms: number) => Promise<void>;
