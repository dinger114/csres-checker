import {
  ALLOWED_HOSTS,
  MAX_BODY_BYTES,
  corsHeadersFor,
  isAllowedTarget,
  fetchTarget,
  RATE_LIMIT,
  rateLimitMap,
  checkRateLimit,
  cleanup,
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
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': String(RATE_LIMIT - (rateLimitMap.get(ip)?.length || 0)),
          ...corsHeadersFor(request),
        },
      })
    }
    catch {
      // S14: 不回显内部报错
      return new Response('Proxy error', { status: 502, headers: corsHeadersFor(request) })
    }
  },
}

// 从 ReadableStream 读取,最多 maxBytes 字节(S8)
async function readLimited(stream, maxBytes) {
  if (!stream)
    return new Uint8Array(0)
  const reader = stream.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    if (total + value.byteLength > maxBytes) {
      await reader.cancel().catch(() => {})
      break
    }
    chunks.push(value)
    total += value.byteLength
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}
