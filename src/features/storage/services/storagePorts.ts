import type {
  CachedData,
  StorageData,
  StorageMechanism,
  StoragePort,
  WebStorageService,
} from '../types/storageTypes';
import { safeStringify } from '@shared/utils/storageUtils';
import { localStorageService } from './localStorageService';
import { sessionStorageService } from './sessionStorageService';
import { cookieService } from './cookieService';
import { indexedDBService } from './indexedDBService';

const INDEXED_DB_STORE = 'cache';

function toDisplayValue(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return typeof value === 'object' && value !== null ? safeStringify(value) : String(value);
}

function createWebStoragePort(service: WebStorageService): StoragePort {
  return {
    readAll: async () => {
      const entries = await Promise.all(
        service.getAllKeys().map(async (key) => [key, toDisplayValue(await service.getItem(key))] as const)
      );
      return Object.fromEntries(entries);
    },
    setItem: (key, value) => service.setItem(key, value),
    getItem: (key) => service.getItem(key),
    removeItem: (key) => service.removeItem(key),
    clear: () => service.clear(),
  };
}

const cookiePort: StoragePort = {
  readAll: async () => cookieService.getAll(),
  setItem: async (key, value) => cookieService.save(key, value),
  getItem: async (key) => cookieService.get(key),
  removeItem: async (key) => cookieService.remove(key),
  clear: async () => cookieService.clear(),
};

const indexedDBPort: StoragePort = {
  readAll: async () => {
    const records = await indexedDBService.getAll<CachedData>(INDEXED_DB_STORE);
    return records.reduce<StorageData>((data, record) => ({ ...data, [record.key]: toDisplayValue(record.value) }), {});
  },
  setItem: async (key, value) => {
    await indexedDBService.save<CachedData>(INDEXED_DB_STORE, { key, value, timestamp: Date.now() });
    return true;
  },
  getItem: async (key) => (await indexedDBService.get<CachedData>(INDEXED_DB_STORE, key))?.value ?? null,
  removeItem: async (key) => {
    await indexedDBService.remove(INDEXED_DB_STORE, key);
    return true;
  },
  clear: async () => {
    await indexedDBService.clear(INDEXED_DB_STORE);
    return true;
  },
};

export const storagePorts: Record<StorageMechanism, StoragePort> = {
  localStorage: createWebStoragePort(localStorageService),
  sessionStorage: createWebStoragePort(sessionStorageService),
  cookie: cookiePort,
  indexedDB: indexedDBPort,
};
