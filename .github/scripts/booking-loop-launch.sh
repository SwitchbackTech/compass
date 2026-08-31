#!/usr/bin/env bash
# Launch one booking-loop agent for a GitHub issue.
# If CURSOR_API_KEY is set, POST https://api.cursor.com/v0/agents only.
# Otherwise comment the exact pickup phrase for a Cursor Automation:
#   booking-loop: pickup
# Never both (that would start two agents).
set -euo pipefail

ISSUE_NUMBER=${1:?usage: booking-loop-launch.sh <issue-number>}

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/booking-loop-lib.sh"

if [ -z "$REPO" ]; then
  echo "GITHUB_REPOSITORY or GH_REPO is required" >&2
  exit 1
fi

issue_url="https://github.com/${REPO}/issues/${ISSUE_NUMBER}"
prompt_file="${BOOKING_LOOP_SCRIPT_DIR}/../prompts/booking-loop.md"

gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "$RUNNING_LABEL" \
  --remove-label "$NEEDS_HUMAN_LABEL" 2>/dev/null || \
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label "$RUNNING_LABEL"
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --remove-label "$QUOTA_WAITING_LABEL" 2>/dev/null || true

if [ -n "${CURSOR_API_KEY:-}" ]; then
  prompt_text=$(cat <<EOF
You are running the Compass Calendar booking-loop Routine.
Kill switch BOOKING_LOOP_ENABLED is true (this launch would not have happened otherwise).
Target issue: #${ISSUE_NUMBER}
Issue URL: ${issue_url}

Read ${prompt_file##*/} at .github/prompts/booking-loop.md and follow it exactly.
Also read .agents/skills/booking-loop/SKILL.md and docs/features/booking.md.

Take only the work package for this issue from origin/main to a ready PR with Fixes #${ISSUE_NUMBER}, then squash-merge. Label the PR ${AUTOMERGE_LABEL}. Do not wait for a human. Never enter credentials on staging.
EOF
)

  payload=$(
    jq -n \
      --arg text "$prompt_text" \
      --arg repo "$(github_repo_url)" \
      "{
        prompt: {text: \$text},
        source: {repository: \$repo, ref: \"main\"},
        target: {autoCreatePr: false}
      }"
  )

  tmp=$(mktemp)
  headers=$(mktemp)
  http_code=$(
    curl -sS -D "$headers" -o "$tmp" -w "%{http_code}" \
      --request POST \
      --url https://api.cursor.com/v0/agents \
      -u "${CURSOR_API_KEY}:" \
      --header "Content-Type: application/json" \
      --data "$payload"
  ) || http_code="000"

  if [ "$http_code" = "429" ]; then
    retry_after_seconds=$(awk 'BEGIN { IGNORECASE = 1 } /^retry-after:/ {
      gsub("\\r", "", $2)
      if ($2 ~ /^[0-9]+$/) print $2
      exit
    }' "$headers")
    retry_after_seconds=${retry_after_seconds:-3600}
    if [ "$retry_after_seconds" -lt 3600 ]; then
      retry_after_seconds=3600
    fi
    if [ "$retry_after_seconds" -gt 86400 ]; then
      retry_after_seconds=86400
    fi
    next_retry_at=$(python3 - "$retry_after_seconds" <<'PY'
from datetime import datetime, timedelta, timezone
import sys

print((datetime.now(timezone.utc) + timedelta(seconds=int(sys.argv[1]))).isoformat().replace("+00:00", "Z"))
PY
)
    rm -f "$tmp" "$headers"
    gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "$(cat <<BODY
booking-loop: Cursor quota exhausted (HTTP 429). Waiting until ${next_retry_at}, then the hourly watchdog will retry this WP.

<!-- booking-loop-quota-retry-at=${next_retry_at} -->
BODY
)"
    gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
      --add-label "$QUOTA_WAITING_LABEL" --remove-label "$RUNNING_LABEL" \
      --remove-label "$NEEDS_HUMAN_LABEL"
    notify "booking-loop: Cursor quota exhausted for #${ISSUE_NUMBER}; retrying after ${next_retry_at}"
    echo "Cursor quota exhausted for #${ISSUE_NUMBER}; retry after ${next_retry_at}."
    set_output launch_mode quota-wait
    set_output retry_after_seconds "$retry_after_seconds"
    exit 0
  fi

  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    body=$(head -c 800 "$tmp" || true)
    rm -f "$tmp" "$headers"
    gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "$(cat <<BODY
booking-loop: Cursor API launch failed (HTTP ${http_code}). Not commenting \`${PICKUP_PHRASE}\` because \`CURSOR_API_KEY\` is set (dual-launch rule).

\`\`\`
${body}
\`\`\`

Added \`${NEEDS_HUMAN_LABEL}\`. Fix the API key or the payload, then re-dispatch Booking loop.
BODY
)"
    gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
      --add-label "$NEEDS_HUMAN_LABEL" --remove-label "$RUNNING_LABEL" 2>/dev/null || true
    notify "booking-loop: Cursor API launch failed for #${ISSUE_NUMBER} (HTTP ${http_code})"
    echo "Cursor API launch failed HTTP ${http_code}" >&2
    exit 1
  fi

  agent_url=$(jq -r '.target.url // .id // empty' "$tmp")
  agent_id=$(jq -r '.id // empty' "$tmp")
  rm -f "$tmp" "$headers"

  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "$(cat <<BODY
booking-loop: launched Cursor cloud agent \`${agent_id}\`.
${agent_url}

This launch used the Cloud Agents API, so this comment is **not** \`${PICKUP_PHRASE}\`.
BODY
)"
  echo "Launched Cursor agent ${agent_id} for #${ISSUE_NUMBER}"
  set_output launch_mode api
  set_output agent_id "$agent_id"
  exit 0
fi

# No API key: Cursor Automation path. Exact phrase is the trigger.
gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "${PICKUP_PHRASE}

Issue #${ISSUE_NUMBER}. Read .github/prompts/booking-loop.md and follow it exactly."
echo "Commented pickup phrase on #${ISSUE_NUMBER} (no CURSOR_API_KEY)"
set_output launch_mode comment
