#!/usr/bin/env bash
# Run the live adapter contract / smoke suite for each provider whose
# provider-smoke Environment secrets are present. A missing secret fails the
# job with a clear message instead of passing silently.
set -uo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

FAILED_PROVIDERS=()
PASSED_PROVIDERS=()

run_kind() {
  local kind=$1
  echo "::group::LIVE_PROVIDER=${kind}"
  if LIVE_PROVIDER="$kind" bun test:sync -- \
    packages/sync/src/providers/__contract__/live-provider.smoke.test.ts \
    packages/sync/src/providers/__contract__/live-provider.contract.test.ts; then
    PASSED_PROVIDERS+=("$kind")
    echo "${kind}: pass"
  else
    FAILED_PROVIDERS+=("$kind")
    echo "${kind}: fail"
  fi
  echo "::endgroup::"
}

fail_kind() {
  local kind=$1
  local reason=$2
  FAILED_PROVIDERS+=("$kind")
  echo "::error::${kind} failed: ${reason}"
}

notify() {
  local message=$1
  if [ -x "$ROOT/.github/scripts/discord-notify.sh" ]; then
    bash "$ROOT/.github/scripts/discord-notify.sh" "$message"
  fi
}

google_ready() {
  [ -n "${SMOKE_GOOGLE_REFRESH_TOKEN:-}" ] &&
    { [ -n "${GOOGLE_CLIENT_ID:-}" ] || [ -n "${SMOKE_GOOGLE_CLIENT_ID:-}" ]; } &&
    { [ -n "${GOOGLE_CLIENT_SECRET:-}" ] || [ -n "${SMOKE_GOOGLE_CLIENT_SECRET:-}" ]; }
}

microsoft_ready() {
  [ -n "${SMOKE_MICROSOFT_REFRESH_TOKEN:-}" ] &&
    [ -n "${MICROSOFT_CLIENT_ID:-}" ] &&
    [ -n "${MICROSOFT_CLIENT_SECRET:-}" ]
}

apple_ready() {
  [ -n "${SMOKE_APPLE_EMAIL:-}" ] && [ -n "${SMOKE_APPLE_APP_PASSWORD:-}" ]
}

if google_ready; then
  run_kind google
else
  fail_kind google "SMOKE_GOOGLE_REFRESH_TOKEN or Google client id/secret absent (add SMOKE_GOOGLE_REFRESH_TOKEN to the provider-smoke Environment)"
fi

if microsoft_ready; then
  run_kind microsoft
else
  fail_kind microsoft "SMOKE_MICROSOFT_REFRESH_TOKEN or Microsoft client id/secret absent"
fi

if apple_ready; then
  run_kind apple
else
  fail_kind apple "SMOKE_APPLE_EMAIL or SMOKE_APPLE_APP_PASSWORD absent"
fi

passed="${PASSED_PROVIDERS[*]-}"
failed="${FAILED_PROVIDERS[*]-}"
summary="live-provider-smoke passed=${passed:-none} failed=${failed:-none}"
echo "$summary"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "$summary" >> "$GITHUB_STEP_SUMMARY"
fi

if [ "${#FAILED_PROVIDERS[@]}" -gt 0 ]; then
  notify "live-provider-smoke failed: ${FAILED_PROVIDERS[*]} (passed ${PASSED_PROVIDERS[*]:-none})"
  exit 1
fi
