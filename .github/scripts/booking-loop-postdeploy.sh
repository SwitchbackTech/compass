#!/usr/bin/env bash
# After "Release on main": smoke staging and comment on the Booking issue if
# this SHA came from a booking-automerge PR. The next WP is launched by the
# merge event in booking-loop.yml, not here.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/booking-loop-lib.sh"

HEAD_SHA=${HEAD_SHA:-${GITHUB_SHA:-}}
CONCLUSION=${CONCLUSION:-success}

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

if [ "$CONCLUSION" != "success" ]; then
  echo "Release on main conclusion=${CONCLUSION}; not smoking."
  set_output smoke_ok false
  exit 0
fi

pr_number=""
if [ -n "$HEAD_SHA" ]; then
  pr_number=$(gh api "repos/${REPO}/commits/${HEAD_SHA}/pulls" --jq '.[0].number' 2>/dev/null || true)
  if [ "$pr_number" = "null" ]; then
    pr_number=""
  fi
fi

issue_number=""
is_booking=false
if [ -n "$pr_number" ]; then
  labels=$(gh pr view "$pr_number" --repo "$REPO" --json labels --jq '.labels[].name' 2>/dev/null || true)
  if printf '%s\n' "$labels" | grep -qx "$AUTOMERGE_LABEL"; then
    is_booking=true
  fi
  issue_number=$(gh pr view "$pr_number" --repo "$REPO" --json body --jq '.body' 2>/dev/null |
    grep -oE '[Ff]ixes #[0-9]+' | grep -oE '[0-9]+' | head -n1 || true)
fi

if ! "${BOOKING_LOOP_SCRIPT_DIR}/booking-loop-staging-smoke.sh"; then
  set_output smoke_ok false
  if [ -n "$issue_number" ]; then
    gh issue comment "$issue_number" --repo "$REPO" --body \
      "booking-loop: staging smoke failed after #${pr_number} reached main. Added \`${NEEDS_HUMAN_LABEL}\`. New launches stop until staging passes smoke." \
      2>/dev/null || true
    gh issue edit "$issue_number" --repo "$REPO" \
      --add-label "$NEEDS_HUMAN_LABEL" --remove-label "$RUNNING_LABEL" 2>/dev/null || true
  fi
  notify "booking-loop: staging smoke failed (PR #${pr_number:-unknown})"
  exit 1
fi

set_output smoke_ok true

if [ -n "$issue_number" ]; then
  gh issue edit "$issue_number" --repo "$REPO" --remove-label "$RUNNING_LABEL" 2>/dev/null || true
  if [ "$is_booking" = true ]; then
    gh issue comment "$issue_number" --repo "$REPO" --body \
      "booking-loop: staging smoke passed on ${STAGING_URL} after #${pr_number}." \
      2>/dev/null || true
  fi
fi

echo "post-deploy smoke ok (booking=${is_booking} pr=${pr_number:-none} issue=${issue_number:-none})"
