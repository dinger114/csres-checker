import { generateChallenge, validateChallenge } from 'capjs-core'
import {
  checkRateLimit,
  cleanup,
  corsHeadersFor,
  fetchTarget,
  isAllowedTarget,
  MAX_BODY_BYTES,
  parseCount,
  rateLimitHeaders,
  readLimited,
  touchRateLimit,
} from './shared.js'

// ===== Cap permit tokenKey 推导(id:sha256(ver)) =====
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function deriveTokenKey(token) {
  if (typeof token !== 'string')
    return null
  const parts = token.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1])
    return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts[1]))
  return `${parts[0]}:${bufToHex(digest)}`
}

export default {
  async fetch(request, env) {
    cleanup()

    const url = new URL(request.url)

    // 处理 CORS 预检请求(S6:CORS 头按来源收窄)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeadersFor(request) })
    }

    // ===== 计数 API =====

    // GET /api/count - 读取计数
    if (url.pathname === '/api/count') {
      try {
        const value = await env.COUNTER_KV.get('queryCount')
        const count = parseCount(value)
        return new Response(JSON.stringify({ count }), {
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
      catch {
        return new Response(JSON.stringify({ error: 'internal_error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
    }

    // ===== Cap 挑战 API（Cap Core） =====

    if (url.pathname === '/cap/challenge' && request.method === 'POST') {
      try {
        const ch = await generateChallenge(env.CAP_SECRET, {
          scope: 'csres-run',
          expiresMs: 600_000,
          challengeCount: 20,
          challengeDifficulty: 3,
        })
        return new Response(JSON.stringify({ challenge: ch.challenge, token: ch.token, expires: ch.expires }), {
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
      catch {
        return new Response(JSON.stringify({ error: 'internal_error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
    }

    if (url.pathname === '/cap/redeem' && request.method === 'POST') {
      try {
        const body = await request.json()
        const result = await validateChallenge(env.CAP_SECRET, body, {
          scope: 'csres-run',
          tokenTtlMs: 900_000,
          consumeNonce: async (sigHex, ttlMs) => {
            if (await env.CAPTCHA_KV.get(`cap:${sigHex}`))
              return false
            await env.CAPTCHA_KV.put(`cap:${sigHex}`, '1', {
              expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)),
            })
            return true
          },
        })
        if (!result.success) {
          return new Response(JSON.stringify({ success: false, reason: result.reason }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
          })
        }
        // 签发 session permit：TTL 内可复用，前端查询结束后主动注销
        const ttlMs = result.expires - Date.now()
        await env.CAPTCHA_KV.put(`cap-permit:${result.tokenKey}`, String(result.expires), {
          expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)),
        })
        return new Response(JSON.stringify({ success: true, token: result.token, expires: result.expires }), {
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
      catch {
        return new Response(JSON.stringify({ success: false, reason: 'server_error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
    }

    if (url.pathname === '/cap/end-session' && request.method === 'POST') {
      try {
        const { token } = await request.json()
        const tokenKey = await deriveTokenKey(token)
        if (tokenKey)
          await env.CAPTCHA_KV.delete(`cap-permit:${tokenKey}`)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
      catch {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
    }

    // ===== 代理 API =====

    // Cap permit 校验：带 cap-token 的请求校验 session permit；
    // permit 有效则豁免限流(一次 RUN 会并发打多个端点),但仍记录计数以保持 X-RateLimit 准确(C22)。
    // 不带 cap-token 的请求走 IP 限流。
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const capToken = request.headers.get('cap-token')
    if (capToken) {
      const tokenKey = await deriveTokenKey(capToken)
      const expiresRaw = tokenKey && await env.CAPTCHA_KV.get(`cap-permit:${tokenKey}`)
      if (!expiresRaw || Number(expiresRaw) < Date.now()) {
        return new Response('Invalid or expired permit', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', ...corsHeadersFor(request) },
        })
      }
      touchRateLimit(ip) // C22: 豁免路径也计入限流窗口,使 X-RateLimit-Remaining 真实
    }
    else {
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
    }

    // ===== 计数 API（放在限流/cap 校验之后,至少受 IP 限流约束,S2） =====
    if (url.pathname === '/api/count/inc' && request.method === 'POST') {
      try {
        let n = 1
        try {
          const body = await request.json()
          if (typeof body?.n === 'number' && Number.isFinite(body.n))
            n = Math.min(50, Math.max(1, Math.floor(body.n)))
        }
        catch { /* 无 body 或非 JSON，按 n=1 处理 */ }

        const value = await env.COUNTER_KV.get('queryCount')
        const current = parseCount(value)
        const newCount = current + n
        await env.COUNTER_KV.put('queryCount', String(newCount))
        return new Response(JSON.stringify({ count: newCount, inc: n }), {
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
      catch {
        return new Response(JSON.stringify({ error: 'internal_error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeadersFor(request) },
        })
      }
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

      // S8: 检查 Content-Length,超上限直接拒绝,避免打爆 Worker 内存 / 放大计费
      const contentLength = Number(resp.headers.get('content-length') || 0)
      if (contentLength > MAX_BODY_BYTES) {
        return new Response('Response too large', {
          status: 502,
          headers: { 'Content-Type': 'text/plain', ...corsHeadersFor(request) },
        })
      }

      // 流式读取并限制字节上限(S8)
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
      // S14: 不回显内部报错细节(含 readLimited 超限抛错 → 502)
      return new Response('Proxy error', { status: 502, headers: corsHeadersFor(request) })
    }
  },
}
