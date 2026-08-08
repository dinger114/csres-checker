# Proxy Worker

代理服务，用于跨域请求不支持 CORS 的标准数据源（工标库、csres.com、重庆地标等）。

## 部署到 Cloudflare Workers

```bash
# 使用 Wrangler 部署（worker 目录下）
npx wrangler deploy index.js --name proxy
```

或在 Cloudflare Dashboard 中：
1. 创建新 Worker
2. 粘贴 `index.js` 内容
3. 保存并部署

## 使用方式

```
GET https://your-worker.workers.dev/?url=https://example.com
```

## 功能

- URL 白名单（`cssn.net.cn`、`bzsou.cn`、`gongbiaoku.com`、`csres.com`、`cq.dingyi.de`、`183.66.41.2`），防止 SSRF
- 滑动窗口限流：每 IP 每 60 秒最多 30 次请求（响应头 `X-RateLimit-*`）
- 自动检测 GBK 编码并转换为 UTF-8
- 支持 CORS 跨域请求（`Access-Control-Allow-Origin: *`）
- 添加标准 User-Agent 头

> 注：Cloudflare Worker 平台禁止 fetch 裸 IP（error 1003）。重庆源站需先通过域名（如 `cq.dingyi.de`）暴露，Worker 白名单放行该域名。
