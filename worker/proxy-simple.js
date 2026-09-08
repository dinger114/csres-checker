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

// CORS 头:放行前端发来的 cap-token 自定义头(否则预检被拒)
// no-store + Max-Age 0:强制浏览器/CF 边缘每次重新取 preflight,不复用旧缓存
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, cap-token',
  'Access-Control-Max-Age': '0',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

// ===== 安全代理:手动跟随重定向,目标重定向同样过白名单校验(S1) =====
const MAX_REDIRECTS = 3

function isAllowedTarget(u) {
  return (u.protocol === 'https:' || u.protocol === 'http:') && ALLOWED_HOSTS.includes(u.hostname)
}

// 自动跟随只校验初始 URL,白名单内站点上的开放重定向可把请求带到任意外网(SSRF 中继)。
async function fetchTarget(current, headers) {
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const resp = await fetch(current, { headers, redirect: 'manual' })
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location')
      if (!location)
        return resp
      const next = new URL(location, current)
      if (!isAllowedTarget(next))
        throw new Error(`redirect to disallowed host: ${next.hostname}`)
      current = next.href
      continue
    }
    return resp
  }
  throw new Error('too many redirects')
}

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

export default {
  async fetch(request) {
    cleanup()

    const url = new URL(request.url)

    // 处理 CORS 预检：直接返回允许 cap-token 的响应头
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

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
      return new Response('Missing ?url= parameter', { status: 400, headers: corsHeaders })
    }

    let targetUrl
    try {
      targetUrl = new URL(target)
    }
    catch {
      return new Response('Invalid URL', { status: 400, headers: corsHeaders })
    }

    if (!isAllowedTarget(targetUrl)) {
      return new Response('Host not allowed', { status: 403, headers: corsHeaders })
    }

    try {
      const resp = await fetchTarget(targetUrl.href, {
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
      return new Response(`Proxy error: ${e.message}`, { status: 502, headers: corsHeaders })
    }
  },
}
