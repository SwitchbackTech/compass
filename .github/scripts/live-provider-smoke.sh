#!/usr/bin/env bash
# Run the live adapter contract / smoke suite for each provider whose
# provider-smoke Environment secrets are present. A missing secret is a skip,
# not a failure, so the job is green before Microsoft and Apple exist.
set -uo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

FAILED_PROVIDERS=()
SKIPPED_PROVIDERS=()
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
  SKIPPED_PROVIDERS+=("google")
  echo "google skipped: SMOKE_GOOGLE_REFRESH_TOKEN or Google client id/secret absent"
fi

if microsoft_ready; then
  run_kind microsoft
else
  SKIPPED_PROVIDERS+=("microsoft")
  echo "microsoft skipped: SMOKE_MICROSOFT_REFRESH_TOKEN or Microsoft client id/secret absent"
fi

if apple_ready; then
  run_kind apple
else
  SKIPPED_PROVIDERS+=("apple")
  echo "apple skipped: SMOKE_APPLE_EMAIL or SMOKE_APPLE_APP_PASSWORD absent"
fi

passed="${PASSED_PROVIDERS[*]-}"
skipped="${SKIPPED_PROVIDERS[*]-}"
failed="${FAILED_PROVIDERS[*]-}"
echo "live-provider-smoke passed=${passed:-none} skipped=${skipped:-none} failed=${failed:-none}"

if [ "${#FAILED_PROVIDERS[@]}" -gt 0 ]; then
  if [ -x "$ROOT/.github/scripts/discord-notify.sh" ]; then
    bash "$ROOT/.github/scripts/discord-notify.sh" \
      "live-provider-smoke failed: ${FAILED_PROVIDERS[*]} (skipped ${SKIPPED_PROVIDERS[*]:-none})"
  fi
  exit 1
fi
