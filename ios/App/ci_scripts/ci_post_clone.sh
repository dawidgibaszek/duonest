#!/bin/sh
set -eu

repo_root="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$repo_root"

node_major="$(cat .nvmrc)"
if ! command -v node >/dev/null 2>&1 ||
   [ "$(node -p 'process.versions.node.split(".")[0]')" != "$node_major" ]; then
  brew install "node@$node_major"
  export PATH="$(brew --prefix "node@$node_major")/bin:$PATH"
fi

node --version
npm ci --include=dev --no-audit --no-fund
npm run ios:build
