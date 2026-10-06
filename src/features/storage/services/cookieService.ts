import type { CookieOptions, CookieStorageService } from '../types/storageTypes';

export class CookieService implements CookieStorageService {
  private defaultOptions: CookieOptions;

  constructor() {
    this.defaultOptions = {
      path: '/',
      sameSite: 'Lax',
      secure: false,
      httpOnly: false
    };
  }

  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
      console.warn('[Cookie] Document not available');
      return null;
    }
    const cookies = document.cookie.split(';');
    const prefix = name.startsWith('app_') ? '' : 'app_';
    const targetName = `${prefix}${name}`;
    
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === targetName) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  private setCookie(name: string, value: string, options: CookieOptions): void {
    if (typeof document === 'undefined') {
      console.warn('[Cookie] Document not available');
      return;
    }
    
    const prefix = name.startsWith('app_') ? '' : 'app_';
    const cookieName = `${prefix}${name}`;
    let cookieString = `${encodeURIComponent(cookieName)}=${encodeURIComponent(value)}`;

    if (options.expires) {
      const expiryDate = new Date();
      if (typeof options.expires === 'number') {
        expiryDate.setTime(expiryDate.getTime() + options.expires * 24 * 60 * 60 * 1000);
      } else {
        expiryDate.setTime(options.expires.getTime());
      }
      cookieString += `; expires=${expiryDate.toUTCString()}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += '; secure';
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  private deleteCookie(name: string, options: Partial<CookieOptions> = {}): void {
    const deleteOptions: CookieOptions = {
      ...this.defaultOptions,
      ...options,
      expires: new Date(0)
    };
    this.setCookie(name, '', deleteOptions);
  }

  save<T>(key: string, value: T, options?: CookieOptions): boolean {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      const mergedOptions = { ...this.defaultOptions, ...options };
      this.setCookie(key, serialized, mergedOptions);
      return true;
    } catch (error) {
      console.error(`[Cookie] Error saving key "${key}":`, error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    try {
      const value = this.getCookie(key);
      if (value === null) {
        return null;
      }
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as unknown as T;
      }
    } catch (error) {
      console.error(`[Cookie] Error getting key "${key}":`, error);
      return null;
    }
  }

  remove(key: string, options?: Partial<CookieOptions>): boolean {
    try {
      this.deleteCookie(key, options);
      return true;
    } catch (error) {
      console.error(`[Cookie] Error removing key "${key}":`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      if (typeof document === 'undefined') {
        return false;
      }
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieName] = cookie.trim().split('=');
        if (cookieName.startsWith('app_')) {
          this.deleteCookie(cookieName.replace('app_', ''));
        }
      }
      return true;
    } catch (error) {
      console.error('[Cookie] Error clearing cookies:', error);
      return false;
    }
  }

  hasKey(key: string): boolean {
    return this.getCookie(key) !== null;
  }

  getAllKeys(): string[] {
    if (typeof document === 'undefined') {
      return [];
    }
    const cookies = document.cookie.split(';');
    const keys: string[] = [];
    
    for (const cookie of cookies) {
      const [cookieName] = cookie.trim().split('=');
      if (cookieName.startsWith('app_')) {
        keys.push(cookieName.replace('app_', ''));
      }
    }
    
    return keys;
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(
      this.getAllKeys().map((key) => [key, this.getCookie(key) ?? ''])
    );
  }

  isExpired(key: string): boolean {
    try {
      const value = this.getCookie(key);
      if (value === null) {
        return true;
      }
      const cookies = document.cookie.split(';');
      const prefix = key.startsWith('app_') ? '' : 'app_';
      const targetName = `${prefix}${key}`;
      
      for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === targetName) {
          const cookieParts = cookie.split(';');
          for (const part of cookieParts) {
            const [partName, partValue] = part.trim().split('=');
            if (partName.toLowerCase() === 'expires') {
              const expiryDate = new Date(partValue);
              return expiryDate.getTime() <= Date.now();
            }
          }
          return false;
        }
      }
      return true;
    } catch {
      return true;
    }
  }
}

export const cookieService = new CookieService();