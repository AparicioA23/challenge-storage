import { useState, useEffect, useCallback, useRef } from 'react';
import type { StorageHookTuple, StorageResult, WebStorageMechanism, WebStorageService } from '../types/storageTypes';
import { localStorageService } from '../services/localStorageService';
import { sessionStorageService } from '../services/sessionStorageService';
import { indexedDBService } from '../services/indexedDBService';

const services: Record<WebStorageMechanism, WebStorageService> = {
  localStorage: localStorageService,
  sessionStorage: sessionStorageService,
};

function getService(mechanism: WebStorageMechanism): WebStorageService {
  const service = services[mechanism];
  if (!service) {
    throw new Error(`Mecanismo de almacenamiento no soportado: ${mechanism}`);
  }
  return service;
}

function reportHookError(operation: string, err: unknown): void {
  console.error(`[useStorage] Error al ${operation}:`, err instanceof Error ? err.message : err);
}

export function useStorage<T = unknown>(
  key: string,
  defaultValue: NoInfer<T>,
  mechanism: WebStorageMechanism = 'localStorage',
  syncAcrossTabs = false
): StorageHookTuple<T> {
  const [data, setDataState] = useState<T>(defaultValue);
  const serviceRef = useRef<WebStorageService>(getService(mechanism));
  const keyRef = useRef(key);

  keyRef.current = key;

  const loadData = useCallback(async () => {
    try {
      const stored = await serviceRef.current.getItem<T>(keyRef.current);
      setDataState(stored ?? defaultValue);
    } catch (err) {
      reportHookError('cargar datos', err);
      setDataState(defaultValue);
    }
  }, [defaultValue]);

  const setData = useCallback(async (value: T | ((prev: T) => T)) => {
    try {
      const finalValue = typeof value === 'function'
        ? (value as (prev: T) => T)(data)
        : value;

      const saved = await serviceRef.current.setItem(keyRef.current, finalValue);

      if (saved) {
        setDataState(finalValue);
      }
    } catch (err) {
      reportHookError('guardar datos', err);
    }
  }, [data]);

  const removeData = useCallback(async () => {
    try {
      const removed = await serviceRef.current.removeItem(keyRef.current);

      if (removed) {
        setDataState(defaultValue);
      }
    } catch (err) {
      reportHookError('eliminar datos', err);
    }
  }, [defaultValue]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!syncAcrossTabs || mechanism !== 'localStorage') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === keyRef.current) {
        if (event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            setDataState(parsed);
          } catch {
            setDataState(event.newValue as T);
          }
        } else {
          setDataState(defaultValue);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncAcrossTabs, mechanism, defaultValue]);

  return [data, setData, removeData];
}

export function useMultipleStorage<T extends Record<string, unknown>>(
  keys: (keyof T & string)[],
  mechanism: WebStorageMechanism = 'localStorage'
): Record<keyof T, StorageHookTuple<T[keyof T] | null>> {
  const result = {} as Record<keyof T, StorageHookTuple<T[keyof T] | null>>;

  keys.forEach((key) => {
    result[key] = useStorage<T[keyof T] | null>(key, null, mechanism);
  });

  return result;
}

export function useStorageSync(
  keys: string[],
  mechanism: WebStorageMechanism = 'localStorage'
): { sync: () => Promise<void>; isSyncing: boolean } {
  const [isSyncing, setIsSyncing] = useState(false);
  const service = getService(mechanism);

  const sync = useCallback(async () => {
    setIsSyncing(true);

    try {
      const storedKeys = service.getAllKeys();
      const keysToSync = keys.filter(k => storedKeys.includes(k));

      await Promise.all(
        keysToSync.map(async (key) => {
          const value = await service.getItem(key);
          if (value !== null) {
            const otherMechanism = mechanism === 'localStorage' ? 'sessionStorage' : 'localStorage';
            const otherService = getService(otherMechanism);
            await otherService.setItem(key, value);
          }
        })
      );
    } finally {
      setIsSyncing(false);
    }
  }, [keys, mechanism, service]);

  return { sync, isSyncing };
}

export function useClearExpired(): { clear: () => Promise<number>; isClearing: boolean } {
  const [isClearing, setIsClearing] = useState(false);

  const clear = useCallback(async (): Promise<number> => {
    setIsClearing(true);

    try {
      const result: StorageResult<number> = await indexedDBService.clearExpired();
      return result.success ? result.data ?? 0 : 0;
    } finally {
      setIsClearing(false);
    }
  }, []);

  return { clear, isClearing };
}

export default useStorage;
