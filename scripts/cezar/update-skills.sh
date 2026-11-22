#!/usr/bin/env bash
set -euo pipefail

api=http://127.0.0.1:4321/api/v1/workspace/skills-update
payload='{"projectId":"duonest"}'

if ! /usr/bin/curl --silent --fail --connect-timeout 2 --max-time 3 "$api?projectId=duonest" >/dev/null; then
  printf '%s\n' 'Cezar offline. Skills will be checked when it starts.'
  exit 0
fi

request() {
  /usr/bin/curl --silent --show-error --fail --max-time 180 \
    --header 'Content-Type: application/json' --data "$payload" "$api/$1"
}

state=$(request check)
action=$(node -e '
const state = JSON.parse(process.argv[1])
const project = state.scopes.find(scope => scope.scope === "project")
const global = state.scopes.find(scope => scope.scope === "global")
if (["error", "unavailable"].includes(project?.status)) {
  console.error(project.reason ?? "The project skill check failed.")
  process.exit(1)
}
console.log(project?.available && !global?.available && state.autoUpdateEnabled ? "apply" : "skip")
' "$state")

if [[ "$action" == apply ]]; then
  request apply
  printf '\n'
else
  printf '%s\n' 'No project skill update to apply.'
fi
