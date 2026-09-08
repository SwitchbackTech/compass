#!/usr/bin/env bash
# Unauthenticated smoke of staging.compasscalendar.com.
# Never logs in. 404 is success (disabled or unknown booking page). 5xx fails.
set -euo pipefail

# shellcheck disable=SC1091
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/agent-loop-lib.sh"

base="${STAGING_URL:-https://staging.compasscalendar.com}"
base="${base%/}"
failures=0

check_url() {
  local path=$1
  local url="${base}${path}"
  local tmp http_code
  tmp=$(mktemp)
  http_code=$(
    curl -sS -o "$tmp" -w "%{http_code}" -L --max-time 30 \
      -A "compass-agent-loop-smoke" \
      "$url"
  ) || http_code="000"
  rm -f "$tmp"

  if [ "$http_code" = "000" ]; then
    echo "FAIL ${url} (curl error)" >&2
    failures=$((failures + 1))
    return 0
  fi
  if [ "$http_code" -ge 500 ]; then
    echo "FAIL ${url} HTTP ${http_code}" >&2
    failures=$((failures + 1))
    return 0
  fi
  echo "ok ${url} HTTP ${http_code}"
}

check_url "/"
check_url "/book/"
check_url "/book/tylerdeane"
check_url "/meet/"
check_url "/meet/tylerdeane"

if [ "$failures" -gt 0 ]; then
  echo "staging smoke failed (${failures} URL(s))" >&2
  exit 1
fi

echo "staging smoke passed against ${base}"
