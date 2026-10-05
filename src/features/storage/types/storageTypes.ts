export interface UserData {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
  lastLoginAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notificationsEnabled: boolean;
  newsletterSubscribed: boolean;
}

export interface AppPreferences {
  sidebarCollapsed: boolean;
  viewMode: 'grid' | 'list';
  itemsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, unknown>;
  recentSearches: string[];
  bookmarks: string[];
}

export interface SessionData {
  sessionId: string;
  userId: string;
  token: string;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivityAt: string;
}

export interface CachedData<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

export interface StorageItem<T = unknown> {
  key: string;
  value: T;
  metadata?: {
    createdAt: number;
    updatedAt: number;
    expiresAt?: number;
  };
}

export type StorageMechanism = 'localStorage' | 'sessionStorage' | 'cookie' | 'indexedDB';

export type WebStorageMechanism = Extract<StorageMechanism, 'localStorage' | 'sessionStorage'>;

export type StorageType = StorageMechanism;

export type StorageOperation = 'get' | 'set' | 'remove' | 'clear';

export type StorageData = Record<string, string | number | boolean>;

export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  expiresIn?: number;
  namespace?: string;
}

export interface StorageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

export interface StorageError {
  code?: string;
  message: string;
  mechanism?: StorageMechanism;
  operation?: StorageOperation;
  cause?: unknown;
  timestamp?: Date;
}

export interface IndexedDBConfig {
  databaseName: string;
  version: number;
  stores: IndexedDBStore[];
}

export interface IndexedDBStore {
  name: string;
  keyPath: string;
  indexes?: IndexedDBIndex[];
}

export interface IndexedDBIndex {
  name: string;
  keyPath: string;
  unique?: boolean;
  multiEntry?: boolean;
}

export interface TransactionBounds {
  storeName: string;
  mode: IDBTransactionMode;
}

export interface QueryOptions {
  indexName?: string;
  range?: IDBValidKey | IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
}

export interface WebStorageService {
  setItem<T>(key: string, value: T): Promise<boolean>;
  getItem<T>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  hasItem(key: string): boolean;
  getAllKeys(): string[];
}

export interface CookieOptions {
  days?: number;
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  httpOnly?: boolean;
}

export interface CookieStorageService {
  save<T>(key: string, value: T, options?: CookieOptions): boolean;
  get<T>(key: string): T | null;
  remove(key: string, options?: Partial<CookieOptions>): boolean;
  getAll(): Record<string, string>;
  clear(): boolean;
}

export interface IndexedDBStorageService {
  init(): Promise<IDBDatabase>;
  save<T extends object>(storeName: string, value: T): Promise<void>;
  get<T extends object = Record<string, unknown>>(storeName: string, key: IDBValidKey): Promise<T | null>;
  getAll<T extends object = Record<string, unknown>>(storeName: string): Promise<T[]>;
  getAllKeys(storeName: string): Promise<IDBValidKey[]>;
  remove(storeName: string, key: IDBValidKey): Promise<void>;
  clear(storeName: string): Promise<void>;
  query<T extends object = Record<string, unknown>>(
    storeName: string,
    indexName: string,
    range: IDBValidKey | IDBKeyRange,
    limit?: number
  ): Promise<T[]>;
  close(): Promise<void>;
}

export interface StoragePort {
  readAll(): Promise<StorageData>;
  setItem(key: string, value: unknown): Promise<boolean>;
  getItem(key: string): Promise<unknown>;
  removeItem(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export type StorageHookTuple<T> = [
  value: T,
  setValue: (value: T | ((prev: T) => T)) => Promise<void>,
  removeValue: () => Promise<void>,
];
