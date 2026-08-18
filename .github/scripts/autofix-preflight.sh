#!/usr/bin/env bash
# Deterministic gate that runs before the error-autofix LLM agent. These
# checks are cheap on purpose: a runaway loop (e.g. a merged fix that itself
# causes new PostHog issues) should be caught here, before it burns agent
# turns, and should page a human via Discord rather than spin silently.
set -uo pipefail

ISSUE_NUMBER=${1:?usage: autofix-preflight.sh <issue-number>}
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/autofix-lib.sh"

proceed() {
  printf 'proceed=%s\n' "$1" >>"$GITHUB_OUTPUT"
}

# Runs only under runs-on: ubuntu-latest (see error-autofix.yml), where GNU
# date's "N hours ago" form is always available — no BSD fallback needed.
since_hours_ago() {
  date -u -d "${1} hours ago" +%Y-%m-%dT%H:%M:%SZ
}

already_labeled() {
  gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels \
    --jq '.labels[].name' | grep -qx 'autofix'
}

# More than 3 posthog[bot] issues in 6h suggests a systemic incident (an
# outage, a bad deploy) rather than N independent bugs — a human should
# triage the incident, not N parallel agent runs.
too_many_recent_issues() {
  local since count
  since=$(since_hours_ago 6)
  count=$(gh api "repos/${REPO}/issues?state=all&creator=posthog%5Bbot%5D&since=${since}" \
    --jq 'length' 2>/dev/null)
  [ "${count:-0}" -gt 3 ]
}

# 2+ autofix merges in 2h is the feedback-loop signature: a fix landing,
# triggering a new error, triggering another "fix". Pause and let a human
# look rather than let it compound.
too_many_recent_merges() {
  local since count
  since=$(since_hours_ago 2)
  count=$(gh pr list --repo "$REPO" --label autofix --state merged \
    --search "merged:>=${since}" --json number --jq 'length' 2>/dev/null)
  [ "${count:-0}" -ge 2 ]
}

main() {
  if already_labeled; then
    printf 'issue #%s already has the autofix label; skipping\n' "$ISSUE_NUMBER"
    proceed false
    return 0
  fi

  if too_many_recent_issues; then
    notify "Error autofix paused: more than 3 PostHog issues opened in the last 6h. Issue #${ISSUE_NUMBER} needs a human look — https://github.com/${REPO}/issues/${ISSUE_NUMBER}"
    proceed false
    return 0
  fi

  if too_many_recent_merges; then
    notify "Error autofix paused: 2+ autofix PRs merged in the last 2h (possible feedback loop). Issue #${ISSUE_NUMBER} needs a human look — https://github.com/${REPO}/issues/${ISSUE_NUMBER}"
    proceed false
    return 0
  fi

  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label autofix
  proceed true
}

main
