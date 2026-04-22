#!/bin/bash
set -e

if [ -z "${MONGO_REPLICA_SET_KEY:-}" ]; then
  echo "MONGO_REPLICA_SET_KEY is required." >&2
  exit 1
fi

mkdir -p /data/configdb
printf '%s\n' "$MONGO_REPLICA_SET_KEY" > /data/configdb/mongo-keyfile
chown mongodb:mongodb /data/configdb/mongo-keyfile
chmod 400 /data/configdb/mongo-keyfile

exec docker-entrypoint.sh "$@"
