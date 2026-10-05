import type {
  StorageResult,
  StorageError,
  IndexedDBConfig,
  IndexedDBStorageService,
  TransactionBounds,
  QueryOptions,
} from '../types/storageTypes';

const DEFAULT_CONFIG: IndexedDBConfig = {
  databaseName: 'BrowserStorageManager',
  version: 1,
  stores: [
    { name: 'userData', keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email', unique: true }] },
    { name: 'appPreferences', keyPath: 'key' },
    { name: 'sessionData', keyPath: 'sessionId' },
    { name: 'cache', keyPath: 'key', indexes: [{ name: 'expiresAt', keyPath: 'expiresAt' }] },
  ],
};

export class IndexedDBService implements IndexedDBStorageService {
  private db: IDBDatabase | null = null;
  private config: IndexedDBConfig;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(databaseName: string = DEFAULT_CONFIG.databaseName, version: number = DEFAULT_CONFIG.version) {
    this.config = { ...DEFAULT_CONFIG, databaseName, version };
    this.init();
  }

  init(): Promise<IDBDatabase> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este entorno'));
        return;
      }

      const request = window.indexedDB.open(this.config.databaseName, this.config.version);

      request.onerror = () => {
        reject(new Error(`Error al abrir IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        this.config.stores.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });

            storeConfig.indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique ?? false,
                multiEntry: index.multiEntry ?? false,
              });
            });
          }
        });
      };
    });

    return this.initPromise;
  }

  private async getDatabase(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.initPromise!;
  }

  private createError(code: string, message: string): StorageError {
    return { code, message, mechanism: 'indexedDB' };
  }

  private unwrap<T>(result: StorageResult<T>): T | undefined {
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error desconocido en IndexedDB');
    }
    return result.data;
  }

  private wrapTransaction<T>(bounds: TransactionBounds, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<StorageResult<T>> {
    return new Promise(async (resolve) => {
      try {
        const db = await this.getDatabase();
        const transaction = db.transaction(bounds.storeName, bounds.mode);
        const store = transaction.objectStore(bounds.storeName);
        const request = operation(store);

        request.onsuccess = () => {
          resolve({ success: true, data: request.result });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: this.createError('TRANSACTION_ERROR', request.error?.message ?? 'Error en la transacción'),
          });
        };
      } catch (err) {
        resolve({
          success: false,
          error: this.createError('INIT_ERROR', err instanceof Error ? err.message : 'Error desconocido'),
        });
      }
    });
  }

  async save<T extends object>(storeName: string, value: T): Promise<void> {
    this.unwrap(await this.wrapTransaction({ storeName, mode: 'readwrite' }, (store) => store.put(value)));
  }

  async get<T extends object = Record<string, unknown>>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const result = await this.wrapTransaction<T>({ storeName, mode: 'readonly' }, (store) => store.get(key));
    return this.unwrap(result) ?? null;
  }

  async getAll<T extends object = Record<string, unknown>>(storeName: string): Promise<T[]> {
    const result = await this.wrapTransaction<T[]>({ storeName, mode: 'readonly' }, (store) => store.getAll());
    return this.unwrap(result) ?? [];
  }

  async getAllKeys(storeName: string): Promise<IDBValidKey[]> {
    const result = await this.wrapTransaction({ storeName, mode: 'readonly' }, (store) => store.getAllKeys());
    return this.unwrap(result) ?? [];
  }

  async remove(storeName: string, key: IDBValidKey): Promise<void> {
    this.unwrap(await this.wrapTransaction({ storeName, mode: 'readwrite' }, (store) => store.delete(key)));
  }

  async clear(storeName: string): Promise<void> {
    this.unwrap(await this.wrapTransaction({ storeName, mode: 'readwrite' }, (store) => store.clear()));
  }

  async query<T extends object = Record<string, unknown>>(
    storeName: string,
    indexName: string,
    range: IDBValidKey | IDBKeyRange,
    limit?: number
  ): Promise<T[]> {
    return this.unwrap(await this.runQuery<T>(storeName, { indexName, range, limit })) ?? [];
  }

  private runQuery<T>(storeName: string, options: QueryOptions): Promise<StorageResult<T[]>> {
    return new Promise(async (resolve) => {
      try {
        const db = await this.getDatabase();
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        let request: IDBRequest<T[]>;

        if (options.indexName && options.range) {
          const index = store.index(options.indexName);
          request = index.getAll(options.range, options.limit);
        } else {
          request = store.getAll();
        }

        request.onsuccess = () => {
          resolve({ success: true, data: request.result });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: this.createError('QUERY_ERROR', request.error?.message ?? 'Error al consultar'),
          });
        };
      } catch (err) {
        resolve({
          success: false,
          error: this.createError('QUERY_ERROR', err instanceof Error ? err.message : 'Error desconocido'),
        });
      }
    });
  }

  async clearExpired(): Promise<StorageResult<number>> {
    return new Promise(async (resolve) => {
      try {
        const db = await this.getDatabase();
        const transaction = db.transaction('cache', 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('expiresAt');
        const now = Date.now();
        const range = IDBKeyRange.upperBound(now);
        const request = index.getAllKeys(range);

        request.onsuccess = () => {
          const expiredKeys = request.result;
          let deletedCount = 0;

          expiredKeys.forEach((key) => {
            const deleteRequest = store.delete(key);
            deleteRequest.onsuccess = () => {
              deletedCount++;
            };
          });

          resolve({ success: true, data: deletedCount });
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: this.createError('CLEAR_EXPIRED_ERROR', request.error?.message ?? 'Error al limpiar'),
          });
        };
      } catch (err) {
        resolve({
          success: false,
          error: this.createError('CLEAR_EXPIRED_ERROR', err instanceof Error ? err.message : 'Error desconocido'),
        });
      }
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const indexedDBService = new IndexedDBService();
export default IndexedDBService;
