#!/usr/bin/env bash
# Shared helpers for the booking-loop scripts. Source, don't execute:
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/booking-loop-lib.sh
REPO=${GH_REPO:-${GITHUB_REPOSITORY:-}}
BOOKING_LOOP_SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MILESTONE="${BOOKING_LOOP_MILESTONE:-Compass Booking v1}"
STAGING_URL="${BOOKING_LOOP_STAGING_URL:-https://staging.compasscalendar.com}"
PICKUP_PHRASE="booking-loop: pickup"
RUNNING_LABEL="booking-loop-running"
NEEDS_HUMAN_LABEL="booking-loop-needs-human"
AUTOMERGE_LABEL="booking-automerge"

set_output() {
  local key=$1
  local value=$2
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    printf '%s=%s\n' "$key" "$value" >>"$GITHUB_OUTPUT"
  fi
}

notify() {
  local message=$1
  if [ -x "${BOOKING_LOOP_SCRIPT_DIR}/discord-notify.sh" ]; then
    "${BOOKING_LOOP_SCRIPT_DIR}/discord-notify.sh" "$message" || true
  fi
}

github_repo_url() {
  printf 'https://github.com/%s' "$REPO"
}
