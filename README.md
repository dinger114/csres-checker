# 标准查新工具 (csres-checker)

批量查询国家标准状态，数据来源 [www.csres.com](http://www.csres.com)

## 安装

```bash
pip install -r requirements.txt
```

## 使用方法

### 单个查询

```bash
python csres_checker.py 50222
```

### 批量查询（命令行参数）

```bash
python csres_checker.py 50222 50010 50311
```

### 批量查询（文件）

```bash
python csres_checker.py -f standards.txt
```

文件格式（每行一个标准编号，# 开头为注释）：

```
# 建筑相关标准
50222
50010
50311
```

### 输出到指定文件

```bash
python csres_checker.py 50222 -o output.json
```

### 仅终端显示

```bash
python csres_checker.py 50222 --no-file
```

### 调整查询间隔

```bash
python csres_checker.py -f standards.txt -d 2.0
```

## 输出示例

```json
[
  {
    "query": "50222",
    "standard_number": "GB 50222-2017",
    "title": "建筑内部装修设计防火规范",
    "status": "现行",
    "publisher": "住房城乡建设部",
    "publish_date": "2017-07-13",
    "replaced_by": "替代 GB 50222-95",
    "category": "工程建设",
    "ics": "13.220.50"
  }
]
```

## 命令行参数

| 参数 | 说明 |
|------|------|
| `keywords` | 标准编号（空格分隔） |
| `-f, --file` | 从文件读取标准编号 |
| `-o, --output` | 输出 JSON 文件路径（默认 `results.json`） |
| `-d, --delay` | 查询间隔秒数（默认 1.0） |
| `--no-file` | 不输出 JSON 文件，仅终端显示 |
