import {
  checkRateLimit,
  cleanup,
  corsHeadersFor,
  fetchTarget,
  isAllowedTarget,
  MAX_BODY_BYTES,
  rateLimitHeaders,
  readLimited,
} from './shared.js'

// 纯代理(无 cap / 无 KV 计数):damp-art-942a / yellow-bush-0938
export default {
  async fetch(request) {
    cleanup()

    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeadersFor(request) })
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const { allowed, retryAfter } = checkRateLimit(ip)
    if (!allowed) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'Content-Type': 'text/plain',
          // C22: 429 也带 X-RateLimit-*,前端可读到真实剩余配额
          ...rateLimitHeaders(ip),
          ...corsHeadersFor(request),
        },
      })
    }

    const target = url.searchParams.get('url')

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400, headers: corsHeadersFor(request) })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    }
    catch {
      return new Response('Invalid URL', { status: 400, headers: corsHeadersFor(request) })
    }

    if (!isAllowedTarget(targetUrl)) {
      return new Response('Host not allowed', { status: 403, headers: corsHeadersFor(request) })
    }

    try {
      const resp = await fetchTarget(targetUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      })

      // S8: 超上限拒绝
      const contentLength = Number(resp.headers.get('content-length') || 0)
      if (contentLength > MAX_BODY_BYTES) {
        return new Response('Response too large', {
          status: 502,
          headers: { 'Content-Type': 'text/plain', ...corsHeadersFor(request) },
        })
      }

      const buffer = await readLimited(resp.body, MAX_BODY_BYTES)

      const contentType = resp.headers.get('content-type') || ''
      let body
      if (contentType.includes('gbk') || contentType.includes('gb2312') || targetUrl.hostname.includes('csres.com')) {
        body = new TextDecoder('gbk').decode(buffer)
      }
      else {
        body = new TextDecoder('utf-8').decode(buffer)
      }

      return new Response(body, {
        status: resp.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...rateLimitHeaders(ip),
          ...corsHeadersFor(request),
        },
      })
    }
    catch {
      // S14: 不回显内部报错(含 readLimited 超限抛错 → 502)
      return new Response('Proxy error', { status: 502, headers: corsHeadersFor(request) })
    }
  },
}
