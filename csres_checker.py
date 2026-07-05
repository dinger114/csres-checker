#!/usr/bin/env python3
"""标准查新工具 - 批量查询国家标准状态"""

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.gongbiaoku.com/search"
CSSN_API_URL = "https://www.cssn.net.cn/api/standards/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def query_gongbiaoku(keyword: str) -> list[dict]:
    """从工标库查询标准"""
    try:
        resp = requests.get(BASE_URL, params={"query": keyword}, headers=HEADERS, timeout=15)
        resp.encoding = "utf-8"
    except requests.RequestException as e:
        print(f"[错误] 请求失败: {keyword} - {e}", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    for li in soup.select("ul.box-list > li"):
        name_intr = li.select_one("ul.name-intr")
        if not name_intr:
            continue

        info = {}
        for item in name_intr.find_all("li"):
            span = item.find("span")
            if span:
                key = span.get_text(strip=True).rstrip("：:")
                value = item.get_text(strip=True).replace(span.get_text(strip=True), "").strip()
                info[key] = value

        status_tag = li.select_one("span.label-xx, span.label-fz")
        if status_tag:
            status = status_tag.get_text(strip=True)
        else:
            status = ""

        results.append({
            "query": keyword,
            "standard_number": info.get("标准编号", ""),
            "title": info.get("标准名称", ""),
            "status": status,
            "publisher": "",
            "publish_date": info.get("发布日期", ""),
            "replaced_by": "",
            "category": "",
            "ics": "",
        })

    return results


def _normalize_std_no(s: str) -> str:
    return s.replace(" ", "").replace("－", "-").lower()


def _std_base(s: str) -> str:
    import re
    m = re.match(r"^(.*?)[-–]\d{4}$", s.replace(" ", ""))
    return m.group(1) if m else ""


def query_cssn(keyword: str) -> list[dict]:
    """从 cssn.net.cn 查询标准"""
    try:
        resp = requests.get(CSSN_API_URL, params={"keyword": keyword}, headers={
            **HEADERS,
            "Accept": "application/json",
        }, timeout=15)
        data = resp.json()
    except requests.RequestException as e:
        print(f"[错误] cssn 请求失败: {keyword} - {e}", file=sys.stderr)
        return []
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[错误] cssn 解析失败: {keyword} - {e}", file=sys.stderr)
        return []

    query_norm = _normalize_std_no(keyword)
    filtered = []
    for r in data.get("results", []):
        std_no = r.get("a100", "")
        std_norm = _normalize_std_no(std_no)
        if query_norm not in std_norm and std_norm not in query_norm:
            continue
        filtered.append(r)

    current_map = {}
    for r in filtered:
        if r.get("a000") == "现行":
            base = _std_base(r.get("a100", ""))
            if base:
                current_map[base] = r["a100"]

    results = []
    for r in filtered:
        std_no = r.get("a100", "")
        status = r.get("a000", "")
        replaced_by = current_map[_std_base(std_no)] if status == "被代替" else ""
        results.append({
            "query": keyword,
            "standard_number": std_no,
            "title": r.get("a298", ""),
            "status": status,
            "publisher": "",
            "publish_date": r.get("a101", ""),
            "replaced_by": replaced_by or "",
            "category": "",
            "ics": "",
        })

    return results


def query_standard(keyword: str) -> list[dict]:
    """查询单个标准编号：先 cssn.net.cn，再工标库"""
    results = query_cssn(keyword)
    if not results:
        results = query_gongbiaoku(keyword)
    return results


def read_keywords_from_file(filepath: str) -> list[str]:
    """从文件读取标准编号"""
    path = Path(filepath)
    if not path.exists():
        print(f"[错误] 文件不存在: {filepath}", file=sys.stderr)
        sys.exit(1)

    keywords = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            keywords.append(line)
    return keywords


def main():
    parser = argparse.ArgumentParser(description="标准查新工具 - 批量查询国家标准状态")
    parser.add_argument("keywords", nargs="*", help="标准编号（如 50222 50010）")
    parser.add_argument("-f", "--file", help="从文件读取标准编号（每行一个）")
    parser.add_argument("-o", "--output", default="results.json", help="输出 JSON 文件路径（默认 results.json）")
    parser.add_argument("-d", "--delay", type=float, default=1.0, help="查询间隔秒数（默认 1.0）")
    parser.add_argument("--no-file", action="store_true", help="不输出 JSON 文件，仅终端显示")
    args = parser.parse_args()

    keywords = list(args.keywords)
    if args.file:
        keywords.extend(read_keywords_from_file(args.file))

    if not keywords:
        parser.error("请提供至少一个标准编号或使用 -f 指定文件")

    all_results = []
    total = len(keywords)

    for i, kw in enumerate(keywords, 1):
        print(f"[{i}/{total}] 查询: {kw} ... ", end="", flush=True)
        results = query_standard(kw)
        all_results.extend(results)
        if results:
            print(f"找到 {len(results)} 条结果")
        else:
            print("无结果")
        if i < total:
            time.sleep(args.delay)

    if args.no_file:
        return

    output_path = Path(args.output)
    output_path.write_text(json.dumps(all_results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n结果已保存到 {output_path}（共 {len(all_results)} 条）")


if __name__ == "__main__":
    main()
