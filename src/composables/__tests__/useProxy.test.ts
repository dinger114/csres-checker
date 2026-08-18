import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FETCH_RETRIES, FETCH_TIMEOUT, PROXY_LIST } from '../../utils/constants'
import { useProxy } from '../useProxy'

describe('useProxy', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  describe('race', () => {
    it('returns response text from the fastest successful proxy', async () => {
      const text = 'a'.repeat(200)
      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(text),
      })

      const { race } = useProxy()
      const result = race('https://example.com')

      // let the fetch calls resolve
      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBe(text)
      // all three proxy endpoints should have been tried in parallel
      expect(globalThis.fetch).toHaveBeenCalledTimes(PROXY_LIST.length)
    })

    it('tries all proxy endpoints concurrently', async () => {
      const text = 'a'.repeat(200)
      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(text),
      })

      const { race } = useProxy()
      const result = race('https://example.com')

      vi.advanceTimersByTime(0)
      await result

      const urls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: any[]) => call[0],
      )
      // each proxy list entry should produce a different URL
      const uniqueUrls = new Set(urls)
      expect(uniqueUrls.size).toBe(PROXY_LIST.length)
    })

    it('rejects responses shorter than 100 chars', async () => {
      const shortText = 'short'
      const longText = 'a'.repeat(200)

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ text: () => Promise.resolve(shortText) })
        }
        return Promise.resolve({ text: () => Promise.resolve(longText) })
      })

      const { race } = useProxy()
      const result = race('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBe(longText)
    })

    it('returns null when all proxies fail', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'))

      const { race } = useProxy()
      const result = race('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBeNull()
    })

    it('returns null when all proxies return short responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('tiny'),
      })

      const { race } = useProxy()
      const result = race('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBeNull()
    })
  })

  describe('fetchDirect', () => {
    it('returns response text on success', async () => {
      const text = 'direct response'
      globalThis.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(text),
      })

      const { fetchDirect } = useProxy()
      const result = fetchDirect('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBe(text)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('returns null on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fail'))

      const { fetchDirect } = useProxy()
      const result = fetchDirect('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBeNull()
    })

    it('retries up to FETCH_RETRIES times before failing', async () => {
      globalThis.fetch = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({
          text: () => Promise.resolve('ok'),
        })

      const { fetchDirect } = useProxy()
      const result = fetchDirect('https://example.com')

      vi.advanceTimersByTime(0)
      const value = await result

      expect(value).toBe('ok')
      expect(globalThis.fetch).toHaveBeenCalledTimes(1 + FETCH_RETRIES)
    })

    it('aborts and retries after timeout', async () => {
      let fetchCount = 0
      globalThis.fetch = vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
        fetchCount++
        if (fetchCount <= 1) {
          // first call: simulate timeout by never resolving before abort
          return new Promise((_resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              reject(new Error('Aborted'))
            })
          })
        }
        return Promise.resolve({ text: () => Promise.resolve('ok after retry') })
      })

      const { fetchDirect } = useProxy()
      const result = fetchDirect('https://example.com')

      // advance past the timeout to trigger abort
      vi.advanceTimersByTime(FETCH_TIMEOUT + 1)
      // let the retry resolve
      vi.advanceTimersByTime(0)

      const value = await result

      expect(value).toBe('ok after retry')
      expect(fetchCount).toBeGreaterThanOrEqual(2)
    })
  })
})
