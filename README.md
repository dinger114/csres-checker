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
- 复制 Markdown 表格
- XSS 防护（DOMPurify）、Worker SSRF 白名单

## 使用方式

### 1. GitHub Pages（推荐）

推送到 `main` 分支自动部署，无需后端。

```bash
git push origin main
```

CI 通过 `build.sh` 构建 `dist/` 目录，替换 Firebase API Key 后部署。

**前置配置**：在仓库 Settings → Secrets → Actions 中添加：

| Secret | 值 |
|---|---|
| `FIREBASE_API_KEY` | Firebase Web API Key |

### 2. 命令行

```bash
pip install -r requirements.txt

# 单个查询
python csres_checker.py 50222

# 批量查询
python csres_checker.py 50222 50010 50311

# 从文件查询
python csres_checker.py -f examples/sample.txt

# 仅终端显示，不输出文件
python csres_checker.py --no-file 50222 50010
```

| 参数 | 说明 |
|---|---|
| `keywords` | 标准编号（空格分隔） |
| `-f, --file` | 从文件读取标准编号（每行一个，`#` 开头为注释） |
| `-o, --output` | 输出 JSON 文件路径（默认 `results.json`） |
| `-d, --delay` | 查询间隔秒数（默认 1.0） |
| `--no-file` | 不输出 JSON 文件，仅终端显示 |

### 3. Web 界面（Flask）

```bash
pip install -r requirements.txt
python app.py
# 访问 http://localhost:8080
```

#### Docker 部署

```bash
docker compose up -d
# 访问 http://localhost:8080
```

## Web API

```
POST /api/query
Content-Type: application/json

{
  "keywords": "50222\n50010\n50311"
}
```

响应：

```json
{
  "results": [
    {
      "query": "50222",
      "standard_number": "GB 50222-2017",
      "title": "建筑内部装修设计防火规范",
      "status": "现行",
      "publish_date": "2017-07-31"
    }
  ],
  "total": 1
}
```

## 自建代理（Cloudflare Worker）

GitHub Pages 部署时，浏览器直接请求 gongbiaoku.com 会被 CORS 拦截。通过 Cloudflare Worker 中转解决。

Worker 内置 URL 白名单（`gongbiaoku.com`、`csres.com`），仅允许转发到这两个域名，防止 SSRF。

```bash
npm install -g wrangler
wrangler login
cd worker
wrangler deploy
```

部署后在网页代理设置中填入：

```
https://your-proxy.workers.dev?url={url}
```

## GitHub Secrets 配置

在仓库 Settings → Secrets and variables → Actions → New repository secret 中添加：

| Secret | 说明 | 示例 |
|---|---|---|
| `FIREBASE_API_KEY` | Firebase Web API Key | `AIzaSy...` |

不配置此 Secret 时，Firebase 全网计数功能不生效，其余功能正常。

## 项目结构

```
csres-checker/
├── index.html              # GitHub Pages 前端（纯静态）
├── app.py                  # Flask Web 应用
├── csres_checker.py        # 核心查询逻辑（CLI + Flask 共用）
├── build.sh                # CI 构建脚本
├── templates/
│   └── index.html          # Flask 模板（与 index.html 功能同步）
├── worker/
│   ├── index.js            # Cloudflare Worker 代理（含 SSRF 白名单）
│   ├── wrangler.toml       # Worker 配置
│   └── README.md           # 代理部署教程
├── examples/
│   └── sample.txt          # 示例标准编号列表
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions 自动部署
├── robots.txt              # 爬虫规则
├── CNAME                   # 自定义域名
├── .nojekyll               # 禁用 Jekyll
├── Dockerfile              # Docker 镜像
├── docker-compose.yml      # Docker Compose 配置
├── requirements.txt        # Python 依赖
├── LICENSE                 # MIT
└── .gitignore
```

## License

MIT
