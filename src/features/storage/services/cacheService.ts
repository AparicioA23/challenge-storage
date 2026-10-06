/**
 * Protección S.A.
 */

import type { CacheEntry, CacheValue } from '../types/cache'
import type { IndexedDBStorageService } from '../types/storageTypes'
import { indexedDBService } from './indexedDBService'

export type CacheStore = Pick<IndexedDBStorageService, 'save' | 'get' | 'remove' | 'getAllKeys'>

type CacheServiceProps = {
  nameSpace: string
  defaultTtl: number
  storage?: CacheStore
}

export const CACHE_STORE_NAME = 'cache'

const createCacheService = ({ nameSpace, defaultTtl, storage = indexedDBService }: CacheServiceProps) => {
  const keyPrefix = `${nameSpace}:`

  const generateKey = (key: string): string => {
    return `${keyPrefix}${key}`
  }

  const hasExpired = (expiresAt: number): boolean => {
    return Date.now() >= expiresAt
  }

  const belongsToNameSpace = (storageKey: IDBValidKey): boolean => {
    return typeof storageKey === 'string' && storageKey.startsWith(keyPrefix)
  }

  const setItem = async <T extends CacheValue>(key: string, value: T, ttl?: number): Promise<void> => {
    try {
      const timestamp = Date.now()
      const entry: CacheEntry<T> = {
        key: generateKey(key),
        value,
        timestamp,
        expiresAt: timestamp + (ttl ?? defaultTtl)
      }
      await storage.save(CACHE_STORE_NAME, entry)
    } catch (error) {
      console.error('[Cache] Error setting item in cache:', error)
    }
  }

  const removeItem = async (key: string): Promise<void> => {
    try {
      await storage.remove(CACHE_STORE_NAME, generateKey(key))
    } catch (error) {
      console.error('[Cache] Error removing data:', error)
    }
  }

  const getItem = async <T extends CacheValue>(key: string): Promise<T | null> => {
    try {
      const entry = await storage.get<CacheEntry<T>>(CACHE_STORE_NAME, generateKey(key))
      if (!entry) return null

      if (hasExpired(entry.expiresAt)) {
        await removeItem(key)
        return null
      }
      return entry.value
    } catch (error) {
      console.error('[Cache] Error retrieving data:', error)
      return null
    }
  }

  const clear = async (): Promise<void> => {
    try {
      const storageKeys = await storage.getAllKeys(CACHE_STORE_NAME)
      const nameSpaceKeys = storageKeys.filter(belongsToNameSpace)
      await Promise.all(nameSpaceKeys.map((storageKey) => storage.remove(CACHE_STORE_NAME, storageKey)))
    } catch (error) {
      console.error('[Cache] Error clearing cache:', error)
    }
  }

  return {
    setItem,
    getItem,
    removeItem,
    clear
  }
}

export type CacheService = ReturnType<typeof createCacheService>

export default createCacheService
