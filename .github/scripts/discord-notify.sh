#!/usr/bin/env bash
# Posts a message to the errors Discord channel. Silently no-ops when the
# webhook secret is unset, so callers can invoke this unconditionally
# without gating on whether DISCORD_ERRORS_WEBHOOK_URL has been provisioned
# yet (e.g. during Phase 1 rollout before the secret exists).
set -uo pipefail

main() {
  local message=${1:-}
  if [ -z "$message" ]; then
    message=$(cat)
  fi

  if [ -z "${DISCORD_ERRORS_WEBHOOK_URL:-}" ]; then
    printf 'DISCORD_ERRORS_WEBHOOK_URL unset; skipping notify: %s\n' "$message" >&2
    return 0
  fi

  # jq handles JSON string escaping correctly for any input (control
  # characters included) — a hand-rolled sed escaper only covering
  # backslash/quote/newline would silently emit invalid JSON for a message
  # containing e.g. a tab, and this webhook's messages are LLM-authored
  # summaries where that's a real possibility, not a hypothetical.
  jq -n --arg content "$message" '{content: $content}' |
    curl -fsS \
      -H 'Content-Type: application/json' \
      -d @- \
      "$DISCORD_ERRORS_WEBHOOK_URL" >/dev/null
}

main "$@"
