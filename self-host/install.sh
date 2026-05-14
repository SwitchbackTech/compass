#!/bin/sh

COMPASS_HOME=${COMPASS_HOME:-$HOME/compass}
COMPASS_VERSION=${COMPASS_VERSION:-latest}
COMPASS_RAW_URL=https://raw.githubusercontent.com/SwitchbackTech/compass
# 'latest' is a Docker Hub tag, not a git ref. Map it to 'main' for raw file downloads.
case $COMPASS_VERSION in
  latest) COMPASS_GIT_REF=main ;;
  *)      COMPASS_GIT_REF=$COMPASS_VERSION ;;
esac

ENV_FILE=$COMPASS_HOME/.env
MARKER_FILE=$COMPASS_HOME/.compass-self-host
HELPER_FILE=$COMPASS_HOME/compass
COMPOSE_FILE=$COMPASS_HOME/docker-compose.yml

PROJECT_NAME=$(basename "$COMPASS_HOME")
WEB_PORT_VALUE=9080
PORT_VALUE=3000
APP_URL=http://localhost:9080
HEALTH_URL=http://localhost:3000/api/health
IS_REFRESH=0
TMP_ENV=
INSTALL_COMPLETE=0
FRESH_INSTALL_CREATED=0
STACK_TOUCHED=0

info() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Compass installer: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  if [ -n "$TMP_ENV" ] && [ -f "$TMP_ENV" ]; then
    rm -f "$TMP_ENV"
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$STACK_TOUCHED" -eq 1 ] && [ "$IS_REFRESH" -eq 0 ]; then
    compose_base down >/dev/null 2>&1 || true
    printf '%s\n' "Compass installer: Stopped failed install containers." >&2
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$FRESH_INSTALL_CREATED" -eq 1 ] && [ "$STACK_TOUCHED" -eq 0 ]; then
    rm -rf "$COMPASS_HOME"
    printf '%s\n' "Compass installer: Removed incomplete install files." >&2
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$FRESH_INSTALL_CREATED" -eq 1 ] && [ "$STACK_TOUCHED" -eq 1 ]; then
    printf '%s\n' "Compass installer: Left install files in place for retry and log inspection. Docker volumes were not deleted." >&2
  fi
}

interrupt() {
  trap - EXIT
  cleanup
  printf '%s\n' "Compass installer: Interrupted; cleaned up temporary files." >&2
  exit 1
}

trap cleanup EXIT
trap interrupt HUP INT TERM

is_interactive() {
  [ -t 0 ] && [ -t 1 ]
}

confirm_refresh() {
  info "Compass is already installed at $COMPASS_HOME."
  printf '%s' "Pull the latest images and restart Compass now? [y/N] "
  read answer || answer=

  case $answer in
    y | Y | yes | YES)
      return 0
      ;;
    *)
      info "Leaving the existing Compass install unchanged."
      exit 0
      ;;
  esac
}

check_missing_env_with_existing_volumes() {
  [ ! -f "$ENV_FILE" ] || return

  existing_volumes=
  delete_command="docker volume rm"
  for volume_name in \
    "${PROJECT_NAME}_compass_mongo_data" \
    "${PROJECT_NAME}_compass_supertokens_postgres_data"
  do
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
      existing_volumes="${existing_volumes}
  $volume_name"
      delete_command="$delete_command $volume_name"
    fi
  done

  [ -n "$existing_volumes" ] || return

  cat >&2 <<EOF
Compass installer: I found existing Compass Docker data, but $ENV_FILE is missing.

This usually means Compass was installed before, then the install folder or .env file was removed.
The installer stopped before creating a new .env because new database passwords could lock you out of that data.

Existing Docker volumes for "$PROJECT_NAME":$existing_volumes

Next steps:
  - Keep old data: restore $ENV_FILE, then rerun the installer.
  - Start fresh with a different name: set COMPASS_HOME to a new directory (the directory name becomes the project name).
    Example: curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | env COMPASS_HOME="$HOME/compass-new" sh
  - Start over after confirming you do not need the old data:
    $delete_command
EOF
  exit 1
}

check_install_dir() {
  if [ -e "$COMPASS_HOME" ] && [ ! -d "$COMPASS_HOME" ]; then
    fail "$COMPASS_HOME exists but is not a directory. Choose another COMPASS_HOME."
  fi

  if [ -d "$COMPASS_HOME" ]; then
    if [ ! -f "$MARKER_FILE" ]; then
      fail "$COMPASS_HOME already exists but is not a Compass install. Choose another COMPASS_HOME or move that folder aside."
    fi

    if ! is_interactive; then
      fail "Compass is already installed at $COMPASS_HOME. Use $HELPER_FILE update, or rerun this installer from an interactive shell to refresh and restart."
    fi

    IS_REFRESH=1
    confirm_refresh
    return
  fi
}

prepare_install_dir() {
  if [ "$IS_REFRESH" -eq 0 ] && [ ! -d "$COMPASS_HOME" ]; then
    FRESH_INSTALL_CREATED=1
  fi

  mkdir -p "$COMPASS_HOME" || fail "Could not create $COMPASS_HOME."
}

require_command() {
  command_name=$1
  message=$2

  command -v "$command_name" >/dev/null 2>&1 || fail "$message"
}

require_prerequisites() {
  require_command curl "curl is required. Install curl, then rerun this installer."
  require_command docker "Docker is required. Install Docker Desktop or Docker Engine, start it, then rerun this installer."

  docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker, then rerun this installer."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose is required. Install Docker Compose, then rerun this installer."
}

port_is_busy() {
  port=$1

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return $?
  fi

  curl -sS --max-time 1 -o /dev/null "http://127.0.0.1:$port/" >/dev/null 2>&1
}

check_required_ports() {
  for port in "$WEB_PORT_VALUE" "$PORT_VALUE"; do
    if port_is_busy "$port"; then
      fail "Port $port is already in use. Stop the process using it, then rerun this installer."
    fi
  done
}

validate_port_value() {
  name=$1
  value=$2

  case $value in
    '' | *[!0123456789]*)
      fail "$name must be a number from 1 to 65535. Found: $value"
      ;;
  esac

  if [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
    fail "$name must be a number from 1 to 65535. Found: $value"
  fi
}

strip_quotes() {
  value=$1

  case $value in
    \"*\")
      value=${value#\"}
      value=${value%%\"*}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%%\'*}
      ;;
    *" #"*)
      value=${value%%" #"*}
      while :; do
        case $value in
          *" ")
            value=${value% }
            ;;
          *)
            break
            ;;
        esac
      done
      ;;
  esac

  printf '%s\n' "$value"
}

read_env_value() {
  key=$1
  value=
  found=0

  [ -f "$ENV_FILE" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    case $line in
      "$key="*)
        value=${line#*=}
        found=1
        ;;
    esac
  done < "$ENV_FILE"

  if [ "$found" -eq 1 ]; then
    printf '%s\n' "$value"
  fi
}

load_runtime_config() {
  web_port=$(strip_quotes "$(read_env_value WEB_PORT)")
  backend_port=$(strip_quotes "$(read_env_value PORT)")

  WEB_PORT_VALUE=${web_port:-9080}
  PORT_VALUE=${backend_port:-3000}
  validate_port_value WEB_PORT "$WEB_PORT_VALUE"
  validate_port_value PORT "$PORT_VALUE"

  frontend_url=$(strip_quotes "$(read_env_value FRONTEND_URL)")
  health_url=$(strip_quotes "$(read_env_value COMPASS_HEALTH_URL)")

  APP_URL=${frontend_url:-http://localhost:$WEB_PORT_VALUE}
  HEALTH_URL=${COMPASS_HEALTH_URL:-${health_url:-http://localhost:$PORT_VALUE/api/health}}
}

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
    return
  fi

  if [ -r /dev/urandom ]; then
    dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
    printf '\n'
    return
  fi

  return 1
}

generate_secret() {
  label=$1

  secret=$(random_hex) || fail "Could not generate $label. Install openssl or provide /dev/urandom."

  if [ "${#secret}" -ne 64 ]; then
    fail "Generated $label was invalid. Expected a 64-character hex string."
  fi

  case $secret in
    *[!0123456789abcdefABCDEF]*)
      fail "Generated $label was invalid. Expected a 64-character hex string."
      ;;
  esac

  printf '%s\n' "$secret"
}

validate_existing_secret() {
  key=$1
  placeholder=$2
  value=$(strip_quotes "$(read_env_value "$key")")

  if [ -z "$value" ]; then
    fail "$ENV_FILE has an empty required secret: $key. Set a non-placeholder value, then rerun this installer."
  fi

  if [ "$value" = "$placeholder" ]; then
    fail "$ENV_FILE still has the template placeholder for $key. Set a real value, then rerun this installer."
  fi
}

validate_existing_mongo_uri() {
  mongo_uri=$(strip_quotes "$(read_env_value MONGO_URI)")

  if [ -z "$mongo_uri" ]; then
    fail "$ENV_FILE has an empty required MongoDB connection string: MONGO_URI. Set a non-placeholder value, then rerun this installer."
  fi

  case $mongo_uri in
    *replace-with-generated-mongo-password* | *YOUR_ADMIN_PW* | *change-me-mongo-password-32chars*)
      fail "$ENV_FILE has a placeholder password in MONGO_URI. Set a real value, then rerun this installer."
      ;;
  esac
}

ensure_existing_generated_secret() {
  key=$1
  label=$2
  value=$(strip_quotes "$(read_env_value "$key")")

  if [ -n "$value" ]; then
    return
  fi

  secret=$(generate_secret "$label") || exit 1
  printf '\n%s=%s\n' "$key" "$secret" >> "$ENV_FILE" \
    || fail "Could not add $key to $ENV_FILE."
  chmod 600 "$ENV_FILE" || fail "Could not secure $ENV_FILE."
  info "Added missing $key to $ENV_FILE."
}

ensure_existing_local_mongo_uri_replica_set() {
  mongo_uri=$(strip_quotes "$(read_env_value MONGO_URI)")

  case $mongo_uri in
    *mongo:27017*) ;;
    *) return ;;
  esac

  case $mongo_uri in
    *replicaSet=*) return ;;
  esac

  separator="?"
  case $mongo_uri in
    *\?*) separator="&" ;;
  esac

  TMP_ENV=$COMPASS_HOME/.env.$$
  while IFS= read -r line || [ -n "$line" ]; do
    case $line in
      MONGO_URI=*)
        printf 'MONGO_URI=%s%sreplicaSet=rs0\n' "$mongo_uri" "$separator"
        ;;
      *)
        printf '%s\n' "$line"
        ;;
    esac
  done < "$ENV_FILE" > "$TMP_ENV" \
    || fail "Could not update $ENV_FILE with MongoDB replica set settings."

  chmod 600 "$TMP_ENV" || fail "Could not secure temporary env file."
  mv "$TMP_ENV" "$ENV_FILE" \
    || fail "Could not update $ENV_FILE with MongoDB replica set settings."
  TMP_ENV=
  info "Updated MONGO_URI to include MongoDB replica set rs0."
}

validate_existing_env_secrets() {
  [ -f "$ENV_FILE" ] || return

  ensure_existing_generated_secret MONGO_REPLICA_SET_KEY "MongoDB replica set key"
  ensure_existing_local_mongo_uri_replica_set

  validate_existing_secret MONGO_INITDB_ROOT_PASSWORD change-me-mongo-password-32chars
  validate_existing_secret MONGO_REPLICA_SET_KEY change-me-mongo-replica-set-key-32chars
  validate_existing_secret SUPERTOKENS_POSTGRES_PASSWORD change-me-supertokens-postgres-pass-32
  validate_existing_secret SUPERTOKENS_KEY change-me-supertokens-key-32chars
  validate_existing_secret TOKEN_COMPASS_SYNC change-me-compass-sync-token-32chars
  validate_existing_secret TOKEN_GCAL_NOTIFICATION change-me-gcal-notification-token-32chars
  validate_existing_mongo_uri
}

write_env_if_missing() {
  if [ -f "$ENV_FILE" ]; then
    info "Keeping existing environment file at $ENV_FILE."
    validate_existing_env_secrets
    return
  fi

  mongo_password=$(generate_secret "MongoDB password") || exit 1
  mongo_replica_set_key=$(generate_secret "MongoDB replica set key") || exit 1
  supertokens_postgres_password=$(generate_secret "SuperTokens Postgres password") || exit 1
  supertokens_key=$(generate_secret "SuperTokens API key") || exit 1
  compass_sync_token=$(generate_secret "Compass sync token") || exit 1
  gcal_notification_token=$(generate_secret "Google Calendar notification token") || exit 1

  umask 077
  TMP_ENV=$COMPASS_HOME/.env.$$
  cat > "$TMP_ENV" <<EOF
# See for a detailed description of each variable here:
# https://docs.compasscalendar.com/docs/self-hosting/environment-variables

# Compose
COMPASS_VERSION=$COMPASS_VERSION

# Local ports
WEB_PORT=9080
PORT=3000

# Runtime
NODE_ENV=production
TZ=Etc/UTC
LOG_LEVEL=info

# Local URLs
FRONTEND_URL=https://cal.yourdomain.com
BASEURL=https://cal.yourdomain.com/api
CORS=https://cal.yourdomain.com

# Compass MongoDB
MONGO_INITDB_ROOT_USERNAME=compass
MONGO_INITDB_ROOT_PASSWORD=$mongo_password
MONGO_REPLICA_SET_KEY=$mongo_replica_set_key
MONGO_URI=mongodb://compass:$mongo_password@mongo:27017/prod_calendar?authSource=admin&replicaSet=rs0

# SuperTokens Postgres
SUPERTOKENS_POSTGRES_USER=supertokens
SUPERTOKENS_POSTGRES_PASSWORD=$supertokens_postgres_password
SUPERTOKENS_POSTGRES_DB=supertokens

# SuperTokens Core
SUPERTOKENS_URI=http://supertokens:3567
SUPERTOKENS_KEY=$supertokens_key

# Internal tokens
TOKEN_COMPASS_SYNC=$compass_sync_token
TOKEN_GCAL_NOTIFICATION=$gcal_notification_token

# Google OAuth
GOOGLE_CLIENT_ID=compass-self-host-placeholder.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=compass-self-host-placeholder-secret
CHANNEL_EXPIRATION_MIN=10
EOF

  chmod 600 "$TMP_ENV" || fail "Could not secure temporary env file."
  mv "$TMP_ENV" "$ENV_FILE" || fail "Could not write $ENV_FILE."
  TMP_ENV=
  info "Created $ENV_FILE with local defaults and generated secrets."
}

download_compose_file() {
  tmp_compose=$COMPASS_HOME/docker-compose.yml.$$
  info "Downloading docker-compose.yml for Compass ${COMPASS_VERSION}."
  curl -fsSL "${COMPASS_RAW_URL}/${COMPASS_GIT_REF}/self-host/docker-compose.yml" -o "$tmp_compose" \
    || fail "Could not download docker-compose.yml for version ${COMPASS_VERSION}. Check that the version exists."

  if [ -f "$COMPOSE_FILE" ]; then
    cp "$COMPOSE_FILE" "${COMPASS_HOME}/.docker-compose.yml.bak" || true
  fi

  mv "$tmp_compose" "$COMPOSE_FILE" || fail "Could not install docker-compose.yml."
}

download_helper() {
  info "Downloading compass helper for Compass ${COMPASS_VERSION}."
  curl -fsSL "${COMPASS_RAW_URL}/${COMPASS_GIT_REF}/self-host/compass" -o "$HELPER_FILE" \
    || fail "Could not download compass helper for version ${COMPASS_VERSION}."
  chmod +x "$HELPER_FILE" || fail "Could not make $HELPER_FILE executable."
}

write_marker() {
  cat > "$MARKER_FILE" <<EOF
Compass self-host install
COMPASS_HOME=$COMPASS_HOME
COMPASS_VERSION=$COMPASS_VERSION
EOF
  [ $? -eq 0 ] || fail "Could not write marker file: $MARKER_FILE."
}

compose_base() {
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

start_stack() {
  info "Starting Compass. Pulling images on first run — this may take a few minutes."
  STACK_TOUCHED=1
  compose_base up -d || fail "Docker Compose failed. Compass was not started."
}

health_check() {
  curl --max-time 5 -fsS "$HEALTH_URL" >/dev/null 2>&1
}

wait_for_health() {
  tries=60

  while [ "$tries" -gt 0 ]; do
    if health_check; then
      return 0
    fi

    tries=$((tries - 1))
    sleep 2
  done

  return 1
}

print_recent_logs() {
  printf '%s\n' "Recent Compass logs:" >&2
  compose_base logs --tail 80 >&2 || true
}

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$APP_URL" >/dev/null 2>&1 || true
    return
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 || true
    return
  fi

  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "" "$APP_URL" >/dev/null 2>&1 || true
  fi
}

print_google_note() {
  google_client_id=$(strip_quotes "$(read_env_value GOOGLE_CLIENT_ID)")
  google_client_secret=$(strip_quotes "$(read_env_value GOOGLE_CLIENT_SECRET)")

  cat <<EOF
Google setup:
EOF

  if [ "$google_client_id" = "compass-self-host-placeholder.apps.googleusercontent.com" ] \
    || [ "$google_client_secret" = "compass-self-host-placeholder-secret" ] \
    || [ -z "$google_client_id" ] \
    || [ -z "$google_client_secret" ]; then
    cat <<EOF
  Google auth and Google Calendar sync are not configured.
  This install uses placeholder Google OAuth values.
  To add your own OAuth credentials, edit:
    $ENV_FILE
  Then rebuild the web image (BASEURL and GOOGLE_CLIENT_ID are baked in at build time):
    $HELPER_FILE rebuild
  See https://docs.compasscalendar.com/docs/self-hosting/google-calendar
EOF
  else
    cat <<EOF
  Custom Google OAuth credentials are present in:
    $ENV_FILE
  If you change GOOGLE_CLIENT_ID or BASEURL, rebuild the web image to apply them:
    $HELPER_FILE rebuild
EOF
  fi
}

print_success() {
  cat <<EOF

Compass is running locally.

URL:
  $APP_URL

EOF

  print_google_note

  cat <<EOF

Useful commands:
  cd "$COMPASS_HOME"
  ./compass status
  ./compass logs
  ./compass restart
  ./compass rebuild
  ./compass update
  ./compass stop

Data volumes:
  ${PROJECT_NAME}_compass_mongo_data
  ${PROJECT_NAME}_compass_supertokens_postgres_data

The installer never deletes Docker volumes or user data.
EOF
}

# ── Main ──────────────────────────────────────────────────────────────────────

check_install_dir
require_prerequisites
load_runtime_config
check_missing_env_with_existing_volumes

if [ "$IS_REFRESH" -eq 0 ]; then
  check_required_ports
else
  info "Refreshing existing install; Docker Compose will reuse configured ports $WEB_PORT_VALUE and $PORT_VALUE."
fi

prepare_install_dir
write_env_if_missing
load_runtime_config
download_compose_file
download_helper
write_marker
start_stack

if wait_for_health; then
  INSTALL_COMPLETE=1
  open_browser
  print_success
else
  print_recent_logs
  fail "Compass started, but $HEALTH_URL did not become healthy within 2 minutes."
fi
