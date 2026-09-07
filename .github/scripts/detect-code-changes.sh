#!/usr/bin/env bash
set -euo pipefail

event_name=${1:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
repository=${2:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
pull_request_number=${3:-}

# code: anything outside docs, so static checks run.
# e2e:  anything the Playwright suite can observe. The suite boots the web
#       dev server (packages/web, which imports only packages/core) against
#       stubbed routes; packages/backend, packages/sync, and packages/scripts
#       are never loaded, so a PR that touches only those skips the e2e
#       shards.
# core/web/backend/sync/scripts: unit-leg filters. packages/core, the root
#       lockfile, root package.json, or a root tsconfig run every leg.
#       Otherwise only the packages the PR touched run. e2e/ and
#       playwright.config.ts also run scripts (the shard-list contract).
# merge_group and push runs always run everything, so nothing reaches
# main untested.
set_outputs() {
  local code=$1 e2e=$2 core=$3 web=$4 backend=$5 sync=$6 scripts=$7
  {
    printf 'code=%s\n' "$code"
    printf 'e2e=%s\n' "$e2e"
    printf 'core=%s\n' "$core"
    printf 'web=%s\n' "$web"
    printf 'backend=%s\n' "$backend"
    printf 'sync=%s\n' "$sync"
    printf 'scripts=%s\n' "$scripts"
  } >>"$GITHUB_OUTPUT"
  printf 'Non-docs changes: %s\n' "$code"
  printf 'E2E-reachable changes: %s\n' "$e2e"
  printf 'Unit legs: core=%s web=%s backend=%s sync=%s scripts=%s\n' \
    "$core" "$web" "$backend" "$sync" "$scripts"
}

all_true() {
  set_outputs true true true true true true true
}

matches_any() {
  local pattern=$1
  printf '%s\n' "$code_files" | grep -E "$pattern" >/dev/null
}

if [ "$event_name" != "pull_request" ]; then
  all_true
  exit 0
fi

: "${pull_request_number:?pull request number is required}"

if ! files=$(gh api --paginate \
  "repos/${repository}/pulls/${pull_request_number}/files" \
  --jq '.[].filename'); then
  echo "Could not read pull request files; running checks." >&2
  all_true
  exit 0
fi

# Drain the full list instead of using grep -q, which can make pipefail treat
# printf's SIGPIPE as a failure on large pull requests.
code_files=$(printf '%s\n' "$files" |
  grep -vE '(\.md$|^docs/|^\.gitignore$)' || true)
e2e_files=$(printf '%s\n' "$code_files" |
  grep -vE '^packages/(backend|sync|scripts)/' || true)

# An empty response is unverified, so run the checks.
if [ -z "$files" ]; then
  all_true
  exit 0
fi

code=false
e2e=false
core=false
web=false
backend=false
sync=false
scripts=false
[ -n "$code_files" ] && code=true
[ -n "$e2e_files" ] && e2e=true

if [ -n "$code_files" ]; then
  if matches_any '^(packages/core/|package.json$|bun.lock$|tsconfig[^/]*$)'; then
    core=true
    web=true
    backend=true
    sync=true
    scripts=true
  else
    matches_any '^packages/web/' && web=true
    matches_any '^packages/backend/' && backend=true
    matches_any '^packages/sync/' && sync=true
    if matches_any '^packages/scripts/' ||
      matches_any '^e2e/' ||
      matches_any '^playwright.config.ts$'; then
      scripts=true
    fi
  fi
fi

set_outputs "$code" "$e2e" "$core" "$web" "$backend" "$sync" "$scripts"
