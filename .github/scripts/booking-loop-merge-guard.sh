#!/usr/bin/env bash
# Deterministic re-check, verification wait, and squash-merge for a Booking
# loop PR.
# The agent's `booking-automerge` label is necessary but not sufficient —
# this script independently re-verifies size rails and sensitive paths.
#
# Uses GH_TOKEN from BOOKING_LOOP_GITHUB_TOKEN or AUTOFIX_GITHUB_TOKEN so
# the merge push triggers release-on-main (GITHUB_TOKEN merges do not).
set -uo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/booking-loop-lib.sh"

PR_NUMBER=${1:-}

NO_AUTOMERGE_PATH_PATTERNS=(
  '^\.github/'
  '^self-host/'
  '^packages/backend/src/auth/'
  '^packages/web/src/auth/'
  '^packages/web/src/supertokens\.ts$'
  '^packages/core/src/logger/'
  '^packages/backend/src/logging/'
  '^packages/sync/src/telemetry/'
  'billing'
  'stripe'
  '^packages/core/src/config/'
)

MAX_FILES=${BOOKING_LOOP_MAX_FILES:-60}
MAX_LINES=${BOOKING_LOOP_MAX_LINES:-4000}

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

if [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN is empty. Set BOOKING_LOOP_GITHUB_TOKEN or AUTOFIX_GITHUB_TOKEN so squash-merge triggers release-on-main." >&2
  exit 1
fi

downgrade() {
  local pr_number=$1
  local reason=$2
  notify "Booking-loop PR #${pr_number} ${reason}; leaving for human review: https://github.com/${REPO}/pull/${pr_number}"
  gh pr edit "$pr_number" --repo "$REPO" \
    --remove-label "$AUTOMERGE_LABEL" --add-label "$NEEDS_HUMAN_LABEL" 2>/dev/null || true
  local issue_number
  issue_number=$(gh pr view "$pr_number" --repo "$REPO" --json body --jq '.body' 2>/dev/null |
    grep -oE '[Ff]ixes #[0-9]+' | grep -oE '[0-9]+' | head -n1)
  if [ -n "$issue_number" ]; then
    gh issue comment "$issue_number" --repo "$REPO" \
      --body "booking-loop: merge-guard refused #${pr_number}: ${reason}. Added \`${NEEDS_HUMAN_LABEL}\`." \
      2>/dev/null || true
    gh issue edit "$issue_number" --repo "$REPO" \
      --add-label "$NEEDS_HUMAN_LABEL" --remove-label "$RUNNING_LABEL" 2>/dev/null || true
  fi
}

find_prs() {
  if [ -n "$PR_NUMBER" ]; then
    printf '%s\n' "$PR_NUMBER"
    return 0
  fi
  gh pr list --repo "$REPO" --label "$AUTOMERGE_LABEL" --state open \
    --json number --jq '.[].number'
}

check_and_merge() {
  local pr_number=$1

  local labels
  labels=$(gh pr view "$pr_number" --repo "$REPO" --json labels --jq '.labels[].name' 2>/dev/null || true)
  if ! printf '%s\n' "$labels" | grep -qx "$AUTOMERGE_LABEL"; then
    printf 'PR #%s does not have %s; skipping\n' "$pr_number" "$AUTOMERGE_LABEL"
    return 0
  fi

  local changed_files_list changed_files total_lines
  if ! changed_files_list=$(gh pr diff "$pr_number" --repo "$REPO" --name-only); then
    downgrade "$pr_number" "could not verify changed files (gh pr diff failed) — treating as unsafe"
    return 0
  fi
  changed_files=$(printf '%s\n' "$changed_files_list" | grep -c . || true)

  for pattern in "${NO_AUTOMERGE_PATH_PATTERNS[@]}"; do
    if printf '%s\n' "$changed_files_list" | grep -Eiq "$pattern"; then
      downgrade "$pr_number" "touches a path that may not auto-merge (matches ${pattern})"
      return 0
    fi
  done

  if [ "$changed_files" -gt "$MAX_FILES" ]; then
    downgrade "$pr_number" "touches ${changed_files} files (limit ${MAX_FILES})"
    return 0
  fi

  if ! total_lines=$(gh pr view "$pr_number" --repo "$REPO" --json additions,deletions \
    --jq '.additions + .deletions') || [ -z "$total_lines" ]; then
    downgrade "$pr_number" "could not verify line count (gh pr view failed) — treating as unsafe"
    return 0
  fi
  if [ "$total_lines" -gt "$MAX_LINES" ]; then
    downgrade "$pr_number" "changes ${total_lines} lines (limit ${MAX_LINES})"
    return 0
  fi

  if ! gh pr checks "$pr_number" --repo "$REPO" --watch --fail-fast; then
    notify "Booking-loop PR #${pr_number} failed CI after merge-guard verification: https://github.com/${REPO}/pull/${pr_number}"
    return 0
  fi

  if ! gh pr merge "$pr_number" --repo "$REPO" --squash --delete-branch; then
    notify "Booking-loop PR #${pr_number} passed verification but direct squash-merge failed: https://github.com/${REPO}/pull/${pr_number}"
    return 0
  fi
  printf 'squash-merged booking PR #%s\n' "$pr_number"
}

main() {
  local prs pr
  prs=$(find_prs)
  if [ -z "$prs" ]; then
    printf 'no %s PR found\n' "$AUTOMERGE_LABEL"
    return 0
  fi
  while IFS= read -r pr; do
    [ -n "$pr" ] || continue
    check_and_merge "$pr"
  done <<<"$prs"
}

main
