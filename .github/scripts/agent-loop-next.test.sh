#!/usr/bin/env bash
# Local assertions for agent-loop-next.sh milestone ordering.
# Run: bash .github/scripts/agent-loop-next.test.sh
# Until WP-05, this is not in the static CI job.
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

STUB_DIR=$(mktemp -d)
trap 'rm -rf "$STUB_DIR"' EXIT

write_stub() {
  cat >"${STUB_DIR}/gh" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
milestone=""
label=""
cmd=${1:-}
shift || true
if [ "$cmd" = "pr" ]; then
  printf '%s' "${STUB_PRS:-[]}"
  exit 0
fi
if [ "$cmd" = "api" ]; then
  printf '<!-- agent-loop-quota-retry-at=%s -->\n' "${STUB_RETRY_AT:-}"
  exit 0
fi
if [ "$cmd" != "issue" ]; then
  echo "unexpected gh command: $cmd $*" >&2
  exit 1
fi
sub=${1:-}
shift || true
if [ "$sub" != "list" ]; then
  echo "unexpected gh issue subcommand: $sub $*" >&2
  exit 1
fi
while [ "$#" -gt 0 ]; do
  case "$1" in
    --milestone) milestone=$2; shift 2 ;;
    --label) label=$2; shift 2 ;;
    *) shift ;;
  esac
done

key=""
case "$milestone" in
  "Providers L: loop + CI acceleration") key="L" ;;
  "Booking v1.5") key="B" ;;
  *) key="OTHER" ;;
esac

if [ -n "$label" ]; then
  case "$label" in
    # Alias notes: booking-loop-* labels still count for one release.
    agent-loop-waiting-for-credits|booking-loop-waiting-for-credits)
      eval "printf '%s' \"\${STUB_${key}_QUOTA:-[]}\""
      ;;
    # Alias notes: booking-loop-running still idles the picker.
    agent-loop-running|booking-loop-running)
      eval "printf '%s' \"\${STUB_${key}_RUNNING:-[]}\""
      ;;
    *)
      printf '[]'
      ;;
  esac
  exit 0
fi

eval "printf '%s' \"\${STUB_${key}_OPEN:-[]}\""
STUB
  chmod +x "${STUB_DIR}/gh"
}

run_next() {
  write_stub
  env -u GITHUB_OUTPUT \
    GH_STUB="${STUB_DIR}/gh" \
    GH_REPO="example/compass" \
    AGENT_LOOP_MILESTONES="Providers L: loop + CI acceleration,Booking v1.5" \
    STUB_L_OPEN="${STUB_L_OPEN:-[]}" \
    STUB_B_OPEN="${STUB_B_OPEN:-[]}" \
    STUB_L_QUOTA="${STUB_L_QUOTA:-[]}" \
    STUB_B_QUOTA="${STUB_B_QUOTA:-[]}" \
    STUB_L_RUNNING="${STUB_L_RUNNING:-[]}" \
    STUB_B_RUNNING="${STUB_B_RUNNING:-[]}" \
    STUB_PRS="${STUB_PRS:-[]}" \
    STUB_RETRY_AT="${STUB_RETRY_AT:-}" \
    bash "${ROOT}/.github/scripts/agent-loop-next.sh"
}

L_ISSUE='[{"number":3217,"title":"providers L WP","url":"https://example.test/issues/3217","labels":[{"name":"agent-ready"}]}]'
B_ISSUE='[{"number":3100,"title":"booking WP","url":"https://example.test/issues/3100","labels":[{"name":"agent-ready"}]}]'
L_RUNNING_FRESH='[{"number":3212,"updatedAt":"2099-01-01T00:00:00Z"}]'
L_QUOTA='[{"number":3217,"title":"providers L WP","url":"https://example.test/issues/3217"}]'

out=$(STUB_L_OPEN="$L_ISSUE" STUB_B_OPEN="$B_ISSUE" run_next)
assert_contains "$out" "ISSUE_NUMBER=3217" "higher-priority milestone drains first"
assert_contains "$out" "ISSUE_TITLE=providers L WP" "prints title for Providers L issue"

out=$(STUB_L_OPEN='[]' STUB_B_OPEN="$B_ISSUE" run_next)
assert_contains "$out" "ISSUE_NUMBER=3100" "falls through to later milestone when first is empty"

out=$(STUB_L_OPEN="$L_ISSUE" STUB_B_OPEN="$B_ISSUE" STUB_L_RUNNING="$L_RUNNING_FRESH" run_next)
assert_contains "$out" "found=false" "fresh running label idles the whole loop"
if printf '%s' "$out" | grep -q 'ISSUE_NUMBER='; then
  echo "FAIL idle run must not print ISSUE_NUMBER" >&2
  FAIL=$((FAIL + 1))
else
  echo "ok idle run omits ISSUE_NUMBER"
  PASS=$((PASS + 1))
fi

out=$(STUB_L_QUOTA="$L_QUOTA" STUB_L_OPEN="$L_ISSUE" STUB_B_OPEN="$B_ISSUE" STUB_RETRY_AT="2999-01-01T00:00:00Z" run_next)
assert_contains "$out" "found=false" "quota wait in the first milestone blocks later ones"

out=$(STUB_L_QUOTA="$L_QUOTA" STUB_RETRY_AT="2000-01-01T00:00:00Z" run_next)
assert_contains "$out" "ISSUE_NUMBER=3217" "retries quota-waiting issue after recorded time"

out=$(STUB_L_OPEN="$L_ISSUE" STUB_PRS='[{"number":1,"title":"fix","body":"Fixes #3217"}]' STUB_B_OPEN="$B_ISSUE" run_next)
assert_contains "$out" "ISSUE_NUMBER=3100" "skips issue that already has a Fixes PR"

echo
echo "passed=${PASS} failed=${FAIL}"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
