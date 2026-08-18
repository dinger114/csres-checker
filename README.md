# 标准查新工具 (csres-checker)

批量查询国家标准/行业标准现行状态，数据来源 [cssn.net.cn](https://www.cssn.net.cn)（主）+ [标准搜](https://www.bzsou.cn)（备用）+ [工程标](https://www.ccsn.org.cn)（工程建设类）+ [工标库](https://www.gongbiaoku.com)（备用）+ [csres.com](http://www.csres.com)（兜底）+ 重庆地方标准（可选）。

> 部署域名不固定，可在 GitHub Pages 与 Cloudflare Pages 等多处部署，前端会自动适配当前域名（分享链接、帮助文档均动态生成）。

## 功能特性

- 支持 GB、行业标准等编号查询（`GB50222` → `GB 50222` 自动格式化）
- 六数据源：cssn.net.cn + 标准搜 + 工程标 + 工标库 + csres.com（自动 fallback）+ 重庆地标（手动选择）
- 名称检索模式：按标准名称关键词搜索，按国标 > 行业 > 地方 > 国际优先级排序
- 标准图集模式：按图集编号或名称搜索国标图集（ebook.chinabuilding.com.cn）
- 并行批量查询（2 个一批，500ms 间隔），实时进度条 + 日志面板
- Dark / Light 主题切换，跟随系统偏好
- 查询历史记录，一键回填
- 文件导入（.txt 文件上传 / 拖拽）
- 键盘快捷键（Ctrl+Enter 运行，Esc 清空，Shift+←/→ 列排序）
- 结果表格列拖拽排序 + 键盘排序，导出跟随列顺序
- 状态筛选（ALL / 现行 / 废止 / 即将实施）
- 标准版本历史（点击标准号查看所有版本）
- 导出 Markdown 表格 / Excel 文件
- 分享链接（生成带查询参数的 URL，支持 `auto=1` 自动执行）
- 废止标准点击查看替代标准编号
- 外链快捷入口：筑森档案（jzxx.vip，文件下载搜索）、道客巴巴、搜建筑；重庆地标结果含 PDF 预览
- Cloudflare Worker + KV 全网查询计数
- 移动端适配：Tab 栏切换 INPUT / OUTPUT / LOG 面板，数据源下拉选择器
- PWA 支持：可安装到设备主屏幕，Service Worker 离线缓存
- i18n 国际化：中文/英文双语切换

## 部署方式

### Cloudflare Pages（推荐）

推送到 `refactor/vue3-worker-edge` 分支自动部署（GitHub Actions 的 `deploy-cf-pages` job，`--branch=main`）。Cloudflare 全球 CDN，免费额度充足。

**前置配置**：在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 | 必需 |
|---|---|---|
| `CF_API_TOKEN` | Cloudflare API Token（Pages 权限） | 是 |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | 是 |

### GitHub Pages

推送到 `main` 或 `refactor/vue3-worker-edge` 分支自动部署（`build-and-deploy` job）。

### 命令行（Python CLI）

独立的 Python 工具，可用于批量查询并导出 JSON。

```bash
pip install -r requirements.txt

# 单个查询
python csres_checker.py 50222

# 批量查询
python csres_checker.py 50222 50010 50311

# 从文件查询
python csres_checker.py -f examples/sample.txt
```

| 参数 | 说明 |
|---|---|
| `keywords` | 标准编号（空格分隔） |
| `-f, --file` | 从文件读取标准编号（每行一个，`#` 开头为注释） |
| `-o, --output` | 输出 JSON 文件路径（默认 `results.json`） |
| `-d, --delay` | 查询间隔秒数（默认 1.0） |
| `--no-file` | 不输出 JSON 文件，仅终端显示 |

## 自建代理与计数（Cloudflare Worker + KV）

部分数据源（工标库、csres、重庆地标、图集）不支持 CORS，浏览器直接请求会被拦截。通过 Cloudflare Worker 中转解决。

Worker 同时提供全网查询计数 API（`/api/count` 读取、`/api/count/inc` 递增），使用 KV 存储计数，替代了原先的 Firebase 依赖。

Worker 内置 URL 白名单（`cssn.net.cn`、`bzsou.cn`、`ccsn.org.cn`、`gongbiaoku.com`、`csres.com`、`ebook.chinabuilding.com.cn`、`cq.dingyi.de` 及重庆源站 `183.66.41.2`），仅允许转发到这些域名，防止 SSRF，并带滑动窗口限流（每 IP 每 60 秒 30 次）。

前端通过 `src/utils/constants.ts` 的 `PROXY_LIST` 配置代理端点（默认 `api.dingyi.de`、`api2.dingyi.de`），多代理竞速取最快可用。

### 部署 Worker

```bash
# 1. 创建 KV 命名空间
npx wrangler kv namespace create COUNTER_KV

# 2. 将返回的 id 填入 wrangler.toml

# 3. 部署
cd worker
npx wrangler deploy

# 4. 初始化计数
npx wrangler kv key put --namespace-id=<YOUR_ID> queryCount 0 --remote
```

> 注：cssn.net.cn、bzsou.cn、ccsn.org.cn 支持 CORS 时前端直连优先，代理仅作 fallback；工标库、csres、重庆地标、图集必须走代理。

## 技术栈

- **Vue 3.5** + Composition API + `<script setup>`
- **Vite 8** 构建工具
- **TypeScript 5.9**（strict 模式，零 `any`）
- **Pinia 4** 状态管理（6 个 store：query/ui/theme/log/toast/history）
- **VueUse 14** 工具集
- **vue-i18n 10** 国际化（zh-CN / en）
- **vite-plugin-pwa** PWA 支持
- **Vitest 4** 单元测试（109 个测试）
- **Playwright** E2E 测试
- **ESLint** (@antfu) + Husky pre-commit
- **xlsx** Excel 导出（懒加载）

## 项目结构

```
csres-checker/
├── index.html                  # Vite 入口（含 PWA meta 标签）
├── wrangler.toml               # Cloudflare Worker + KV 配置
├── lighthouserc.js             # Lighthouse CI 配置
├── src/
│   ├── main.ts                 # 应用启动（Pinia + i18n）
│   ├── App.vue                 # 根组件（布局编排）
│   ├── test-setup.ts           # 测试全局配置（Pinia + i18n）
│   ├── types/index.ts          # TypeScript 类型定义
│   ├── locales/                # i18n 国际化
│   │   ├── index.ts            # i18n 配置
│   │   ├── zh-CN.json          # 中文翻译
│   │   └── en.json             # 英文翻译
│   ├── styles/                 # 样式
│   │   ├── variables.css       # 主题 CSS 变量
│   │   └── app.css             # 全局样式
│   ├── stores/                 # Pinia 状态管理
│   │   ├── query.ts            # 查询编排（fallback 链 + 自适应批量）
│   │   ├── ui.ts               # UI 状态（列定义/版本弹窗/移动端 Tab）
│   │   ├── theme.ts            # 主题切换
│   │   ├── log.ts              # 日志系统（限制 200 行）
│   │   ├── toast.ts            # Toast 通知
│   │   └── history.ts          # 查询历史（localStorage 持久化）
│   ├── composables/            # Vue 3 组合式函数
│   │   ├── useCssn.ts          # cssn.net.cn 数据源（直连优先）
│   │   ├── useBzsou.ts         # bzsou.cn 数据源（直连优先）
│   │   ├── useCcsn.ts          # ccsn.org.cn 数据源（工程标）
│   │   ├── useGongbiaoku.ts    # 工标库数据源（代理）
│   │   ├── useCsres.ts         # csres.com 数据源（代理）
│   │   ├── useCqdb.ts          # 重庆地标数据源（代理）
│   │   ├── useAtlas.ts         # 标准图集数据源（代理）
│   │   ├── useProxy.ts         # 代理竞速（PROXY_LIST 多端点）
│   │   ├── useCounter.ts       # Worker + KV 查询计数
│   │   ├── useClipboard.ts     # 复制/导出 Markdown
│   │   ├── useXlsx.ts          # 导出 Excel（懒加载 xlsx）
│   │   └── useFocusTrap.ts     # 弹窗焦点陷阱（A11y）
│   ├── utils/                  # 工具函数
│   │   ├── constants.ts        # 常量配置（代理列表/批量参数）
│   │   ├── normalize.ts        # 标准编号归一化
│   │   ├── match.ts            # 标准编号匹配
│   │   ├── htmlParser.ts       # HTML 解析器（csres/工标库/重庆）
│   │   ├── errors.ts           # 统一错误提取
│   │   ├── exportConfig.ts     # 导出列映射配置
│   │   └── theme.ts            # 主题工具
│   └── components/             # Vue 组件
│       ├── AppHeader.vue       # 标题栏（含主题切换/帮助/计数）
│       ├── QueryInput.vue      # 输入面板（文本/模式切换/进度条）
│       ├── SourceSelector.vue  # 数据源选择器（桌面 radio / 移动下拉）
│       ├── ActionBar.vue       # 操作按钮栏（RUN/IMPORT/MD/XLSX/SHARE）
│       ├── ResultsTable.vue    # 结果表格（列拖拽/键盘排序/筛选/多选）
│       ├── CellRenderer.vue    # 单元格渲染器（6 种 cell 类型）
│       ├── StatusBadge.vue     # 状态徽章（含替代标准 popover）
│       ├── VersionHistory.vue  # 版本历史弹窗（focus-trap）
│       ├── TerminalLog.vue     # 终端日志 + 查询历史
│       ├── LogStats.vue        # 统计信息
│       ├── HelpPanel.vue       # 帮助面板（双语 + 语言切换）
│       ├── DonatePanel.vue     # 捐赠面板
│       └── Toast.vue           # Toast 组件
├── worker/
│   ├── index.js                # Cloudflare Worker（代理 + KV 计数 API）
│   └── wrangler.toml           # Worker 配置（KV 绑定）
├── e2e/
│   └── app.spec.ts             # Playwright E2E 测试
├── csres_checker.py            # Python CLI 工具
├── requirements.txt            # Python 依赖
├── examples/sample.txt         # 示例标准编号
├── .github/workflows/
│   ├── ci.yml                  # CI（typecheck + lint + test + e2e）
│   └── deploy.yml              # 部署（Cloudflare Pages + GitHub Pages）
├── vite.config.ts              # Vite 构建配置（含 PWA + Vitest）
├── tsconfig.json               # TypeScript 配置
├── CNAME                       # 自定义域名
└── LICENSE                     # MIT
```

## 开发

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 类型检查
npm run typecheck

# Lint
npm run lint

# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 构建
npm run build

# 预览构建产物
npm run preview

# Lighthouse 审计
npm run test:lighthouse
```

## License

MIT
