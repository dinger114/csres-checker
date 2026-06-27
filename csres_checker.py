#!/usr/bin/env python3
"""标准查新工具 - 批量查询国家标准状态"""

import argparse
import json
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "http://www.csres.com/s.jsp"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def query_standard(keyword: str) -> list[dict]:
    """查询单个标准编号"""
    try:
        resp = requests.get(BASE_URL, params={"keyword": keyword}, headers=HEADERS, timeout=10)
        resp.encoding = "gbk"
    except requests.RequestException as e:
        print(f"[错误] 请求失败: {keyword} - {e}", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    for tr in soup.find_all("tr", bgcolor="#FFFFFF"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue

        title_tag = tr.get("title", "")
        info = {}
        for line in title_tag.split("\n"):
            if "：" in line:
                key, _, value = line.partition("：")
                info[key.strip()] = value.strip()

        results.append({
            "query": keyword,
            "standard_number": tds[0].get_text(strip=True).lstrip("\xa0"),
            "title": tds[1].get_text(strip=True).lstrip("\xa0"),
            "status": tds[4].get_text(strip=True).lstrip("\xa0"),
            "publisher": info.get("发布部门", ""),
            "publish_date": info.get("发布日期", ""),
            "replaced_by": info.get("替代情况", ""),
            "category": info.get("分类", ""),
            "ics": info.get("ICS", ""),
        })

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
