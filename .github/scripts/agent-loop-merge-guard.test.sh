#!/usr/bin/env bash
# Local assertions for agent-loop-merge-guard.sh size rails.
# Run: bash .github/scripts/agent-loop-merge-guard.test.sh
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

PASS=0
FAIL=0
assert_contains() {
  local haystack=$1
  local needle=$2
  local name=$3
  if printf '%s' "$haystack" | grep -Fq "$needle"; then
    echo "ok ${name}"
    PASS=$((PASS + 1))
  else
    echo "FAIL ${name}: missing '${needle}' in:${haystack}" >&2
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local haystack=$1
  local needle=$2
  local name=$3
  if printf '%s' "$haystack" | grep -Fq "$needle"; then
    echo "FAIL ${name}: unexpectedly found '${needle}' in:${haystack}" >&2
    FAIL=$((FAIL + 1))
  else
    echo "ok ${name}"
    PASS=$((PASS + 1))
  fi
}

run_guard() {
  local files=$1
  AGENT_LOOP_GUARD_DRY_RUN=1 \
    AGENT_LOOP_GUARD_FILES="$files" \
    GH_REPO="example/compass" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 1
}

# Formerly denied prefixes may auto-merge. Size rails still refuse.
for allowed in \
  "packages/web/src/auth/providers/ConnectProviderChooser.tsx" \
  "packages/backend/src/auth/x.ts" \
  "packages/web/src/supertokens.ts" \
  "packages/sync/src/telemetry/x.ts" \
  "packages/core/src/config/compass.config.ts" \
  ".github/scripts/agent-loop-merge-guard.sh" \
  ".github/workflows/agent-loop.yml" \
  ".github/prompts/agent-loop.md" \
  "self-host/compose.yml" \
  "packages/web/src/billing/CheckoutCelebrationModal.tsx"; do
  out=$(run_guard "$allowed")
  assert_contains "$out" "proceed" "${allowed} proceeds"
  assert_not_contains "$out" "downgrade:" "${allowed} is not refused"
done

out=$(
  AGENT_LOOP_MAX_FILES=1 \
    AGENT_LOOP_GUARD_DRY_RUN=1 \
    AGENT_LOOP_GUARD_FILES=$'a.ts\nb.ts' \
    GH_REPO="example/compass" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 1
)
assert_contains "$out" "downgrade:" "over-size diffs are refused"
assert_not_contains "$out" "proceed" "over-size diffs do not proceed"

echo
echo "passed=${PASS} failed=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
