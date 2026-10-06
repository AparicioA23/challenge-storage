import { problems } from '../http/problems.ts';
import { CATALOG_CATEGORIES, type CatalogCategory } from './catalogTypes.ts';

function isCatalogCategory(value: string): value is CatalogCategory {
  return (CATALOG_CATEGORIES as readonly string[]).includes(value);
}

export function parseCategory(searchParams: URLSearchParams): CatalogCategory {
  const category = searchParams.get('category')?.trim().toLowerCase() ?? '';
  if (!isCatalogCategory(category)) {
    throw problems.validation([
      { field: 'category', message: `Debe ser una de: ${CATALOG_CATEGORIES.join(', ')}.` },
    ]);
  }
  return category;
}
