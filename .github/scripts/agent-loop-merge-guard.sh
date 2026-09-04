#!/usr/bin/env bash
# Deterministic re-check for an agent-loop PR, then GitHub auto-merge.
# The agent's `agent-automerge` label is necessary but not sufficient:
# this script independently re-verifies size rails and sensitive paths, and
# refuses while main itself is red so the loop cannot stack merges on a
# broken base.
#
# It does not wait on CI. `gh pr merge --auto` hands the wait to GitHub,
# which squash-merges when the required checks pass; a runner that sat
# watching checks for up to 20 minutes was what starved the loop's
# concurrency group on 2026-09-03.
#
# Per-milestone allowlists under .github/agent-loop/allowlists/<slug>.txt
# can re-allow a refused path prefix for new code (providers adapters).
#
# Uses GH_TOKEN from AGENT_LOOP_GITHUB_TOKEN, BOOKING_LOOP_GITHUB_TOKEN, or
# AUTOFIX_GITHUB_TOKEN so the merge push triggers release-on-main
# (GITHUB_TOKEN merges do not).
set -uo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/agent-loop-lib.sh"

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

MAX_FILES=${AGENT_LOOP_MAX_FILES:-${BOOKING_LOOP_MAX_FILES:-60}}
MAX_LINES=${AGENT_LOOP_MAX_LINES:-${BOOKING_LOOP_MAX_LINES:-4000}}
DRY_RUN=${AGENT_LOOP_GUARD_DRY_RUN:-}

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

if [ -z "$DRY_RUN" ] && [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN is empty. Set AGENT_LOOP_GITHUB_TOKEN, BOOKING_LOOP_GITHUB_TOKEN, or AUTOFIX_GITHUB_TOKEN so squash-merge triggers release-on-main." >&2
  exit 1
fi

milestone_title_for_pr() {
  local pr_number=$1
  if [ -n "${AGENT_LOOP_GUARD_MILESTONE:-}" ]; then
    printf '%s' "$AGENT_LOOP_GUARD_MILESTONE"
    return 0
  fi
  local issue_number
  issue_number=$(gh pr view "$pr_number" --repo "$REPO" --json body --jq '.body' 2>/dev/null |
    grep -oE '[Ff]ixes #[0-9]+' | grep -oE '[0-9]+' | head -n1)
  if [ -z "$issue_number" ]; then
    return 0
  fi
  gh issue view "$issue_number" --repo "$REPO" --json milestone --jq '.milestone.title // empty' 2>/dev/null || true
}

load_allowlist() {
  local title=$1
  local slug
  slug=$(milestone_slug "$title")
  read_allowlist_patterns "$slug"
}

downgrade() {
  local pr_number=$1
  local reason=$2
  if [ -n "$DRY_RUN" ]; then
    printf 'downgrade: %s\n' "$reason"
    return 0
  fi
  notify "Agent-loop PR #${pr_number} ${reason}; leaving for human review: https://github.com/${REPO}/pull/${pr_number}"
  gh pr merge "$pr_number" --repo "$REPO" --disable-auto 2>/dev/null || true
  gh pr edit "$pr_number" --repo "$REPO" --remove-label "$AUTOMERGE_LABEL" 2>/dev/null || true
  gh pr edit "$pr_number" --repo "$REPO" --remove-label "$LEGACY_AUTOMERGE_LABEL" 2>/dev/null || true
  gh pr edit "$pr_number" --repo "$REPO" --add-label "$NEEDS_HUMAN_LABEL" 2>/dev/null || true
  local issue_number
  issue_number=$(gh pr view "$pr_number" --repo "$REPO" --json body --jq '.body' 2>/dev/null |
    grep -oE '[Ff]ixes #[0-9]+' | grep -oE '[0-9]+' | head -n1)
  if [ -n "$issue_number" ]; then
    gh issue comment "$issue_number" --repo "$REPO" \
      --body "${COMMENT_PREFIX} merge-guard refused #${pr_number}: ${reason}. Added \`${NEEDS_HUMAN_LABEL}\`." \
      2>/dev/null || true
    gh issue edit "$issue_number" --repo "$REPO" \
      --add-label "$NEEDS_HUMAN_LABEL" --remove-label "$RUNNING_LABEL" \
      --remove-label "$LEGACY_RUNNING_LABEL" 2>/dev/null || true
  fi
}

find_prs() {
  if [ -n "$PR_NUMBER" ]; then
    printf '%s\n' "$PR_NUMBER"
    return 0
  fi
  if [ -n "$DRY_RUN" ]; then
    return 0
  fi
  local new_prs legacy_prs
  new_prs=$(gh pr list --repo "$REPO" --label "$AUTOMERGE_LABEL" --state open \
    --json number --jq '.[].number')
  legacy_prs=$(gh pr list --repo "$REPO" --label "$LEGACY_AUTOMERGE_LABEL" --state open \
    --json number --jq '.[].number')
  printf '%s\n%s\n' "$new_prs" "$legacy_prs" | awk 'NF && !seen[$0]++'
}

pr_has_automerge() {
  local labels=$1
  printf '%s\n' "$labels" | grep -qx "$AUTOMERGE_LABEL" \
    || printf '%s\n' "$labels" | grep -qx "$LEGACY_AUTOMERGE_LABEL"
}

evaluate_paths() {
  local pr_number=$1
  local changed_files_list=$2
  local milestone_title=$3

  mapfile -t allow_patterns < <(load_allowlist "$milestone_title")
  local slug
  slug=$(milestone_slug "$milestone_title")

  local allowlist_hit=0
  local path
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if [ "${#allow_patterns[@]}" -gt 0 ] && file_matches_patterns "$path" "${allow_patterns[@]}"; then
      allowlist_hit=1
    fi
  done <<<"$changed_files_list"

  local pattern
  for pattern in "${NO_AUTOMERGE_PATH_PATTERNS[@]}"; do
    while IFS= read -r path; do
      [ -n "$path" ] || continue
      if ! printf '%s\n' "$path" | grep -Eiq "$pattern"; then
        continue
      fi
      if [ "${#allow_patterns[@]}" -gt 0 ] && file_matches_patterns "$path" "${allow_patterns[@]}"; then
        continue
      fi
      downgrade "$pr_number" "touches a path that may not auto-merge (matches ${pattern})"
      return 1
    done <<<"$changed_files_list"
  done

  if [ "$allowlist_hit" -eq 1 ]; then
    if [[ "$slug" == providers-* ]]; then
      printf 'allowed by providers allowlist\n'
    else
      printf 'allowed by %s allowlist\n' "$slug"
    fi
  fi
  return 0
}

# The latest push run of each required workflow on main. A red main means the
# base is broken; merging more on top hides which change broke it. Fails
# closed: an unreadable result counts as red.
main_is_red() {
  local workflow conclusion
  for workflow in test-unit.yml test-e2e.yml; do
    conclusion=$(gh run list --repo "$REPO" --workflow "$workflow" --branch main \
      --event push --status completed --limit 1 --json conclusion \
      --jq '.[0].conclusion // "unknown"' 2>/dev/null || echo "unknown")
    case "$conclusion" in
      success|skipped|cancelled) ;;
      *)
        printf 'main %s latest push run: %s\n' "$workflow" "$conclusion"
        return 0
        ;;
    esac
  done
  return 1
}

check_and_merge() {
  local pr_number=$1

  if [ -z "$DRY_RUN" ]; then
    local labels
    labels=$(gh pr view "$pr_number" --repo "$REPO" --json labels --jq '.labels[].name' 2>/dev/null || true)
    if ! pr_has_automerge "$labels"; then
      printf 'PR #%s does not have %s; skipping\n' "$pr_number" "$AUTOMERGE_LABEL"
      return 0
    fi
  fi

  local changed_files_list changed_files total_lines milestone_title
  if [ -n "${AGENT_LOOP_GUARD_FILES:-}" ]; then
    changed_files_list=$AGENT_LOOP_GUARD_FILES
  elif ! changed_files_list=$(gh pr diff "$pr_number" --repo "$REPO" --name-only); then
    downgrade "$pr_number" "could not verify changed files (gh pr diff failed), treating as unsafe"
    return 0
  fi
  changed_files=$(printf '%s\n' "$changed_files_list" | grep -c . || true)

  milestone_title=$(milestone_title_for_pr "$pr_number")
  if ! evaluate_paths "$pr_number" "$changed_files_list" "$milestone_title"; then
    return 0
  fi

  if [ "$changed_files" -gt "$MAX_FILES" ]; then
    downgrade "$pr_number" "touches ${changed_files} files (limit ${MAX_FILES})"
    return 0
  fi

  if [ -n "$DRY_RUN" ]; then
    printf 'proceed\n'
    return 0
  fi

  if ! total_lines=$(gh pr view "$pr_number" --repo "$REPO" --json additions,deletions \
    --jq '.additions + .deletions') || [ -z "$total_lines" ]; then
    downgrade "$pr_number" "could not verify line count (gh pr view failed), treating as unsafe"
    return 0
  fi
  if [ "$total_lines" -gt "$MAX_LINES" ]; then
    downgrade "$pr_number" "changes ${total_lines} lines (limit ${MAX_LINES})"
    return 0
  fi

  if main_is_red; then
    printf 'main is red; not enabling auto-merge on PR #%s. The scheduled sweep retries.\n' "$pr_number"
    return 0
  fi

  local auto_merge
  auto_merge=$(gh pr view "$pr_number" --repo "$REPO" --json autoMergeRequest \
    --jq '.autoMergeRequest.enabledAt // ""' 2>/dev/null || true)
  if [ -n "$auto_merge" ]; then
    printf 'auto-merge already enabled on PR #%s\n' "$pr_number"
    return 0
  fi

  if ! gh pr merge "$pr_number" --repo "$REPO" --auto --squash --delete-branch; then
    notify "Agent-loop PR #${pr_number} passed verification but \`gh pr merge --auto\` failed: https://github.com/${REPO}/pull/${pr_number}"
    return 0
  fi
  printf 'enabled auto-merge on agent PR #%s; GitHub squash-merges when required checks pass\n' "$pr_number"
}

main() {
  local prs pr
  if [ -n "$DRY_RUN" ]; then
    check_and_merge "${PR_NUMBER:-0}"
    return 0
  fi
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
