# Proxy Worker

代理服务，用于跨域请求 gongbiaoku.com 和 csres.com。

## 部署到 Cloudflare Workers

```bash
# 使用 Wrangler 部署
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

- 自动检测 GBK 编码并转换为 UTF-8
- 支持 CORS 跨域请求
- 添加标准 User-Agent 头
