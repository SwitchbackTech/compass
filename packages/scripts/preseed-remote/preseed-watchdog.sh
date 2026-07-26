#!/usr/bin/env bash
# Cron every 5 minutes. Alerts Discord if preseed looks dead or heartbeat is stale.
#
#   */5 * * * * PRESEED_OUT=/root/sync-preseed-prod/apply PRESEED_DISCORD_WEBHOOK_URL=... \
#     /root/compass-preseed/packages/scripts/preseed-remote/preseed-watchdog.sh
#
# Stale threshold: 15 minutes.

set -euo pipefail

OUT="${PRESEED_OUT:-/root/sync-preseed-prod/apply}"
PID_FILE="${OUT}/preseed.pid"
HEARTBEAT="${OUT}/heartbeat.json"
SUCCESS="${OUT}/SUCCESS.json"
DEDUPE="${OUT}/watchdog-alerted"
STALE_SECONDS="${PRESEED_STALE_SECONDS:-900}"
PRESEED_DISCORD_WEBHOOK_URL="${PRESEED_DISCORD_WEBHOOK_URL:-${DISCORD_DEPLOY_WEBHOOK_URL:-}}"

notify() {
  local msg="$1"
  # Always leave a local trail so cron without Discord still surfaces alerts.
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${msg}" >>"${OUT}/watchdog.log"
  echo "${msg}" >&2
  if [[ -z "${PRESEED_DISCORD_WEBHOOK_URL:-}" ]]; then
    return 0
  fi
  curl -sS -X POST -H 'Content-Type: application/json' \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"content": sys.argv[1][:1800]}))' "${msg}")" \
    "${PRESEED_DISCORD_WEBHOOK_URL}" >/dev/null || true
}

alert_once() {
  local msg="$1"
  if [[ -f "${DEDUPE}" ]]; then
    return 0
  fi
  notify "${msg}"
  date -u +%Y-%m-%dT%H:%M:%SZ >"${DEDUPE}"
}

# Finished successfully — clear dedupe and exit.
if [[ -f "${SUCCESS}" ]]; then
  rm -f "${DEDUPE}"
  exit 0
fi

# No pid file and no success: idle (not an alert unless failure.json exists).
if [[ ! -f "${PID_FILE}" ]]; then
  if [[ -f "${OUT}/failure.json" ]]; then
    alert_once "🚨 prod preseed failure.json present (no pid) out=${OUT}"
  fi
  exit 0
fi

pid="$(cat "${PID_FILE}" || true)"
if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
  alert_once "🚨 prod preseed pid dead (pid=${pid:-none}) without SUCCESS out=${OUT}"
  exit 0
fi

if [[ ! -f "${HEARTBEAT}" ]]; then
  alert_once "🚨 prod preseed running pid=${pid} but heartbeat.json missing out=${OUT}"
  exit 0
fi

age="$(python3 - <<PY
import json, time
from pathlib import Path
hb = json.loads(Path("${HEARTBEAT}").read_text())
ts = hb.get("ts")
if not isinstance(ts, str):
    print("invalid")
    raise SystemExit(0)
try:
    from datetime import datetime
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    print(int(time.time() - dt.timestamp()))
except (ValueError, AttributeError, TypeError):
    print("invalid")
PY
)"

if [[ "${age}" == "invalid" ]]; then
  alert_once "🚨 prod preseed heartbeat malformed pid=${pid} out=${OUT}"
  exit 0
fi

if [[ "${age}" -gt "${STALE_SECONDS}" ]]; then
  alert_once "🚨 prod preseed heartbeat stale age=${age}s pid=${pid} out=${OUT}"
fi
