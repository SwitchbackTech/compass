#!/usr/bin/env bash
set -euo pipefail

event_name=${1:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
repository=${2:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
pull_request_number=${3:-}

# code: anything outside docs, so the Unit legs and static checks run.
# e2e:  anything the Playwright suite can observe. The suite boots the web
#       dev server (packages/web, which imports only packages/core) against
#       stubbed routes; packages/backend, packages/sync, and packages/scripts
#       are never loaded, so a PR that touches only those skips the e2e
#       shards. merge_group and push runs always run everything, so nothing
#       reaches main untested.
set_outputs() {
  printf 'code=%s\ne2e=%s\n' "$1" "$2" >>"$GITHUB_OUTPUT"
  printf 'Non-docs changes: %s\nE2E-reachable changes: %s\n' "$1" "$2"
}

if [ "$event_name" != "pull_request" ]; then
  set_outputs true true
  exit 0
fi

: "${pull_request_number:?pull request number is required}"

if ! files=$(gh api --paginate \
  "repos/${repository}/pulls/${pull_request_number}/files" \
  --jq '.[].filename'); then
  echo "Could not read pull request files; running checks." >&2
  set_outputs true true
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
  set_outputs true true
  exit 0
fi

code=false
e2e=false
[ -n "$code_files" ] && code=true
[ -n "$e2e_files" ] && e2e=true
set_outputs "$code" "$e2e"
