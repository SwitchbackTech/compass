#!/usr/bin/env bash
# Local assertions for agent-loop-merge-guard.sh path allowlists.
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
  local milestone=$2
  AGENT_LOOP_GUARD_DRY_RUN=1 \
    AGENT_LOOP_GUARD_FILES="$files" \
    AGENT_LOOP_GUARD_MILESTONE="$milestone" \
    GH_REPO="example/compass" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 1
}

MS_M="Providers M: Microsoft (Outlook)"

out=$(run_guard "packages/sync/src/providers/microsoft/foo.ts" "$MS_M")
assert_contains "$out" "allowed by providers allowlist" "providers adapter is allowlisted"
assert_contains "$out" "proceed" "providers adapter proceeds"
assert_not_contains "$out" "downgrade:" "providers adapter is not refused"

out=$(run_guard "packages/sync/src/telemetry/x.ts" "$MS_M")
assert_contains "$out" "downgrade:" "telemetry still refused"
assert_not_contains "$out" "allowed by providers allowlist" "telemetry is not allowlisted"
assert_not_contains "$out" "proceed" "telemetry does not proceed"

out=$(run_guard $'packages/sync/src/providers/microsoft/foo.ts\npackages/sync/src/telemetry/x.ts' "$MS_M")
assert_contains "$out" "downgrade:" "mixed diff still refuses telemetry"
assert_not_contains "$out" "proceed" "mixed diff does not proceed"

# .github/ self-service: CI-speed files may merge, agent and deploy files may not.
for allowed in \
  ".github/workflows/test-unit.yml" \
  ".github/workflows/test-e2e.yml" \
  ".github/workflows/perf-budget.yml" \
  ".github/scripts/detect-code-changes.sh" \
  ".github/dependabot.yml" \
  ".github/ISSUE_TEMPLATE/3-agent-task.yml"; do
  out=$(run_guard "$allowed" "$MS_M")
  assert_contains "$out" "proceed" "${allowed} proceeds"
  assert_not_contains "$out" "downgrade:" "${allowed} is not refused"
done

for refused in \
  ".github/workflows/deploy-production.yml" \
  ".github/workflows/_deploy-environment.yml" \
  ".github/workflows/release-on-main.yml" \
  ".github/workflows/agent-loop.yml" \
  ".github/workflows/agent-review.yml" \
  ".github/workflows/error-autofix.yml" \
  ".github/scripts/agent-loop-merge-guard.sh" \
  ".github/scripts/autofix-preflight.sh" \
  ".github/scripts/deploy-health-check.sh" \
  ".github/scripts/discord-notify.sh" \
  ".github/prompts/agent-loop.md" \
  ".github/agent-loop/allowlists/providers-m.txt" \
  ".github/docker/Dockerfile.web"; do
  out=$(run_guard "$refused" "$MS_M")
  assert_contains "$out" "downgrade:" "${refused} is refused"
  assert_not_contains "$out" "proceed" "${refused} does not proceed"
done

echo
echo "passed=${PASS} failed=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
