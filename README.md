# 标准查新工具 (csres-checker)

批量查询国家标准状态，数据来源 [www.csres.com](http://www.csres.com)

支持命令行和 Web 界面两种使用方式。

## 命令行使用

### 安装

```bash
pip install -r requirements.txt
```

### 单个查询

```bash
python csres_checker.py 50222
```

### 批量查询

```bash
python csres_checker.py 50222 50010 50311
```

### 从文件查询

```bash
python csres_checker.py -f standards.txt
```

## Web 界面

### 本地运行

```bash
pip install -r requirements.txt
python app.py
```

访问 http://localhost:5000

### Docker 部署

```bash
# 构建并运行
docker compose up -d

# 或手动构建
docker build -t csres-checker .
docker run -d -p 5000:5000 csres-checker
```

访问 http://localhost:5000

## Web API

### POST /api/query

请求：

```json
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
      "publisher": "中华人民共和国住房和城乡建设部",
      "publish_date": "2018-04-01",
      "replaced_by": "",
      "category": "P16",
      "ics": "13.220.20"
    }
  ],
  "total": 1
}
```

## 命令行参数

| 参数 | 说明 |
|------|------|
| `keywords` | 标准编号（空格分隔） |
| `-f, --file` | 从文件读取标准编号 |
| `-o, --output` | 输出 JSON 文件路径（默认 `results.json`） |
| `-d, --delay` | 查询间隔秒数（默认 1.0） |
| `--no-file` | 不输出 JSON 文件，仅终端显示 |
