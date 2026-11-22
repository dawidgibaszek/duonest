#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
reviewer="${DUONEST_CODEX_BIN:-$HOME/.local/share/duonest-cezar/node_modules/.bin/codex}"
if [[ ! -x "$reviewer" || "$("$reviewer" --version)" != 'codex-cli 0.169.0' ]]; then
  printf '%s\n' 'Cezar wymaga Codex CLI 0.169.0 dla recenzji w trybie odczytu.' >&2
  exit 1
fi

cezar_version=0.21.0-nightly.20261122.123
export CEZ_AGY_BIN="$root/scripts/cezar/agy"
export CEZ_CODEX_BIN="$reviewer"
export CEZ_CODEX_NETWORK=0
export CEZ_WORKTREE_DEFAULT=1
export CEZ_TERMINAL=0
export DUONEST_CEZAR_CONFIGURED=1
export DUONEST_CEZAR_ROOT="$root"
if [[ ! -x /usr/bin/sandbox-exec ]]; then
  printf '%s\n' 'Wymagana jest lokalna izolacja vaultu w macOS.' >&2
  exit 1
fi
cd "$root"
exec npx --yes "@open-mercato/cezar@$cezar_version" --bind-host 127.0.0.1 "$@"
