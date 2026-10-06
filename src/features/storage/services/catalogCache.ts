import createCacheService from "./cacheService";
import {
  CATALOG_CACHE_NAMESPACE,
  CATALOG_CACHE_TTL_MS,
} from "../const/catalog";

export const catalogCache = createCacheService({
  nameSpace: CATALOG_CACHE_NAMESPACE,
  defaultTtl: CATALOG_CACHE_TTL_MS,
});
