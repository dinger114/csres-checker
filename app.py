#!/usr/bin/env python3
"""标准查新工具 - Web 界面"""

import json
from flask import Flask, render_template, request, jsonify
from csres_checker import query_standard

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/query", methods=["POST"])
def api_query():
    data = request.get_json()
    if not data or "keywords" not in data:
        return jsonify({"error": "请提供标准编号"}), 400

    keywords = [kw.strip() for kw in data["keywords"].split("\n") if kw.strip()]
    if not keywords:
        return jsonify({"error": "请输入至少一个标准编号"}), 400

    all_results = []
    for kw in keywords:
        results = query_standard(kw)
        all_results.extend(results)

    return jsonify({"results": all_results, "total": len(all_results)})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
