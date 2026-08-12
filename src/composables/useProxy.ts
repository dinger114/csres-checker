import { ref } from 'vue'
import { FETCH_RETRIES, FETCH_TIMEOUT, PROXY_LIST } from '../utils/constants'

export function useProxy() {
  const activeProxy = ref(0)

  async function fetchWithRetry(url: string, retries = FETCH_RETRIES, timeout = FETCH_TIMEOUT): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      return res
    }
    catch (e) {
      clearTimeout(timer)
      if (retries > 0) {
        return fetchWithRetry(url, retries - 1, timeout)
      }
      throw e
    }
  }

  async function race(url: string): Promise<string | null> {
    const proxyUrls = PROXY_LIST.map(fn => fn(url))
    const tasks = proxyUrls.map(proxyUrl =>
      fetchWithRetry(proxyUrl)
        .then(res => res.text())
        .then(text => (text.length > 100 ? text : Promise.reject(new Error('empty')))),
    )

    try {
      const result = await Promise.any(tasks)
      return result
    }
    catch {
      return null
    }
  }

  async function fetchDirect(url: string): Promise<string | null> {
    try {
      const res = await fetchWithRetry(url)
      return await res.text()
    }
    catch {
      return null
    }
  }

  return {
    race,
    fetchDirect,
    activeProxy,
  }
}
