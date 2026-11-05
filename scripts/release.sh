#!/bin/sh
# 本番用のビルド。公開済みのタグからのみ作り、配信物とソースの版を一致させる。
# 使い方: release.sh <タグ> <解説データ ja.json> [--deploy]  (--deploy なしは検証のみ)
set -eu
TAG=$1; CONTENT=$2; MODE=${3:-}
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "未コミットの変更があります"; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse "refs/tags/$TAG^{commit}")" ] || { echo "HEAD がタグ $TAG と一致しません"; exit 1; }
VITE_BUILD_VERSION="$TAG" VITE_SOURCE_URL="https://github.com/morikawa1212/birth-profile-lab/tree/$TAG" npx vite build
cp "$CONTENT" dist/content/ja.json
if [ "$MODE" = "--deploy" ]; then npx wrangler deploy; else npx wrangler deploy --dry-run; fi
