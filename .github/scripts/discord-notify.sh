#!/usr/bin/env bash
# Posts a message to the errors Discord channel. Silently no-ops when the
# webhook secret is unset, so callers can invoke this unconditionally
# without gating on whether DISCORD_ERRORS_WEBHOOK_URL has been provisioned
# yet (e.g. during Phase 1 rollout before the secret exists).
set -uo pipefail

json_escape() {
  sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e ':a;N;$!ba;s/\n/\\n/g'
}

main() {
  local message=${1:-}
  if [ -z "$message" ]; then
    message=$(cat)
  fi

  if [ -z "${DISCORD_ERRORS_WEBHOOK_URL:-}" ]; then
    printf 'DISCORD_ERRORS_WEBHOOK_URL unset; skipping notify: %s\n' "$message" >&2
    return 0
  fi

  local escaped
  escaped=$(printf '%s' "$message" | json_escape)
  curl -fsS \
    -H 'Content-Type: application/json' \
    -d "{\"content\":\"${escaped}\"}" \
    "$DISCORD_ERRORS_WEBHOOK_URL" >/dev/null
}

main "$@"
