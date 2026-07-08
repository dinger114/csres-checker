import { ref } from 'vue'
import type { StandardResult } from '../types'

const CACHE_KEY = 'csres-query-cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const MAX_CACHE_SIZE = 1000

interface CacheEntry {
  data: StandardResult[]
  timestamp: number
}

export function useCache() {
  const cache = ref<Map<string, CacheEntry>>(loadCache())

  function loadCache(): Map<string, CacheEntry> {
    try {
      const saved = localStorage.getItem(CACHE_KEY)
      if (!saved) return new Map()
      const entries: [string, CacheEntry][] = JSON.parse(saved)
      const map = new Map(entries)
      // Clean expired entries
      const now = Date.now()
      for (const [key, entry] of map) {
        if (now - entry.timestamp > CACHE_TTL) {
          map.delete(key)
        }
      }
      return map
    } catch {
      return new Map()
    }
  }

  function saveCache() {
    const entries = Array.from(cache.value.entries())
    // Limit cache size
    if (entries.length > MAX_CACHE_SIZE) {
      // Sort by timestamp, keep newest
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      cache.value = new Map(entries.slice(0, MAX_CACHE_SIZE))
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(cache.value.entries())))
  }

  function normalizeKey(keyword: string): string {
    return keyword.toLowerCase().replace(/\s+/g, '').replace(/[–—]/g, '-')
  }

  function get(keyword: string): StandardResult[] | null {
    const key = normalizeKey(keyword)
    const entry = cache.value.get(key)
    if (!entry) return null
    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.value.delete(key)
      return null
    }
    return entry.data
  }

  function set(keyword: string, data: StandardResult[]) {
    if (data.length === 0) return
    const key = normalizeKey(keyword)
    cache.value.set(key, {
      data,
      timestamp: Date.now(),
    })
    saveCache()
  }

  function clear() {
    cache.value.clear()
    localStorage.removeItem(CACHE_KEY)
  }

  function size(): number {
    return cache.value.size
  }

  return { get, set, clear, size }
}
