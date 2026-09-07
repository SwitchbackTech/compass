#!/usr/bin/env bash
# Local assertions for detect-code-changes.sh package routing.
# Run: bash .github/scripts/detect-code-changes.test.sh
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

PASS=0
FAIL=0
assert_eq() {
  local got=$1
  local want=$2
  local name=$3
  got=${got%"${got##*[![:space:]]}"}
  want=${want%"${want##*[![:space:]]}"}
  if [ "$got" = "$want" ]; then
    echo "ok ${name}"
    PASS=$((PASS + 1))
  else
    echo "FAIL ${name}: got '${got}' want '${want}'" >&2
    FAIL=$((FAIL + 1))
  fi
}

STUB_DIR=$(mktemp -d)
OUTPUT=$(mktemp)
trap 'rm -rf "$STUB_DIR"; rm -f "$OUTPUT"' EXIT

cat >"${STUB_DIR}/gh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
printf '%s' "${DETECT_CODE_CHANGES_TEST_FILES:-}"
STUB
chmod +x "${STUB_DIR}/gh"

run_detector() {
  local event=$1
  local files=${2-}
  : >"$OUTPUT"
  DETECT_CODE_CHANGES_TEST_FILES=$files \
    GITHUB_OUTPUT=$OUTPUT \
    PATH="${STUB_DIR}:${PATH}" \
    bash "${ROOT}/.github/scripts/detect-code-changes.sh" \
    "$event" "example/compass" "42" >/dev/null
  cat "$OUTPUT"
}

ALL_ON=$'code=true\ne2e=true\ncore=true\nweb=true\nbackend=true\nsync=true\nscripts=true\n'
ALL_OFF=$'code=false\ne2e=false\ncore=false\nweb=false\nbackend=false\nsync=false\nscripts=false\n'

assert_eq "$(run_detector merge_group)" "$ALL_ON" "merge_group runs every leg"
assert_eq "$(run_detector push)" "$ALL_ON" "push runs every leg"
assert_eq "$(run_detector pull_request $'.gitignore\ndocs/testing.md\nREADME.md')" \
  "$ALL_OFF" "docs-only skips every leg"

assert_eq "$(run_detector pull_request 'packages/backend/src/app.ts')" \
  $'code=true\ne2e=false\ncore=false\nweb=false\nbackend=true\nsync=false\nscripts=false\n' \
  "backend-only runs the backend leg"

assert_eq "$(run_detector pull_request 'packages/web/src/app.tsx')" \
  $'code=true\ne2e=true\ncore=false\nweb=true\nbackend=false\nsync=false\nscripts=false\n' \
  "web-only runs the web leg"

assert_eq "$(run_detector pull_request 'packages/core/src/types.ts')" \
  "$ALL_ON" "core runs every leg"

assert_eq "$(run_detector pull_request 'bun.lock')" \
  "$ALL_ON" "lockfile runs every leg"

assert_eq "$(run_detector pull_request $'packages/web/src/app.tsx\npackages/backend/src/app.ts')" \
  $'code=true\ne2e=true\ncore=false\nweb=true\nbackend=true\nsync=false\nscripts=false\n' \
  "web plus backend runs those two legs"

assert_eq "$(run_detector pull_request 'e2e/timed/event-smoke.spec.ts')" \
  $'code=true\ne2e=true\ncore=false\nweb=false\nbackend=false\nsync=false\nscripts=true\n' \
  "e2e specs run the scripts shard-list contract"

assert_eq "$(run_detector pull_request '.github/workflows/test-unit.yml')" \
  $'code=true\ne2e=true\ncore=false\nweb=false\nbackend=false\nsync=false\nscripts=false\n' \
  "workflow-only skips unit legs"

echo
echo "passed=${PASS} failed=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
