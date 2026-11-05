#!/bin/sh
# 試験版のビルド。AGPL の対応ソースを同じ配信元から取得できるよう、ソース一式を dist に同梱する。
# 解説データは別管理で、第2引数のファイルをソースに含めず dist に置く。
set -eu
cd "$(dirname "$0")/.."
VITE_SHOW_DRAFTS=1 VITE_BUILD_VERSION="${1:-試験版}" VITE_SOURCE_URL="source.tar.gz" npx vite build
COPYFILE_DISABLE=1 tar -czf dist/source.tar.gz --exclude=./node_modules --exclude=./dist --exclude=./.git --exclude=./.DS_Store --exclude=./test-results --exclude=./playwright-report --exclude='__pycache__' --exclude='.pytest_cache' --exclude='.venv' .
if [ -n "${2:-}" ]; then cp "$2" dist/content/ja.json; fi
