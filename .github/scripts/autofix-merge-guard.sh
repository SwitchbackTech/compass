#!/usr/bin/env bash
# Deterministic re-check before enabling auto-merge on an agent-authored fix
# PR. The agent's own confidence judgment (the `automerge-candidate` label,
# applied per the rubric in .github/prompts/error-autofix.md) is necessary
# but not sufficient — this script independently re-verifies the hard safety
# rails so a mistaken or prompt-injected agent run can never merge past them.
#
# Only runs when AUTOFIX_MODE=merge (see .github/workflows/error-autofix.yml).
# Inert (no PR to find) during Phase 1/2 rollout.
set -uo pipefail

ISSUE_NUMBER=${1:?usage: autofix-merge-guard.sh <issue-number>}
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/autofix-lib.sh"

# Paths an autofix PR may not AUTO-MERGE past, even if the agent judged
# itself confident. This is a merge gate, not a rule about what the agent may
# author: a fix that genuinely needs one of these paths should still be opened
# as a PR (see error-autofix.md), it just always waits for a human. Kept here
# as the authoritative, non-LLM-bypassable copy.
#
# The bare 'billing'/'stripe' substrings only catch files whose PATH mentions
# them (e.g. packages/*/src/billing/**). Several files carry real Stripe
# wiring — env validation, webhook signature verification — without either
# word in their path; those are listed explicitly below rather than trying
# to keep a substring pattern in sync with every such file forever.
NO_AUTOMERGE_PATH_PATTERNS=(
  '^\.github/'
  '^self-host/'
  '^packages/backend/src/auth/'
  '^packages/core/src/logger/'
  '^packages/backend/src/logging/'
  '^packages/sync/src/telemetry/'
  'billing'
  'stripe'
  '^packages/core/src/config/compass\.config\.ts$'
  '^packages/core/src/types/user\.types\.ts$'
  '^packages/backend/src/common/constants/config\.constants\.ts$'
  '^packages/backend/src/common/constants/config\.util\.ts$'
  '^packages/backend/src/config/controllers/config\.controller\.ts$'
  '^packages/backend/src/servers/express/express\.server\.ts$'
  '(^|/)package\.json$'
  '(^|/)bun\.lock$'
)

MAX_FILES=8
MAX_LINES=250

downgrade() {
  local pr_number=$1
  local reason=$2
  notify "Autofix PR #${pr_number} (issue #${ISSUE_NUMBER}) ${reason}; leaving for human review — https://github.com/${REPO}/pull/${pr_number}"
  gh pr edit "$pr_number" --repo "$REPO" \
    --remove-label automerge-candidate --add-label "autofix:needs-human" 2>/dev/null || true
}

find_pr() {
  gh pr list --repo "$REPO" --label automerge-candidate --state open \
    --search "Fixes #${ISSUE_NUMBER} in:body" \
    --json number --jq '.[0].number' 2>/dev/null
}

main() {
  local pr_number
  pr_number=$(find_pr)

  if [ -z "$pr_number" ] || [ "$pr_number" = "null" ]; then
    printf 'no automerge-candidate PR found for issue #%s\n' "$ISSUE_NUMBER"
    return 0
  fi

  # Every check below must fail CLOSED: if the `gh` call itself errors (rate
  # limit, transient network blip), an empty result must never be read as
  # "0 files changed" / "0 lines changed" and let the PR sail through — that
  # would silently defeat the one gate that's supposed to be non-bypassable.
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

  # Merge queue owns the strategy and the repo deletes branches on merge.
  # Carry gh's own error into the notice: without it the 2026-09-06 token
  # permission failure read as a generic "failed" and took a log dig to find.
  local merge_error
  if ! merge_error=$(gh pr merge "$pr_number" --repo "$REPO" --auto 2>&1); then
    printf '%s\n' "$merge_error" >&2
    notify "Autofix PR #${pr_number} (issue #${ISSUE_NUMBER}) passed the merge guard but \`gh pr merge --auto\` failed (${merge_error%%$'\n'*}); needs a human to enable merge manually: https://github.com/${REPO}/pull/${pr_number}"
    return 0
  fi
  # Do not watch CI here: this job runs under a cancel-in-progress:false
  # queue, so a runner sitting in `gh pr checks --watch` blocked the next
  # PostHog issue for up to 15 minutes. GitHub merges when checks pass.
  printf 'enabled auto-merge on PR #%s\n' "$pr_number"
}

main
