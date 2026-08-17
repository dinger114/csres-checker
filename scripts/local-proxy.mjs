// 本地 CORS 代理,用于验证无 CORS 数据源(如 ebook.chinabuilding.com.cn)
// 用法: node scripts/local-proxy.mjs [port]  默认 8787
// 请求: GET http://localhost:8787/?url=<encodeURIComponent(目标URL)>
/* eslint-disable node/prefer-global/process, node/prefer-global/buffer */
import http from 'node:http'

const PORT = Number(process.argv[2] || 8787)
const ALLOWED_HOSTS = ['ebook.chinabuilding.com.cn', 'www.eBook.chinabuilding.com.cn']

const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const target = url.searchParams.get('url')
  if (!target) {
    res.writeHead(400, { ...cors, 'Content-Type': 'text/plain' })
    res.end('Missing ?url= parameter')
    return
  }

  let targetUrl
  try {
    targetUrl = new URL(target)
  }
  catch {
    res.writeHead(400, { ...cors, 'Content-Type': 'text/plain' })
    res.end('Invalid URL')
    return
  }

  if (!ALLOWED_HOSTS.includes(targetUrl.hostname.toLowerCase())) {
    res.writeHead(403, { ...cors, 'Content-Type': 'text/plain' })
    res.end(`Host not allowed: ${targetUrl.hostname}`)
    return
  }

  try {
    const upstream = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.writeHead(upstream.status, {
      ...cors,
      'Content-Type': upstream.headers.get('content-type') || 'text/html; charset=utf-8',
    })
    res.end(buffer)
  }
  catch (e) {
    res.writeHead(502, { ...cors, 'Content-Type': 'text/plain' })
    res.end(`Proxy error: ${e.message}`)
  }
})

server.listen(PORT, () => {
  console.log(`🚀 本地 CORS 代理已启动: http://localhost:${PORT}/`)
  console.log(`   白名单: ${ALLOWED_HOSTS.join(', ')}`)
})
