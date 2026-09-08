import { ref } from 'vue'
import { FETCH_RETRIES, FETCH_TIMEOUT, PROXY_LIST } from '../utils/constants'

// 代理返回被判为「有效」的最小字节数(M10):避免 WAF/验证码/错误页(常 >100 字节)被误当有效结果(C3)
const MIN_VALID_BODY_BYTES = 200

// 校验代理返回是否为有效响应(C3):必须 res.ok,且 body 达到最小长度。
// 避免 404/WAF/验证码页(常 >100 字节但无有效内容)被误当有效结果触发错误 fallback。
function isValidProxyResponse(res: Response, text: string): boolean {
  if (!res.ok)
    return false
  return text.trimStart().length >= MIN_VALID_BODY_BYTES
}

export function useProxy() {
  async function fetchWithRetry(url: string, retries = FETCH_RETRIES, timeout = FETCH_TIMEOUT, headers?: Record<string, string>): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch(url, { signal: controller.signal, headers })
      clearTimeout(timer)
      return res
    }
    catch (e) {
      clearTimeout(timer)
      if (retries > 0) {
        return fetchWithRetry(url, retries - 1, timeout, headers)
      }
      throw e
    }
  }

  async function race(url: string): Promise<string | null> {
    const proxyUrls = PROXY_LIST.map(fn => fn(url))
    // 代理竞速:api/api2 是简化代理,不校验 cap-token,
    // 不附带自定义头可避免 OPTIONS preflight(CORS 源头)。
    const tasks = proxyUrls.map(proxyUrl =>
      fetchWithRetry(proxyUrl, FETCH_RETRIES, FETCH_TIMEOUT)
        .then(async (res) => {
          const text = await res.text()
          if (isValidProxyResponse(res, text))
            return text
          throw new Error(`invalid proxy response: ${res.status}`)
        }),
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
  }
}
