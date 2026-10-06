import { useState, useCallback, useEffect, useMemo } from "react";
import type { StorageData, StorageMechanism } from "../types/storageTypes";
import { storagePorts } from "../services/storagePorts";
import { useNavigate } from "react-router-dom";

export interface StorageManagerOptions {
  onError?: (error: Error) => void;
  onDataChange?: (key: string, value: unknown) => void;
}

export type StorageManagerContext = ReturnType<typeof useStorageManager>;

type StorageSnapshots = Record<StorageMechanism, StorageData>;

const MECHANISMS = Object.keys(storagePorts) as StorageMechanism[];

const EMPTY_SNAPSHOTS: StorageSnapshots = {
  localStorage: {},
  sessionStorage: {},
  cookie: {},
  indexedDB: {},
};

async function readSnapshot(mechanism: StorageMechanism): Promise<StorageData> {
  try {
    return await storagePorts[mechanism].readAll();
  } catch (err) {
    console.error(
      `[StorageManager] No se pudo leer ${mechanism}:`,
      err instanceof Error ? err.message : err
    );
    return {};
  }
}

export function useStorageManager({
  onError,
  onDataChange,
}: StorageManagerOptions = {}) {
  const [activeStorage, setActiveStorage] =
    useState<StorageMechanism>("localStorage");
  const [snapshots, setSnapshots] = useState<StorageSnapshots>(EMPTY_SNAPSHOTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const storedKeys = useMemo(
    () => Object.keys(snapshots[activeStorage]),
    [snapshots, activeStorage]
  );

  const reportError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      const errorMessage = err instanceof Error ? err.message : fallbackMessage;
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    },
    [onError]
  );

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.all(MECHANISMS.map(readSnapshot));
      setSnapshots(
        Object.fromEntries(
          MECHANISMS.map((mechanism, i) => [mechanism, results[i]])
        ) as StorageSnapshots
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const runOperation = useCallback(
    async <R>(
      operation: () => Promise<R>,
      fallbackMessage: string,
      fallback: R
    ) => {
      setError(null);
      try {
        return await operation();
      } catch (err) {
        reportError(err, fallbackMessage);
        return fallback;
      }
    },
    [reportError]
  );

  const setItem = useCallback(
    (key: string, value: unknown) =>
      runOperation(
        async () => {
          const saved = await storagePorts[activeStorage].setItem(key, value);
          if (saved) {
            onDataChange?.(key, value);
            await loadSnapshots();
          }
          return saved;
        },
        "Error al guardar datos",
        false
      ),
    [activeStorage, loadSnapshots, onDataChange, runOperation]
  );

  const getItem = useCallback(
    (key: string) =>
      runOperation(
        () => storagePorts[activeStorage].getItem(key),
        "Error al recuperar datos",
        null
      ),
    [activeStorage, runOperation]
  );

  const removeItem = useCallback(
    (key: string) =>
      runOperation(
        async () => {
          const removed = await storagePorts[activeStorage].removeItem(key);
          if (removed) await loadSnapshots();
          return removed;
        },
        "Error al eliminar datos",
        false
      ),
    [activeStorage, loadSnapshots, runOperation]
  );

  const clear = useCallback(
    () =>
      runOperation(
        async () => {
          const cleared = await storagePorts[activeStorage].clear();
          if (cleared) await loadSnapshots();
          return cleared;
        },
        "Error al limpiar almacenamiento",
        false
      ),
    [activeStorage, loadSnapshots, runOperation]
  );

  const switchStorage = useCallback((storage: StorageMechanism) => {
    setActiveStorage(storage);
    setError(null);
  }, []);

  useEffect(() => {
    if (activeStorage) {
      navigate(`/${activeStorage}`);
    }
  }, [activeStorage, navigate]);

  return {
    activeStorage,
    snapshots,
    storedKeys,
    isLoading,
    error,
    setItem,
    getItem,
    removeItem,
    clear,
    switchStorage,
    refresh: loadSnapshots,
  };
}
