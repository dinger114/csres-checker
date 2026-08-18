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
  '183.66.41.2',
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

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
        const count = await env.COUNTER_KV.get('queryCount', 'number') || 0
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

    // POST /api/count/inc - 递增计数
    if (url.pathname === '/api/count/inc' && request.method === 'POST') {
      try {
        // 使用 KV 的原子操作读取并递增
        const current = await env.COUNTER_KV.get('queryCount', 'number') || 0
        const newCount = current + 1
        await env.COUNTER_KV.put('queryCount', String(newCount))
        return new Response(JSON.stringify({ count: newCount }), {
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

    // ===== 代理 API =====

    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
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
