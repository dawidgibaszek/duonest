#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)
worktree=$(pwd -P)
if [[ "$worktree" != "$root"/.ai/cezar/worktrees/* ]]; then
  printf '%s\n' 'Ten krok wymaga wydzielonej kopii roboczej Cezara.' >&2
  exit 1
fi

exec /usr/bin/sandbox-exec -f "$root/scripts/cezar/agy.sb" \
  -D "DUONEST_VAULT=$HOME/Documents/AI Memory" \
  -D "DUONEST_REPO=$root" -D "DUONEST_WORKTREE=$worktree" \
  -D "DUONEST_HANDOFF=$root/.ai/cezar/runs/${worktree##*/}.handoff.md" \
  "$@"
