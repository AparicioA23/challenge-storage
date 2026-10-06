import type { StorageData, StorageError, StorageOperation, WebStorageMechanism } from '@features/storage/types/storageTypes';

const DEFAULT_ENCODING = 'utf-8';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

export function serializeData<T>(data: T): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    throw new Error(`Error al serializar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export function deserializeData<T>(data: string): T {
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    throw new Error(`Error al deserializar datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
}

export function createStorageError(
  operation: StorageOperation,
  message: string,
  cause?: Error
): StorageError {
  const error = new Error(message) as StorageError;
  error.operation = operation;
  error.cause = cause;
  error.timestamp = new Date();
  return error;
}

export function handleStorageError(
  error: unknown,
  operation: StorageOperation,
  fallbackValue?: unknown
): { success: false; error: StorageError } | { success: true; data: typeof fallbackValue } {
  if (error instanceof Error) {
    const storageError = createStorageError(operation, error.message, error);
    console.error(`[Storage] Error en operación ${operation}:`, storageError);
    return { success: false, error: storageError };
  }
  const unknownError = createStorageOperationError(operation, String(error));
  return { success: false, error: unknownError };
}

function createStorageOperationError(operation: StorageOperation, message: string): StorageError {
  const error = new Error(message) as StorageError;
  error.operation = operation;
  error.timestamp = new Date();
  return error;
}

export function validateStorageData(data: unknown): data is StorageData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return Object.keys(record).every(key => {
    const value = record[key];
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  });
}

export function estimateStorageUsage(data: string): number {
  return new Blob([data]).size;
}

export function isStorageAvailable(type: WebStorageMechanism): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

export function getStorageQuota(): { used: number; available: number; percentage: number } {
  if (navigator.storage && navigator.storage.estimate) {
    return navigator.storage.estimate().then(estimate => {
      const usage = estimate.usage || 0;
      const quota = estimate.quota || MAX_STORAGE_SIZE;
      return {
        used: usage,
        available: quota - usage,
        percentage: Math.round((usage / quota) * 100)
      };
    }).catch(() => ({
      used: 0,
      available: MAX_STORAGE_SIZE,
      percentage: 0
    })) as unknown as { used: number; available: number; percentage: number };
  }
  return {
    used: 0,
    available: MAX_STORAGE_SIZE,
    percentage: 0
  };
}

export function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

export function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseCookieString(cookieString: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieString || typeof cookieString !== 'string') {
    return cookies;
  }
  cookieString.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

export function generateStorageKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const execute = async () => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          reject(error);
        } else {
          setTimeout(execute, delay * attempts);
        }
      }
    };
    execute();
  });
}

export function createStorageValidator<T>(schema: Record<keyof T, (value: unknown) => boolean>) {
  return (data: unknown): data is T => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const record = data as Record<string, unknown>;
    return Object.keys(schema).every(key => schema[key as keyof T](record[key]));
  };
}

export const STORAGE_CONSTANTS = {
  MAX_SIZE: MAX_STORAGE_SIZE,
  DEFAULT_PREFIX: 'app',
  ENCODING: DEFAULT_ENCODING,
  EXPIRY_FORMAT: 'expires=',
  COOKIE_SEPARATOR: '; ',
  KEY_VALUE_SEPARATOR: '='
} as const;