import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from '../history'

const storage = new Map<string, string>()

describe('useHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
    })
  })

  it('adds a keyword entry to the front', () => {
    const store = useHistoryStore()
    store.add(['GB 50010'])
    store.add(['GB 50011'])
    expect(store.history[0]).toBe('GB 50011')
    expect(store.history).toHaveLength(2)
  })

  it('deduplicates identical entries', () => {
    const store = useHistoryStore()
    store.add(['GB 50010'])
    store.add(['GB 50011'])
    store.add(['GB 50010'])
    expect(store.history).toHaveLength(2)
    expect(store.history[0]).toBe('GB 50010')
  })

  it('removes and clears entries', () => {
    const store = useHistoryStore()
    store.add(['GB 50010'])
    store.add(['GB 50011'])
    store.remove(0)
    expect(store.history).toHaveLength(1)
    store.clear()
    expect(store.history).toHaveLength(0)
  })
})
