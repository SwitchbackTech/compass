#!/usr/bin/env bash
set -euo pipefail

event_name=${1:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
repository=${2:?usage: detect-code-changes.sh <event-name> <repository> [pull-request-number]}
pull_request_number=${3:-}

set_code_output() {
  printf 'code=%s\n' "$1" >>"$GITHUB_OUTPUT"
  printf 'Non-docs changes: %s\n' "$1"
}

if [ "$event_name" != "pull_request" ]; then
  set_code_output true
  exit 0
fi

: "${pull_request_number:?pull request number is required}"

if ! files=$(gh api --paginate \
  "repos/${repository}/pulls/${pull_request_number}/files" \
  --jq '.[].filename'); then
  echo "Could not read pull request files; running checks." >&2
  set_code_output true
  exit 0
fi

# Drain the full list instead of using grep -q, which can make pipefail treat
# printf's SIGPIPE as a failure on large pull requests.
code_files=$(printf '%s\n' "$files" |
  grep -vE '(\.md$|^docs/|^\.gitignore$)' || true)

# An empty response is unverified, so run the checks.
if [ -z "$files" ] || [ -n "$code_files" ]; then
  set_code_output true
else
  set_code_output false
fi
