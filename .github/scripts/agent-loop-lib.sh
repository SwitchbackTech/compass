#!/usr/bin/env bash
# Shared helpers for the agent-loop scripts. Source, don't execute:
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/agent-loop-lib.sh
# shellcheck disable=SC2034 # sourced constants consumed by sibling scripts
REPO=${GH_REPO:-${GITHUB_REPOSITORY:-}}
AGENT_LOOP_SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
STAGING_URL="${AGENT_LOOP_STAGING_URL:-${BOOKING_LOOP_STAGING_URL:-https://staging.compasscalendar.com}}"
PICKUP_PHRASE="agent-loop: pickup"
RUNNING_LABEL="agent-loop-running"
QUOTA_WAITING_LABEL="agent-loop-waiting-for-credits"
NEEDS_HUMAN_LABEL="agent-loop-needs-human"
AUTOMERGE_LABEL="agent-automerge"
QUOTA_RETRY_MARKER="agent-loop-quota-retry-at="
COMMENT_PREFIX="agent-loop:"
READY_LABEL="agent-ready"

# Alias notes: booking-loop-* labels, booking-automerge, the old pickup
# phrase, and the old quota HTML marker remain valid for one release so
# open booking PRs still merge and in-flight booking WPs still idle.
LEGACY_RUNNING_LABEL="booking-loop-running"
LEGACY_QUOTA_WAITING_LABEL="booking-loop-waiting-for-credits"
LEGACY_NEEDS_HUMAN_LABEL="booking-loop-needs-human"
LEGACY_AUTOMERGE_LABEL="booking-automerge"
LEGACY_QUOTA_RETRY_MARKER="booking-loop-quota-retry-at="
LEGACY_PICKUP_PHRASE="booking-loop: pickup"

ALLOWLIST_DIR="${AGENT_LOOP_SCRIPT_DIR}/../agent-loop/allowlists"
DEFAULT_MILESTONES="Compass Booking v1"

set_output() {
  local key=$1
  local value=$2
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$key" "$value" >>"$GITHUB_OUTPUT"
  fi
}

notify() {
  local message=$1
  if [ -x "${AGENT_LOOP_SCRIPT_DIR}/discord-notify.sh" ]; then
    "${AGENT_LOOP_SCRIPT_DIR}/discord-notify.sh" "$message" || true
  fi
}

github_repo_url() {
  printf 'https://github.com/%s' "$REPO"
}

gh() {
  if [ -n "${GH_STUB:-}" ]; then
    "$GH_STUB" "$@"
  else
    command gh "$@"
  fi
}

# Ordered milestone titles from AGENT_LOOP_MILESTONES (comma or newline
# separated). Falls back to Compass Booking v1 when the variable is empty.
parse_milestones() {
  local raw="${AGENT_LOOP_MILESTONES:-}"
  if [ -z "$raw" ]; then
    raw="${BOOKING_LOOP_MILESTONE:-$DEFAULT_MILESTONES}"
  fi
  printf '%s\n' "$raw" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' || true
}

# "Providers L: loop + CI acceleration" -> "providers-l"
# "Compass Booking v1" -> "compass-booking-v1"
milestone_slug() {
  local title=$1
  local head="${title%%:*}"
  printf '%s' "$head" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9.]+/-/g; s/^-+//; s/-+$//'
}

json_concat() {
  local a=${1:-[]}
  local b=${2:-[]}
  if [ -z "$a" ]; then a='[]'; fi
  if [ -z "$b" ]; then b='[]'; fi
  A="$a" B="$b" python3 -c 'import json,os; print(json.dumps(json.loads(os.environ["A"])+json.loads(os.environ["B"])))'
}

prompt_path_for_milestone() {
  local title=$1
  local prompt_dir="${AGENT_LOOP_SCRIPT_DIR}/../prompts"
  local slug
  slug=$(milestone_slug "$title")
  if [ -n "$slug" ] && [ -f "${prompt_dir}/${slug}.md" ]; then
    printf '%s' "${prompt_dir}/${slug}.md"
  else
    printf '%s' "${prompt_dir}/agent-loop.md"
  fi
}

allowlist_file_for_slug() {
  local slug=$1
  printf '%s/%s.txt' "$ALLOWLIST_DIR" "$slug"
}

# Print allowlist regexes (comments and blanks stripped) for a milestone slug.
read_allowlist_patterns() {
  local slug=$1
  local file
  file=$(allowlist_file_for_slug "$slug")
  if [ ! -f "$file" ]; then
    return 0
  fi
  grep -vE '^[[:space:]]*(#|$)' "$file" || true
}

file_matches_patterns() {
  local path=$1
  shift
  local pattern
  for pattern in "$@"; do
    [ -n "$pattern" ] || continue
    if printf '%s\n' "$path" | grep -Eq "$pattern"; then
      return 0
    fi
  done
  return 1
}
