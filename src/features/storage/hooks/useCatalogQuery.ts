import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { StorageManagerContext } from "./useStorageManager";
import type {
  CatalogApi,
  CatalogCategory,
  CatalogFeedback,
  CatalogProduct,
  CatalogQueryResult,
} from "../types/catalog";
import type { CacheService } from "../services/cacheService";
import {
  CATALOG_PREVIEW_ROWS,
  DEFAULT_CATALOG_CATEGORY,
} from "../const/catalog";
import {
  describeCatalogError,
  describeCatalogResult,
  estimatePayloadSizeKb,
  isCatalogCategory,
} from "../services/catalogHelpers";
import { catalogApi as defaultCatalogApi } from "../services/catalogApi";
import { catalogCache } from "../services/catalogCache";

type CatalogCache = Pick<CacheService, "getItem" | "setItem">;

interface CatalogQueryDependencies {
  catalogApi: CatalogApi;
  cache: CatalogCache;
}

const DEFAULT_DEPENDENCIES: CatalogQueryDependencies = {
  catalogApi: defaultCatalogApi,
  cache: catalogCache,
};

const useCatalogQuery = ({
  catalogApi,
  cache,
}: CatalogQueryDependencies = DEFAULT_DEPENDENCIES) => {
  const { refresh } = useOutletContext<StorageManagerContext>();
  const [category, setCategory] = useState<CatalogCategory>(
    DEFAULT_CATALOG_CATEGORY
  );
  const [result, setResult] = useState<CatalogQueryResult | null>(null);
  const [feedback, setFeedback] = useState<CatalogFeedback | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const onChangeCategory = useCallback((value: string) => {
    if (isCatalogCategory(value)) setCategory(value);
  }, []);

  const fetchAndCache = useCallback(
    async (signal: AbortSignal): Promise<CatalogProduct[]> => {
      const products = await catalogApi.getProductsByCategory(category, signal);
      await cache.setItem(category, products);
      await refresh();
      return products;
    },
    [cache, catalogApi, category, refresh]
  );

  const loadProducts = useCallback(
    async (signal: AbortSignal): Promise<CatalogQueryResult> => {
      const startedAt = performance.now();
      const cachedProducts = await cache.getItem<CatalogProduct[]>(category);
      const source = cachedProducts ? "cache" : "service";
      const products = cachedProducts ?? (await fetchAndCache(signal));
      return {
        category,
        products,
        source,
        elapsedMs: Math.round(performance.now() - startedAt),
      };
    },
    [cache, category, fetchAndCache]
  );

  const query = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsQuerying(true);
    setFeedback(null);
    try {
      const queryResult = await loadProducts(controller.signal);
      if (controller.signal.aborted) return;
      setResult(queryResult);
      setFeedback(describeCatalogResult(queryResult));
    } catch (error) {
      if (!controller.signal.aborted) setFeedback(describeCatalogError(error));
    } finally {
      if (!controller.signal.aborted) setIsQuerying(false);
    }
  }, [loadProducts]);

  const previewProducts = useMemo(
    () => result?.products.slice(0, CATALOG_PREVIEW_ROWS) ?? [],
    [result]
  );
  const payloadSizeKb = useMemo(
    () => (result ? estimatePayloadSizeKb(result.products) : 0),
    [result]
  );

  return {
    category,
    onChangeCategory,
    query,
    isQuerying,
    feedback,
    result,
    previewProducts,
    payloadSizeKb,
  };
};

export default useCatalogQuery;
