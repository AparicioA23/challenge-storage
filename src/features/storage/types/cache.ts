export type CacheValue = object | string | number | boolean | null

export type CacheEntry<T extends CacheValue = CacheValue> = {
  key: string
  value: T
  timestamp: number
  expiresAt: number
}
