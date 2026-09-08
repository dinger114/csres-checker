// worker/shared.js —— index.js 与 proxy-simple.js 共享的代理/限流/白名单/CORS 逻辑(Q2/M9 收敛)
// 抽公共来源,消除两套 Worker 的白名单漂移、重定向处理漂移、限流参数漂移。

// 代理白名单:仅这些 host 可被代理访问
export const ALLOWED_HOSTS = [
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

// 手动跟随重定向时允许的最大跳数
export const MAX_REDIRECTS = 3

// 上游响应体上限:超过则拒绝,防止打爆 Worker 内存 / 放大计费(S8)
export const MAX_BODY_BYTES = 5 * 1024 * 1024

// CORS 收敛(S6):仅对白名单来源返回 Access-Control-Allow-Origin。
// 无 Origin 头(非浏览器/服务端调用)时省略 ACAO;不在白名单的 Origin 等价于拒绝跨域。
const ALLOWED_ORIGINS = new Set([
  'https://dingyi.de',
  'https://csres.yeye.moe',
  'https://counter.dingyi.de',
  'http://localhost:5173', // vite dev
  'http://localhost:8787', // worker dev(代理竞速)
])

export function corsHeadersFor(request, extra = {}) {
  const origin = request.headers.get('Origin')
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, cap-token',
    ...extra,
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Vary'] = 'Origin'
  }
  return headers
}

// 目标 URL 协议 + host 白名单校验
export function isAllowedTarget(u) {
  return (u.protocol === 'https:' || u.protocol === 'http:') && ALLOWED_HOSTS.includes(u.hostname)
}

// 手动跟随 3xx:自动跟随只校验初始 URL,白名单内站点上的开放重定向可把请求带到任意外网(SSRF 中继)。
// 每一步 Location 都重新过白名单 + 协议校验(S1)。
export async function fetchTarget(current, headers) {
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

// 解析 KV 计数:NaN 按 0 兜底,防止 KV 值损坏后计数器永久失效(C7)
export function parseCount(value) {
  const parsed = value ? parseInt(value, 10) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

// ===== 滑动窗口限流(ip 级,单 isolate 内存) =====
export const RATE_LIMIT = 30
export const WINDOW_MS = 60_000
export const rateLimitMap = new Map()

export function checkRateLimit(ip) {
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

// 仅记录不限流(C22):带 cap permit 的豁免路径也更新限流计数,
// 使 X-RateLimit-Remaining 反映真实状态,但不拒绝请求。
export function touchRateLimit(ip) {
  const now = Date.now()
  let timestamps = rateLimitMap.get(ip)
  if (!timestamps) {
    timestamps = []
    rateLimitMap.set(ip, timestamps)
  }
  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift()
  }
  timestamps.push(now)
}

// 定期清理过期 IP(防内存泄漏)
let lastCleanup = Date.now()
export function cleanup() {
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
