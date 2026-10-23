#!/usr/bin/env bash
# Local assertions for live-provider-smoke.sh missing-credential failures.
# Run: bash .github/scripts/live-provider-smoke.test.sh
# Needs bash 4+ (GitHub Actions; not macOS system bash 3).
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT"

PASS=0
FAIL=0

assert_eq() {
  local got=$1
  local want=$2
  local name=$3
  if [ "$got" = "$want" ]; then
    echo "ok ${name}"
    PASS=$((PASS + 1))
  else
    echo "FAIL ${name}: got '${got}' want '${want}'" >&2
    FAIL=$((FAIL + 1))
  fi
}

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

STUB_DIR=$(mktemp -d)
trap 'rm -rf "$STUB_DIR"' EXIT
mkdir -p "${STUB_DIR}/bin"

cat >"${STUB_DIR}/bin/bun" <<'STUB'
#!/usr/bin/env bash
printf 'bun %s LIVE_PROVIDER=%s\n' "$*" "${LIVE_PROVIDER:-}" >> "${SMOKE_TEST_BUN_LOG}"
exit "${SMOKE_TEST_BUN_EXIT:-0}"
STUB
chmod +x "${STUB_DIR}/bin/bun"

run_smoke() {
  local summary=$1
  local log=$2
  shift 2
  env -i \
    PATH="${STUB_DIR}/bin:/usr/bin:/bin" \
    HOME="$STUB_DIR" \
    GITHUB_STEP_SUMMARY="$summary" \
    SMOKE_TEST_BUN_LOG="${STUB_DIR}/bun.log" \
    SMOKE_TEST_BUN_EXIT="${SMOKE_TEST_BUN_EXIT:-0}" \
    "$@" \
    bash "${ROOT}/.github/scripts/live-provider-smoke.sh" >"$log" 2>&1
}

# 1. All credentials absent: fail each provider, exit 1, do not invoke bun.
: > "${STUB_DIR}/bun.log"
summary="${STUB_DIR}/all-missing.md"
log="${STUB_DIR}/all-missing.log"
set +e
run_smoke "$summary" "$log"
status=$?
set -e
out=$(cat "$log")
assert_eq "$status" "1" "all missing creds exits 1"
assert_contains "$out" "::error::google failed:" "all-missing errors on google"
assert_contains "$out" "SMOKE_GOOGLE_REFRESH_TOKEN" "all-missing google message mentions refresh token"
assert_contains "$out" "::error::microsoft failed:" "all-missing errors on microsoft"
assert_contains "$out" "::error::apple failed:" "all-missing errors on apple"
assert_contains "$out" "live-provider-smoke passed=none failed=google microsoft apple" \
  "all-missing prints the summary line"
assert_contains "$out" "live-provider-smoke failed: google microsoft apple" \
  "all-missing Discord notify mentions failed providers"
assert_not_contains "$out" "::warning::" "all-missing does not warn-skip"
assert_contains "$(cat "$summary")" \
  "live-provider-smoke passed=none failed=google microsoft apple" \
  "all-missing writes the summary to GITHUB_STEP_SUMMARY"
assert_not_contains "$(cat "${STUB_DIR}/bun.log" 2>/dev/null || true)" "LIVE_PROVIDER=" \
  "all-missing does not run bun"

# 2. One provider ready: runs bun for it, fails job for the others.
: > "${STUB_DIR}/bun.log"
summary="${STUB_DIR}/partial-ready.md"
log="${STUB_DIR}/partial-ready.log"
set +e
run_smoke "$summary" "$log" \
  SMOKE_MICROSOFT_REFRESH_TOKEN=rt \
  MICROSOFT_CLIENT_ID=id \
  MICROSOFT_CLIENT_SECRET=secret
status=$?
set -e
out=$(cat "$log")
assert_eq "$status" "1" "partial ready exits 1 when any provider failed"
assert_contains "$out" "::error::google failed:" "partial-ready errors on google"
assert_not_contains "$out" "::error::microsoft failed:" "ready microsoft is not a setup failure"
assert_contains "$out" "microsoft: pass" "partial-ready microsoft contract passes"
assert_contains "$out" "::error::apple failed:" "partial-ready errors on apple"
assert_contains "$out" "live-provider-smoke passed=microsoft failed=google apple" \
  "partial-ready summary lists passed and failed"
assert_contains "$(cat "${STUB_DIR}/bun.log")" "LIVE_PROVIDER=microsoft" \
  "partial-ready invokes bun for microsoft"
assert_contains "$(cat "$summary")" \
  "live-provider-smoke passed=microsoft failed=google apple" \
  "partial-ready writes the summary to GITHUB_STEP_SUMMARY"

# 3. All providers ready: exit 0 when bun passes.
: > "${STUB_DIR}/bun.log"
summary="${STUB_DIR}/all-ready.md"
log="${STUB_DIR}/all-ready.log"
set +e
run_smoke "$summary" "$log" \
  SMOKE_GOOGLE_REFRESH_TOKEN=grt \
  GOOGLE_CLIENT_ID=gid \
  GOOGLE_CLIENT_SECRET=gsec \
  SMOKE_MICROSOFT_REFRESH_TOKEN=rt \
  MICROSOFT_CLIENT_ID=id \
  MICROSOFT_CLIENT_SECRET=secret \
  SMOKE_APPLE_EMAIL=apple@test.example \
  SMOKE_APPLE_APP_PASSWORD=app-pass
status=$?
set -e
out=$(cat "$log")
assert_eq "$status" "0" "all ready exits 0 when bun passes"
assert_contains "$out" "live-provider-smoke passed=google microsoft apple failed=none" \
  "all-ready summary lists all passed"
assert_contains "$(cat "${STUB_DIR}/bun.log")" "LIVE_PROVIDER=google" \
  "all-ready invokes bun for google"
assert_contains "$(cat "${STUB_DIR}/bun.log")" "LIVE_PROVIDER=microsoft" \
  "all-ready invokes bun for microsoft"
assert_contains "$(cat "${STUB_DIR}/bun.log")" "LIVE_PROVIDER=apple" \
  "all-ready invokes bun for apple"

if [ "$FAIL" -gt 0 ]; then
  echo "${FAIL} failed, ${PASS} passed" >&2
  exit 1
fi
echo "${PASS} passed"
