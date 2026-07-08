# 标准查新工具 (csres-checker)

批量查询国家标准/行业标准现行状态，数据来源 [cssn.net.cn](https://www.cssn.net.cn)（主）+ [工标库](https://www.gongbiaoku.com)（备用）+ [csres.com](http://www.csres.com)（备用）。

**在线使用：https://csres.yeye.moe**

## 功能特性

- 支持 GB、行业标准等编号查询（`GB50222` → `GB 50222` 自动格式化）
- 三数据源：cssn.net.cn 查不到时自动 fallback 到工标库，再 fallback 到 csres.com
- 并行批量查询（4 个一批），实时进度条 + 日志面板
- Dark / Light 主题切换，跟随系统偏好
- 废止标准点击查看替代标准编号
- 外链快捷入口：道客巴巴、搜建筑
- Firebase 全网查询计数
- 导出 Markdown 表格 / Excel 文件

## 使用方式

### GitHub Pages（推荐）

推送到 `main` 分支自动部署，无需后端。

```bash
git push origin main
```

**前置配置**：在仓库 Settings → Secrets → Actions 中添加：

| Secret | 说明 | 必需 |
|---|---|---|
| `FIREBASE_API_KEY` | Firebase Web API Key | 否（不配置则计数功能不生效） |

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

## 自建代理（Cloudflare Worker）

GitHub Pages 部署时，浏览器直接请求 gongbiaoku.com 会被 CORS 拦截。通过 Cloudflare Worker 中转解决。

Worker 内置 URL 白名单（`gongbiaoku.com`、`cssn.net.cn`、`csres.com`），仅允许转发到这三个域名，防止 SSRF。

```bash
cd worker
wrangler deploy
```

## 项目结构

```
csres-checker/
├── index.html                  # Vite 入口
├── src/
│   ├── main.ts                 # 应用启动
│   ├── App.vue                 # 根组件
│   ├── types/index.ts          # TypeScript 类型定义
│   ├── styles/variables.css    # 主题 CSS 变量
│   ├── utils/                  # 工具函数
│   │   ├── constants.ts        # 常量配置
│   │   ├── normalize.ts        # 标准编号归一化
│   │   ├── htmlParser.ts       # HTML 解析器
│   │   └── theme.ts            # 主题工具
│   ├── composables/            # Vue 3 组合式函数
│   │   ├── useQuery.ts         # 查询编排（三阶段 fallback）
│   │   ├── useProxy.ts         # 代理竞速
│   │   ├── useCssn.ts          # cssn.net.cn 数据源
│   │   ├── useGongbiaoku.ts    # 工标库数据源
│   │   ├── useCsres.ts         # csres.com 数据源
│   │   ├── useFirebase.ts      # Firebase 计数
│   │   ├── useTheme.ts         # 主题切换
│   │   ├── useLog.ts           # 日志系统
│   │   ├── useClipboard.ts     # 复制/导出 Markdown
│   │   ├── useXlsx.ts          # 导出 Excel
│   │   └── useToast.ts         # Toast 通知
│   └── components/             # Vue 组件
│       ├── AppHeader.vue       # 标题栏
│       ├── QueryInput.vue      # 输入面板
│       ├── ResultsTable.vue    # 结果表格
│       ├── StatusBadge.vue     # 状态徽章
│       ├── TerminalLog.vue     # 终端日志
│       ├── LogStats.vue        # 统计信息
│       └── Toast.vue           # Toast 组件
├── worker/
│   ├── index.js                # Cloudflare Worker 代理
│   └── wrangler.toml           # Worker 配置
├── csres_checker.py            # Python CLI 工具
├── requirements.txt            # Python 依赖
├── examples/sample.txt         # 示例标准编号
├── .github/workflows/deploy.yml  # GitHub Actions 部署
├── vite.config.ts              # Vite 构建配置
├── tsconfig.json               # TypeScript 配置
├── CNAME                       # 自定义域名
├── LICENSE                     # MIT
└── .gitignore
```

## License

MIT
