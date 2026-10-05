import type { WebStorageService } from '../types/storageTypes';

export class SessionStorageService implements WebStorageService {
  private prefix: string;

  constructor(prefix: string = 'app_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(this.getKey(key), serialized);
      return true;
    } catch (error) {
      console.error(`[SessionStorage] Error saving key "${key}":`, error);
      return false;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = sessionStorage.getItem(this.getKey(key));
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`[SessionStorage] Error getting key "${key}":`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<boolean> {
    try {
      sessionStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`[SessionStorage] Error removing key "${key}":`, error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('[SessionStorage] Error clearing storage:', error);
      return false;
    }
  }

  hasItem(key: string): boolean {
    return sessionStorage.getItem(this.getKey(key)) !== null;
  }

  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.replace(this.prefix, ''));
      }
    }
    return keys;
  }

  getSize(): number {
    let size = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }
}

export const sessionStorageService = new SessionStorageService();