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

MS_A="Providers A: Apple (iCloud)"
MS_I="Providers I: identity decoupling"
MS_C="Providers C: closeout"

# Apple, identity and closeout re-allow the auth paths (as P0 did); closeout also re-allows sync telemetry.
for ms in "$MS_A" "$MS_I" "$MS_C"; do
  out=$(run_guard $'packages/backend/src/auth/x.ts\npackages/web/src/auth/y.ts\npackages/web/src/api/auth.api.ts\npackages/web/src/supertokens.ts' "$ms")
  assert_contains "$out" "proceed" "auth paths proceed under ${ms}"
  assert_not_contains "$out" "downgrade:" "auth paths are not refused under ${ms}"
done

out=$(run_guard "packages/sync/src/telemetry/x.ts" "$MS_C")
assert_contains "$out" "proceed" "telemetry proceeds under closeout"
assert_not_contains "$out" "downgrade:" "telemetry is not refused under closeout"

out=$(run_guard "packages/sync/src/telemetry/x.ts" "$MS_I")
assert_contains "$out" "downgrade:" "telemetry still refused under identity"

out=$(run_guard "packages/sync/src/telemetry/x.ts" "$MS_A")
assert_contains "$out" "downgrade:" "telemetry still refused under apple"

out=$(run_guard "packages/core/src/config/compass.config.ts" "$MS_I")
assert_contains "$out" "downgrade:" "core config still refused under identity"

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

out=$(
  AGENT_LOOP_GUARD_DRY_RUN=1 \
    AGENT_LOOP_GUARD_FILES="packages/web/src/foo.ts" \
    AGENT_LOOP_GUARD_MILESTONE="$MS_M" \
    AGENT_LOOP_GUARD_MERGEABLE=CONFLICTING \
    GH_REPO="example/compass" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 1
)
assert_contains "$out" "update-branch:" "conflicting PR tries update-branch"
assert_contains "$out" "proceed" "update-branch success proceeds"
assert_not_contains "$out" "downgrade:" "resolved conflict is not a human stop"
assert_not_contains "$out" "requeue:" "resolved conflict does not close the PR"

out=$(
  AGENT_LOOP_GUARD_DRY_RUN=1 \
    AGENT_LOOP_GUARD_FILES="packages/web/src/foo.ts" \
    AGENT_LOOP_GUARD_MILESTONE="$MS_M" \
    AGENT_LOOP_GUARD_MERGEABLE=CONFLICTING \
    AGENT_LOOP_GUARD_STILL_DIRTY=1 \
    GH_REPO="example/compass" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 1
)
assert_contains "$out" "update-branch:" "still-dirty PR tries update-branch"
assert_contains "$out" "requeue:" "still-dirty PR closes and requeues"
assert_not_contains "$out" "downgrade:" "conflict requeue does not add needs-human"
assert_not_contains "$out" "proceed" "still-dirty PR does not proceed"

if grep -qE 'BOOKING_LOOP_|booking-loop-|booking-automerge|LEGACY_' \
  "${ROOT}/.github/scripts/agent-loop-merge-guard.sh"; then
  echo "FAIL merge-guard still mentions booking-loop aliases" >&2
  FAIL=$((FAIL + 1))
else
  echo "ok merge-guard has no booking-loop aliases"
  PASS=$((PASS + 1))
fi

# Live stub: --auto fails with a conflict, update-branch leaves it dirty, close.
STUB_DIR=$(mktemp -d)
trap 'rm -rf "$STUB_DIR"' EXIT
cat >"${STUB_DIR}/gh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "${STUB_DIR}/commands.log"
cmd=${1:-}
shift || true
if [ "$cmd" = "pr" ]; then
  sub=${1:-}
  shift || true
  case "$sub" in
    view)
      json=""
      while [ "$#" -gt 0 ]; do
        case "$1" in
          --json) json=$2; shift 2 ;;
          *) shift ;;
        esac
      done
      case "$json" in
        labels) printf 'agent-automerge\n' ;;
        additions,deletions) printf '12\n' ;;
        autoMergeRequest) printf '\n' ;;
        mergeable) printf 'MERGEABLE\n' ;;
        body) printf 'Fixes #99\n' ;;
        *) printf '\n' ;;
      esac
      ;;
    update-branch)
      echo "update-branch failed" >&2
      exit 1
      ;;
    merge)
      if printf '%s\n' "$*" | grep -q -- '--auto'; then
        echo "GraphQL: Pull request is not mergeable" >&2
        exit 1
      fi
      ;;
    comment|edit|close) ;;
    *)
      echo "unexpected gh pr $sub $*" >&2
      exit 1
      ;;
  esac
  exit 0
fi
if [ "$cmd" = "run" ]; then
  printf 'success\n'
  exit 0
fi
if [ "$cmd" = "issue" ]; then
  exit 0
fi
echo "unexpected gh command: $cmd $*" >&2
exit 1
STUB
chmod +x "${STUB_DIR}/gh"

out=$(
  GH_STUB="${STUB_DIR}/gh" \
    GH_TOKEN=test \
    GH_REPO="example/compass" \
    AGENT_LOOP_GUARD_FILES="packages/web/src/foo.ts" \
    AGENT_LOOP_GUARD_MILESTONE="$MS_M" \
    bash "${ROOT}/.github/scripts/agent-loop-merge-guard.sh" 7
)
assert_contains "$out" "closed PR #7 and requeued" "auto-merge conflict closes and requeues"
assert_not_contains "$out" "needs-human" "conflict requeue output does not mention needs-human"
if grep -q 'needs-human' "${STUB_DIR}/commands.log"; then
  echo "FAIL conflict requeue must not add needs-human: $(cat "${STUB_DIR}/commands.log")" >&2
  FAIL=$((FAIL + 1))
else
  echo "ok conflict requeue stub did not add needs-human"
  PASS=$((PASS + 1))
fi
if grep -q 'pr close 7' "${STUB_DIR}/commands.log"; then
  echo "ok conflict requeue stub closed the PR"
  PASS=$((PASS + 1))
else
  echo "FAIL conflict requeue stub did not close the PR: $(cat "${STUB_DIR}/commands.log")" >&2
  FAIL=$((FAIL + 1))
fi

echo
echo "passed=${PASS} failed=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
