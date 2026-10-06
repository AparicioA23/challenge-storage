import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import createCacheService, {
  CACHE_STORE_NAME,
  type CacheStore,
} from "../services/cacheService";
import type { CacheEntry } from "../types/cache";

vi.mock("../services/indexedDBService", () => ({ indexedDBService: {} }));

const NOW = new Date("2026-10-06T10:00:00.000Z");
const DEFAULT_TTL = 60_000;

const createStorageMock = (records: Record<string, CacheEntry> = {}) => {
  const storage = {
    save: vi.fn(async (_storeName: string, entry: object) => {
      const cacheEntry = entry as CacheEntry;
      records[cacheEntry.key] = cacheEntry;
    }),
    get: vi.fn(
      async (_storeName: string, key: IDBValidKey) =>
        records[key as string] ?? null
    ),
    remove: vi.fn(async (_storeName: string, key: IDBValidKey) => {
      delete records[key as string];
    }),
    getAllKeys: vi.fn(async () => Object.keys(records)),
  };
  return storage as typeof storage & CacheStore;
};

const buildEntry = (
  key: string,
  value: CacheEntry["value"],
  expiresAt: number
): CacheEntry => ({
  key,
  value,
  timestamp: NOW.getTime(),
  expiresAt,
});

describe("createCacheService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should save the entry under a namespaced key with the default ttl", async () => {
    // Arrange
    const storage = createStorageMock();
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    await cache.setItem("books", [{ id: 1 }]);

    // Assert
    expect(storage.save).toHaveBeenCalledWith(
      CACHE_STORE_NAME,
      buildEntry("catalog:books", [{ id: 1 }], NOW.getTime() + DEFAULT_TTL)
    );
  });

  it("should use the custom ttl when one is provided", async () => {
    // Arrange
    const storage = createStorageMock();
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    await cache.setItem("books", "value", 5_000);

    // Assert
    expect(storage.save).toHaveBeenCalledWith(
      CACHE_STORE_NAME,
      expect.objectContaining({ expiresAt: NOW.getTime() + 5_000 })
    );
  });

  it("should return the stored value when the entry has not expired", async () => {
    // Arrange
    const storage = createStorageMock({
      "catalog:books": buildEntry(
        "catalog:books",
        { total: 3 },
        NOW.getTime() + 1
      ),
    });
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    const value = await cache.getItem("books");

    // Assert
    expect(value).toEqual({ total: 3 });
  });

  it("should return null and remove the entry when it has expired", async () => {
    // Arrange
    const storage = createStorageMock({
      "catalog:books": buildEntry("catalog:books", { total: 3 }, NOW.getTime()),
    });
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    const value = await cache.getItem("books");

    // Assert
    expect(value).toBeNull();
    expect(storage.remove).toHaveBeenCalledWith(
      CACHE_STORE_NAME,
      "catalog:books"
    );
  });

  it("should return null when the key is not cached", async () => {
    // Arrange
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage: createStorageMock(),
    });

    // Act
    const value = await cache.getItem("books");

    // Assert
    expect(value).toBeNull();
  });

  it("should return null when IndexedDB fails while reading", async () => {
    // Arrange
    const storage = createStorageMock();
    storage.get.mockRejectedValueOnce(new Error("IndexedDB no disponible"));
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    const value = await cache.getItem("books");

    // Assert
    expect(value).toBeNull();
  });

  it("should not throw when IndexedDB fails while saving", async () => {
    // Arrange
    const storage = createStorageMock();
    storage.save.mockRejectedValueOnce(new Error("QuotaExceededError"));
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    const saving = cache.setItem("books", "value");

    // Assert
    await expect(saving).resolves.toBeUndefined();
  });

  it("should remove only the entries that belong to its namespace when clearing", async () => {
    // Arrange
    const expiresAt = NOW.getTime() + DEFAULT_TTL;
    const storage = createStorageMock({
      "catalog:books": buildEntry("catalog:books", 1, expiresAt),
      "catalog:clothing": buildEntry("catalog:clothing", 2, expiresAt),
      "profile:user": buildEntry("profile:user", 3, expiresAt),
    });
    const cache = createCacheService({
      nameSpace: "catalog",
      defaultTtl: DEFAULT_TTL,
      storage,
    });

    // Act
    await cache.clear();

    // Assert
    expect(storage.remove).toHaveBeenCalledTimes(2);
    expect(storage.remove).not.toHaveBeenCalledWith(
      CACHE_STORE_NAME,
      "profile:user"
    );
  });
});
