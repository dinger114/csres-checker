import { generateChallenge, validateChallenge } from 'capjs-core'

const ALLOWED_HOSTS = [
  'gongbiaoku.com',
  'www.gongbiaoku.com',
  'cssn.net.cn',
  'www.cssn.net.cn',
  'csres.com',
  'www.csres.com',
  'bzsou.cn',
  'www.bzsou.cn',
  'ccsn.org.cn',
  'www.ccsn.org.cn',
  'ebook.chinabuilding.com.cn',
  'www.ebook.chinabuilding.com.cn',
  'cq.dingyi.de',
]

// 滑动窗口限流：每个 IP 每 60 秒最多 30 次请求
const RATE_LIMIT = 30
const WINDOW_MS = 60_000
const rateLimitMap = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  let timestamps = rateLimitMap.get(ip)
  if (!timestamps) {
    timestamps = []
    rateLimitMap.set(ip, timestamps)
  }
  // 剪掉窗口外的旧记录
  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift()
  }
  if (timestamps.length >= RATE_LIMIT) {
    const retryAfter = Math.ceil((timestamps[0] + WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }
  timestamps.push(now)
  return { allowed: true }
}

// 定期清理过期 IP（防止内存泄漏）
let lastCleanup = Date.now()
function cleanup() {
  if (Date.now() - lastCleanup < 300_000)
    return
  lastCleanup = Date.now()
  const cutoff = Date.now() - WINDOW_MS
  for (const [ip, timestamps] of rateLimitMap) {
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift()
    }
    if (timestamps.length === 0)
      rateLimitMap.delete(ip)
  }
}

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

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, cap-token',
}

export default {
  async fetch(request, env) {
    cleanup()

    const url = new URL(request.url)

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // ===== 计数 API =====

    // GET /api/count - 读取计数
    if (url.pathname === '/api/count') {
      try {
        const value = await env.COUNTER_KV.get('queryCount')
        const count = value ? parseInt(value, 10) : 0
        return new Response(JSON.stringify({ count }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    // POST /api/count/inc - 递增计数（支持批量：body { n: number }，默认 1）
    if (url.pathname === '/api/count/inc' && request.method === 'POST') {
      try {
        // 解析批量增量 n，限制在 [1, 1000] 防止滥用
        let n = 1
        try {
          const body = await request.json()
          if (typeof body?.n === 'number' && Number.isFinite(body.n))
            n = Math.min(1000, Math.max(1, Math.floor(body.n)))
        }
        catch { /* 无 body 或非 JSON，按 n=1 处理 */ }

        // 注意：KV 不支持原子自增，get→put 在并发下可能少计。
        // 本工具流量有限，接受此误差（已与产品方确认）。
        const value = await env.COUNTER_KV.get('queryCount')
        const current = value ? parseInt(value, 10) : 0
        const newCount = current + n
        await env.COUNTER_KV.put('queryCount', String(newCount))
        return new Response(JSON.stringify({ count: newCount, inc: n }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          })
        }
        // 签发 session permit：TTL 内可复用，前端查询结束后主动注销
        const ttlMs = result.expires - Date.now()
        await env.CAPTCHA_KV.put(`cap-permit:${result.tokenKey}`, String(result.expires), {
          expirationTtl: Math.max(60, Math.ceil(ttlMs / 1000)),
        })
        return new Response(JSON.stringify({ success: true, token: result.token, expires: result.expires }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      catch (e) {
        return new Response(JSON.stringify({ success: false, reason: 'server_error', error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
      catch {
        return new Response(JSON.stringify({ ok: false }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    // ===== 代理 API =====

    // Cap permit 校验：带 cap-token 的请求校验 session permit；
    // permit 有效则豁免限流（一次 RUN 会并发打多个端点），无效则 403。
    // 不带 cap-token 的请求维持原行为（IP 限流）。
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    const capToken = request.headers.get('cap-token')
    if (capToken) {
      const tokenKey = await deriveTokenKey(capToken)
      const expiresRaw = tokenKey && await env.CAPTCHA_KV.get(`cap-permit:${tokenKey}`)
      if (!expiresRaw || Number(expiresRaw) < Date.now()) {
        return new Response('Invalid or expired permit', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders },
        })
      }
    }
    else {
      const { allowed, retryAfter } = checkRateLimit(ip)
      if (!allowed) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'Content-Type': 'text/plain',
            ...corsHeaders,
          },
        })
      }
    }

    const target = url.searchParams.get('url')

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400 })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    }
    catch {
      return new Response('Invalid URL', { status: 400 })
    }

    if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
      return new Response('Protocol not allowed', { status: 403 })
    }

    if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
      return new Response('Host not allowed', { status: 403 })
    }

    try {
      const resp = await fetch(targetUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      })

      const contentType = resp.headers.get('content-type') || ''
      const buffer = await resp.arrayBuffer()

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
          ...corsHeaders,
        },
      })
    }
    catch (e) {
      return new Response(`Proxy error: ${e.message}`, { status: 502 })
    }
  },
}
