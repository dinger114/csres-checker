# 安全审计报告修复（audit-fix/high-risk）

> 基于 `csres-checker-audit.md` 的修复分支。所有改动 `npm run typecheck` / `npm run test` / `npm run build` 全绿（仅 6 个预存 Teleport 测试因 happy-dom 环境问题失败，与本次改动无关，详见末节）。

## 改动概览

### 高风险（S1 / S2 / C1 / C7）
- **S1 SSRF 修复**：Worker 代理 `fetch` 改为 `redirect:'manual'`，对 3xx `Location` 重新过域名白名单，杜绝开放重定向绕过白名单。
- **S2 计数接口加固**：无鉴权的 `/api/count/inc` 移入限流校验之后；单次增量上限 1000 → **50**；无 token 直接请求受 429 限流约束。
- **C1 Python CLI 崩溃**：`csres_checker.py` 的 `_std_base` 与 `_normalize_std_no` 口径统一（去空格 / 全角横杠 / 小写），`replaced_by` 改用 `dict.get` 兜底避免 `KeyError`，解析包 `try` 不再整批崩溃。
- **C7 KV 计数兜底**：`parseCount()` 对 NaN / 非数字按 0 兜底。

### 前端查询稳定性（C3 / C4 / C5）
- **C3 代理竞速校验**：响应校验改为 `res.ok` + 最小字节数（200），排除 404 / WAF 页被误判为有效代理。
- **C4 / C5 加载态与进度**：`finishQuery()` 只复位 `running` 不清进度条；三查询路径包 `try/finally`；`runSource` 每批更新 `progress`。

### Worker 收敛（Q2 / M9）+ 安全加固（S6 / S8 / C9 / C22 / S14）
- **Q2 / M9 消除双 Worker 漂移**：抽取 `worker/shared.js`，`csres-proxy` 与 `csres-proxy-simple` 共用白名单 / 重定向 / 限流逻辑。
- **S6 CORS 收敛**：`Access-Control-Allow-Origin` 仅对白名单站点返回，非白名单 Origin 不再泄露 ACAO。
- **S8 响应上限**：`Content-Length` 超 5MB 直接 502 拒绝（防内存耗尽）。
- **C9 错误响应带 CORS**：被拒响应也带 CORS 头，前端能拿到真实状态码。
- **C22 限流路径**：未拿 permit 的被拒响应也带 `Retry-After`。
- **S14 错误不回显**：错误信息只回显 `Host not allowed` 等中性提示，不回显 `e.message`。

### i18n（Q5 / Q6 / M4）
- **Q6**：ResultsTable 列头 label 接入 i18n（复用 `output.col_*` 等已定义 key），英文界面下表格不再硬编码中文；空态渲染文案。
- **M4**：状态值抽为 `src/utils/status.ts` 常量；修复状态筛选缺「被代替」项。
- **Q5**：HelpPanel 语言切换复用导出的 `setLocale()`，与全局一致。

### 安全 / CI / 健壮性（S10 / S11 / S12 / S16 / S18 / S19 / C11 / M2 / M6 / M7 / S9）
- **S10**：本地代理 `scripts/local-proxy.mjs` 绑定 `127.0.0.1` 回环，避免同局域网把开发机当开放代理。
- **S11 / M2**：移除 `deploy.yml` 中已弃用 Firebase 的 `VITE_FIREBASE_API_KEY` secret 注入；`env.d.ts` 改为声明实际使用的 `VITE_WORKER_URL` / `VITE_CAPTCHA_WORKER_URL`。
- **S12**：CSP 移除生产不该出现的 `http://localhost:8787` 与明文 `http://www.csres.com`。
- **S16**：`ci.yml` 显式 `permissions: contents: read`（最小权限）。
- **M6**：`deploy.yml` 加 `concurrency` 防并发部署竞态。
- **S9**：`worker/package.json` 锁定 `capjs-core` 版本（去 `"*"`）。
- **S18 / S19**：`loadHistory()` 校验数组类型；theme 读写 localStorage 包 `try/catch`（隐私模式降级）。
- **C11**：log store 分离 `warn` 与 `empty` 计数（新增 `stats.warnings`），空结果由 `recordEmpty()` 显式累加。
- **M7**：dependabot 新增 `/worker` 子目录与 `github-actions` 生态更新。

### 数据正确性 / 健壮性（C2 / C13 / C14 / C16）
- **C2**：`useBzsou` 日期按东八区显式解析，无效日期降级为空而非整批抛错。
- **C13**：`useCap.ensureSolved` 加 in-flight 去重，多批次并发验证复用同一 PoW。
- **C14**：PWA `csres.com` 缓存留存 24h → 30min + `networkTimeoutSeconds`，降低命中陈旧标准状态风险。
- **C16**：`useFocusTrap` 改 `immediate` watch + `onMounted` 补聚焦，初始激活弹窗也能正确陷阱焦点。

## 验证方式
```bash
npm run typecheck   # 0 error
npm run test        # 127 passed / 6 failed（预存 Teleport 测试失败，非本次引入）
npm run build       # 成功
# Worker 冒烟（需 wrangler）：端口实测非白名单 403、inc n:999→50、CORS 头按 Origin 收敛
```

## 未落地项（建议后续单独 PR）
- **S3 / S4 / S5 限流持久化**：当前为模块内存 Map（单实例有效），跨实例 / 持久化需 Cloudflare Rate Limiting API 或 Durable Objects，无平台配额无法本地验证。
- **S12 `'unsafe-inline'` 彻底移除**：需 Vite 注入 nonce/hash 的破坏性改造，本轮仅移除明确的 `localhost:8787` 错误项，保留 `unsafe-inline` 并标注技术债。
- **C8 / C10 / C21 / C23** 等低危项需更多上下文定位具体代码位点，未在本轮处理。
