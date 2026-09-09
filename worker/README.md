# Proxy Worker

代理服务，用于跨域请求不支持 CORS 的标准数据源（工标库、csres.com、重庆地标等）。

两套 Worker 共享 `worker/shared.js`（白名单 / 重定向处理 / 限流 / CORS / 响应大小限制 / KV 计数解析），逻辑单一来源，不会漂移：

- `index.js`（完整版）：代理 + Cap PoW 人机验证 + KV 查询计数
- `proxy-simple.js`（简化版）：纯代理，无 cap / 无 KV 计数

## 部署到 Cloudflare Workers

```bash
# 在 worker/ 目录下执行,wrangler 自动读取同目录 wrangler.toml
# (含 main、KV 绑定 COUNTER_KV/CAPTCHA_KV 与 compatibility flags)
cd worker
npx wrangler deploy            # 完整版(index.js, name=csres-proxy)
npx wrangler deploy -c wrangler.simple.toml   # 简化版(proxy-simple.js)
```

> 不要使用 `npx wrangler deploy index.js --name proxy`：不带 `--config` 会丢失 KV 绑定与 compatibility flags，部署即 500。

或在 Cloudflare Dashboard 中：
1. 创建新 Worker
2. 粘贴 `index.js`（及 `shared.js` 合并后）内容
3. 保存并部署（KV 绑定需在 Dashboard 手动配置）

## 使用方式

```
GET https://your-worker.workers.dev/?url=https://example.com
```

## 功能

- URL 白名单 + 协议校验（`cssn.net.cn`、`bzsou.cn`、`ccsn.org.cn`、`gongbiaoku.com`、`csres.com`、`ebook.chinabuilding.com.cn`、`cq.dingyi.de`，见 `shared.js` 的 `ALLOWED_HOSTS`），防止 SSRF
- 手动跟随重定向（S1）：3xx 的每一跳 `Location` 重新过白名单 + 协议校验，最多 3 跳
- 滑动窗口限流：每 IP 每 60 秒最多 30 次请求（响应头 `X-RateLimit-*`，429 带 `Retry-After`；注意为单 isolate 内存限流，跨实例不共享）
- Cap PoW 人机验证（完整版）：`/cap/challenge` → `/cap/redeem` 签发 session permit，TTL 内豁免限流；依赖 KV 绑定 `CAPTCHA_KV`（nonce 防重放 + permit 存储）与 `COUNTER_KV`（计数）
- 响应体上限 5MB（S8）：`Content-Length` 超限或流式读取超限均返回 502
- 自动检测 GBK 编码并转换为 UTF-8
- CORS 按来源收敛（S6）：仅对白名单 Origin 返回 `Access-Control-Allow-Origin`，不再使用 `*`
- 添加标准 User-Agent 头

> 注：Cloudflare Worker 平台禁止 fetch 裸 IP（error 1003）。重庆源站需先通过域名（如 `cq.dingyi.de`）暴露，Worker 白名单放行该域名。
