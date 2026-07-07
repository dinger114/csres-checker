#!/bin/bash
set -e

echo "Building for production..."

# Install dependencies
npm ci

# Build with Vite (env vars VITE_* are injected at build time)
npm run build

# Copy static files to dist/
cp CNAME dist/ 2>/dev/null || true
cp .nojekyll dist/ 2>/dev/null || true
cp robots.txt dist/ 2>/dev/null || true

echo "Build complete! Output in dist/"
ls -la dist/
