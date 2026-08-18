#!/usr/bin/env bash
#
# One-command local backend bootstrap for Compass (Linux dev VMs / Cursor Cloud).
#
# Idempotent and safe to re-run. It:
#   1. Writes a working compass.yaml (if missing) with non-placeholder values so
#      config validation passes. Real auth/Google values are read from the
#      environment when present (SUPERTOKENS_URI, SUPERTOKENS_KEY,
#      GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET); otherwise safe local dummies are
#      used and Google stays disabled.
#   2. Installs MongoDB (mongodb-org) if it is not already present.
#   3. Starts MongoDB as a single-node replica set (the backend uses
#      transactions, so a replica set with `replicaSet=` in the URI is required).
#
# After this, run `bun run dev:backend` and check `curl -s localhost:3000/api/health`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/dev_calendar?replicaSet=rs0}"
# Sync uses an isolated database on the same local replica set.
SYNC_MONGO_URI="${SYNC_MONGO_URI:-mongodb://localhost:27017/compass_sync?replicaSet=rs0}"

# 1. compass.yaml -----------------------------------------------------------
if [ ! -f compass.yaml ]; then
  echo "[bootstrap] creating compass.yaml from compass.example.yaml"
  cp compass.example.yaml compass.yaml
  sed -i \
    -e "s#REPLACE_WITH_COMPASS_TOKEN#${COMPASS_TOKEN:-local-dev-compass-token}#" \
    -e "s#REPLACE_WITH_SUPERTOKENS_URI#${SUPERTOKENS_URI:-http://localhost:3567}#" \
    -e "s#REPLACE_WITH_SUPERTOKENS_KEY#${SUPERTOKENS_KEY:-local-dev-supertokens-key}#" \
    -e "s#REPLACE_WITH_SYNC_INTERNAL_AUTH_TOKEN#${SYNC_INTERNAL_AUTH_TOKEN:-local-dev-sync-internal-auth-token}#" \
    compass.yaml
  # Replace the whole mongo.uri line (the example ships an Atlas placeholder).
  sed -i "s#^  uri: mongodb.*#  uri: ${MONGO_URI//#/\\#}#" compass.yaml
  # The sync service needs an isolated database on the same local replica set.
  # Replace the sync.mongoUri line (the example ships an Atlas placeholder).
  sed -i "s#^  mongoUri: mongodb.*#  mongoUri: ${SYNC_MONGO_URI//#/\\#}#" compass.yaml

  if [ -n "${GOOGLE_CLIENT_ID:-}" ] && [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then
    echo "[bootstrap] enabling Google integration from environment"
    {
      echo ""
      echo "google:"
      echo "  clientId: ${GOOGLE_CLIENT_ID}"
      echo "  clientSecret: ${GOOGLE_CLIENT_SECRET}"
    } >> compass.yaml
  fi
else
  echo "[bootstrap] compass.yaml already exists — leaving it untouched"
fi

# 2. MongoDB ----------------------------------------------------------------
if ! command -v mongod >/dev/null 2>&1; then
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "[bootstrap] mongod not found and apt-get unavailable; install MongoDB 8.0 manually." >&2
    exit 1
  fi
  echo "[bootstrap] installing mongodb-org"
  . /etc/os-release
  curl -fsSL https://pgp.mongodb.com/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${VERSION_CODENAME}/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq mongodb-org
fi

# 3. Start + initiate replica set ------------------------------------------
if ! pgrep -x mongod >/dev/null 2>&1; then
  echo "[bootstrap] starting mongod (single-node replica set rs0)"
  sudo mkdir -p /data/db
  sudo chown -R "$(whoami)" /data/db
  mongod --dbpath /data/db --replSet rs0 --bind_ip 127.0.0.1 --port 27017 \
    --fork --logpath /tmp/mongod.log
fi

if ! mongosh --quiet --eval 'rs.status().ok' >/dev/null 2>&1; then
  echo "[bootstrap] initiating replica set rs0"
  mongosh --quiet --eval \
    'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
fi

echo "[bootstrap] done. Start the API with: bun run dev:backend"
echo "[bootstrap] health check:            curl -s localhost:3000/api/health"
