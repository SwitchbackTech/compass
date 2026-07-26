#!/usr/bin/env bash
# Run production Sync preseed on a durable host (not a laptop Cursor session).
#
# Single-runner rule: only one --apply against a given Sync DB at a time.
# Prefer tmux:  tmux new -s preseed './run-preseed.sh'
#
# Required env:
#   COMPASS_CONFIG_FILE  path to compass.yaml with mongo.uri + sync.mongoUri
# Optional:
#   PRESEED_OUT          artifact dir (default /root/sync-preseed-prod/apply)
#   PRESEED_REPO         repo checkout (default directory containing this script/../../..)
#   PRESEED_CONCURRENCY  default 4
#   PRESEED_REPROJECT    after|inline|off (default after)
#   PRESEED_DISCORD_WEBHOOK_URL  notify on non-zero exit / used by watchdog

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${PRESEED_REPO:-$(cd "${SCRIPT_DIR}/../../.." && pwd)}"
OUT="${PRESEED_OUT:-/root/sync-preseed-prod/apply}"
CONCURRENCY="${PRESEED_CONCURRENCY:-4}"
REPROJECT="${PRESEED_REPROJECT:-after}"
PID_FILE="${OUT}/preseed.pid"
export PATH="${HOME}/.bun/bin:/root/.bun/bin:${PATH}"

if [[ -z "${COMPASS_CONFIG_FILE:-}" ]]; then
  echo "COMPASS_CONFIG_FILE is required" >&2
  exit 2
fi

mkdir -p "${OUT}"
cd "${REPO_ROOT}"

if [[ -f "${PID_FILE}" ]]; then
  old_pid="$(cat "${PID_FILE}" || true)"
  if [[ -n "${old_pid}" ]] && kill -0 "${old_pid}" 2>/dev/null; then
    echo "preseed already running pid=${old_pid}" >&2
    exit 3
  fi
fi

echo $$ >"${PID_FILE}"

notify() {
  local msg="$1"
  if [[ -n "${PRESEED_DISCORD_WEBHOOK_URL:-}" ]]; then
    curl -sS -X POST -H 'Content-Type: application/json' \
      -d "$(python3 -c 'import json,sys; print(json.dumps({"content": sys.argv[1][:1800]}))' "${msg}")" \
      "${PRESEED_DISCORD_WEBHOOK_URL}" >/dev/null || true
  fi
}

cleanup() {
  local code=$?
  rm -f "${PID_FILE}"
  if [[ "${code}" -ne 0 ]]; then
    notify "🚨 prod preseed-sync FAILED exit=${code} host=$(hostname) out=${OUT}"
  else
    notify "✅ prod preseed-sync SUCCESS host=$(hostname) out=${OUT}"
  fi
  exit "${code}"
}
trap cleanup EXIT

echo "preseed start repo=${REPO_ROOT} out=${OUT} concurrency=${CONCURRENCY} reproject=${REPROJECT}"
bun packages/scripts/src/cli.ts preseed-sync \
  --apply \
  --mode live \
  --phase all \
  --reproject "${REPROJECT}" \
  --concurrency "${CONCURRENCY}" \
  --out "${OUT}"
