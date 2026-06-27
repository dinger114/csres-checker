#!/bin/bash
set -e

echo "Building for production..."

# 创建输出目录
rm -rf dist
mkdir -p dist

# 复制静态文件
cp index.html dist/
cp CNAME dist/ 2>/dev/null || true
cp .nojekyll dist/ 2>/dev/null || true
cp robots.txt dist/ 2>/dev/null || true

# 替换 Firebase API Key（\$ 防止 bash 展开 pattern）
if [ -n "$FIREBASE_API_KEY" ]; then
  sed -i 's/\${FIREBASE_API_KEY}/'"${FIREBASE_API_KEY}"'/g' dist/index.html
  echo "Replaced FIREBASE_API_KEY"
fi

# 替换 Turnstile Site Key
if [ -n "$TURNSTILE_SITE_KEY" ]; then
  sed -i 's/0x4AAAAAAAPlaceholder/'"${TURNSTILE_SITE_KEY}"'/g' dist/index.html
  echo "Replaced TURNSTILE_SITE_KEY"
fi

# 验证替换结果
echo "--- Verify ---"
grep -o "FIREBASE_API_KEY.*" dist/index.html | head -1
grep -o "TURNSTILE_SITE_KEY.*" dist/index.html | head -1

echo "Build complete! Output in dist/"
ls -la dist/
