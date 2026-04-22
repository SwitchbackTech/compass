#!/bin/sh

if [ "${COMPASS_REF+x}" = x ]; then
  COMPASS_REF_FROM_SHELL=1
else
  COMPASS_REF_FROM_SHELL=0
fi

if [ "${COMPASS_ARCHIVE_URL+x}" = x ]; then
  COMPASS_ARCHIVE_URL_FROM_SHELL=1
else
  COMPASS_ARCHIVE_URL_FROM_SHELL=0
fi

COMPASS_HOME=${COMPASS_HOME:-$HOME/compass}
COMPASS_REPO_URL=${COMPASS_REPO_URL:-https://github.com/SwitchbackTech/compass.git}
COMPASS_REF=${COMPASS_REF:-main}
COMPASS_ARCHIVE_URL=${COMPASS_ARCHIVE_URL:-https://github.com/SwitchbackTech/compass/archive/${COMPASS_REF}.tar.gz}

APP_DIR=$COMPASS_HOME/app
ENV_FILE=$COMPASS_HOME/.env
MARKER_FILE=$COMPASS_HOME/.compass-self-host
HELPER_FILE=$COMPASS_HOME/compass
COMPOSE_FILE=$APP_DIR/self-host/docker-compose.yml
OLD_COMPOSE_FILE=$APP_DIR/self-host/docker-compose.yml
PROJECT_NAME=${COMPOSE_PROJECT_NAME:-compass}
WEB_PORT_VALUE=9080
PORT_VALUE=3000
BASEURL_VALUE=http://localhost:3000/api
APP_URL=http://localhost:9080
HEALTH_URL=http://localhost:3000/api/health
IS_REFRESH=0
TMP_APP=
TMP_ARCHIVE_DIR=
TMP_ENV=
APP_BACKUP=
HELPER_BACKUP=
MARKER_BACKUP=
INSTALL_SOURCE=
INSTALL_COMPLETE=0
FRESH_INSTALL_CREATED=0
FRESH_STACK_TOUCHED=0
REFRESH_STACK_TOUCHED=0

info() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Compass installer: %s\n' "$*" >&2
  exit 1
}

restore_app_backup() {
  if [ -n "$APP_BACKUP" ] && [ -d "$APP_BACKUP" ]; then
    rm -rf "$APP_DIR"
    if mv "$APP_BACKUP" "$APP_DIR"; then
      APP_BACKUP=
      printf '%s\n' "Compass installer: Restored previous app files." >&2
    else
      printf 'Compass installer: Could not restore previous app files from %s.\n' "$APP_BACKUP" >&2
    fi
  fi
}

restore_helper_backup() {
  if [ -n "$HELPER_BACKUP" ]; then
    rm -f "$HELPER_FILE"
    if [ -f "$HELPER_BACKUP" ]; then
      if mv "$HELPER_BACKUP" "$HELPER_FILE"; then
        printf '%s\n' "Compass installer: Restored previous helper command." >&2
      else
        printf 'Compass installer: Could not restore previous helper command from %s.\n' "$HELPER_BACKUP" >&2
      fi
    fi
    HELPER_BACKUP=
  fi
}

restore_marker_backup() {
  if [ -n "$MARKER_BACKUP" ]; then
    rm -f "$MARKER_FILE"
    if [ -f "$MARKER_BACKUP" ]; then
      if mv "$MARKER_BACKUP" "$MARKER_FILE"; then
        printf '%s\n' "Compass installer: Restored previous marker file." >&2
      else
        printf 'Compass installer: Could not restore previous marker file from %s.\n' "$MARKER_BACKUP" >&2
      fi
    fi
    MARKER_BACKUP=
  fi
}

cleanup() {
  if [ -n "$TMP_APP" ] && [ -d "$TMP_APP" ]; then
    rm -rf "$TMP_APP"
  fi

  if [ -n "$TMP_ARCHIVE_DIR" ] && [ -d "$TMP_ARCHIVE_DIR" ]; then
    rm -rf "$TMP_ARCHIVE_DIR"
  fi

  if [ -n "$TMP_ENV" ] && [ -f "$TMP_ENV" ]; then
    rm -f "$TMP_ENV"
  fi

  restore_marker_backup
  restore_helper_backup
  restore_app_backup

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$FRESH_STACK_TOUCHED" -eq 1 ]; then
    compose_base down >/dev/null 2>&1 || true
    printf '%s\n' "Compass installer: Stopped failed fresh install containers." >&2
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$FRESH_INSTALL_CREATED" -eq 1 ] && [ "$FRESH_STACK_TOUCHED" -eq 0 ]; then
    rm -rf "$COMPASS_HOME"
    printf '%s\n' "Compass installer: Removed incomplete fresh install files." >&2
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$FRESH_INSTALL_CREATED" -eq 1 ] && [ "$FRESH_STACK_TOUCHED" -eq 1 ]; then
    printf '%s\n' "Compass installer: Left fresh install files in place for retry and log inspection. Docker volumes were not deleted." >&2
  fi

  if [ "$INSTALL_COMPLETE" -eq 0 ] && [ "$REFRESH_STACK_TOUCHED" -eq 1 ] && [ -f "$OLD_COMPOSE_FILE" ]; then
    COMPOSE_FILE=$OLD_COMPOSE_FILE
    if compose_base up -d --build >/dev/null 2>&1; then
      printf '%s\n' "Compass installer: Restarted the previous Compass stack." >&2
    else
      printf '%s\n' "Compass installer: Could not restart the previous Compass stack. Run './compass logs' from your Compass home for details." >&2
    fi
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
  printf '%s' "Refresh the app files and restart Compass now? [y/N] "
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

check_fresh_install_volumes() {
  [ "$IS_REFRESH" -eq 0 ] || return
  [ ! -f "$ENV_FILE" ] || return

  existing_volumes=
  for volume_name in \
    "${PROJECT_NAME}_compass_mongo_data" \
    "${PROJECT_NAME}_compass_supertokens_postgres_data"
  do
    if docker volume inspect "$volume_name" >/dev/null 2>&1; then
      existing_volumes="${existing_volumes}
  $volume_name"
    fi
  done

  [ -n "$existing_volumes" ] || return

  cat >&2 <<EOF
Compass installer: Docker volumes already exist for project "$PROJECT_NAME", but $ENV_FILE is missing.
Compass installer: Restore the matching .env, choose a different COMPOSE_PROJECT_NAME, or intentionally remove the old Docker volumes yourself.
Compass installer: Existing volumes:$existing_volumes
EOF
  exit 1
}

check_install_dir() {
  if [ -e "$COMPASS_HOME" ] && [ ! -d "$COMPASS_HOME" ]; then
    fail "$COMPASS_HOME exists but is not a directory. Choose another COMPASS_HOME."
  fi

  if [ -d "$COMPASS_HOME" ]; then
    if [ ! -f "$MARKER_FILE" ]; then
      fail "$COMPASS_HOME already exists, but it is not marked as a Compass self-host install. Choose another COMPASS_HOME or move that folder aside."
    fi

    if ! is_interactive; then
      if [ -d "$APP_DIR/.git" ]; then
        fail "Compass is already installed at $COMPASS_HOME. Use $HELPER_FILE update, or rerun this installer from an interactive shell to refresh and restart."
      fi

      fail "Compass is already installed at $COMPASS_HOME from an archive. Rerun this installer from an interactive shell to refresh and restart."
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

validate_compass_ref() {
  case $COMPASS_REF in
    -*)
      fail "COMPASS_REF must not start with '-'. Found: $COMPASS_REF"
      ;;
    '' | *[!ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._/@+-]*)
      fail "COMPASS_REF must be non-empty and contain only letters, numbers, '.', '_', '/', '@', '+', or '-'. Found: $COMPASS_REF"
      ;;
  esac
}

strip_quotes() {
  value=$1

  case $value in
    \"*\")
      value=${value#\"}
      value=${value%\"}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%\'}
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

append_health_path() {
  base_url=$1

  while :; do
    case $base_url in
      */)
        base_url=${base_url%/}
        ;;
      *)
        break
        ;;
    esac
  done

  printf '%s/health\n' "$base_url"
}

load_runtime_config() {
  saved_ref=$(strip_quotes "$(read_env_value COMPASS_REF)")
  project_name=$(strip_quotes "$(read_env_value COMPOSE_PROJECT_NAME)")
  web_port=$(strip_quotes "$(read_env_value WEB_PORT)")
  backend_port=$(strip_quotes "$(read_env_value PORT)")

  if [ "$COMPASS_REF_FROM_SHELL" -eq 0 ] && [ -n "$saved_ref" ]; then
    COMPASS_REF=$saved_ref
  fi

  validate_compass_ref

  if [ "$COMPASS_ARCHIVE_URL_FROM_SHELL" -eq 0 ]; then
    COMPASS_ARCHIVE_URL=https://github.com/SwitchbackTech/compass/archive/${COMPASS_REF}.tar.gz
  fi

  PROJECT_NAME=${project_name:-${COMPOSE_PROJECT_NAME:-compass}}
  WEB_PORT_VALUE=${web_port:-9080}
  PORT_VALUE=${backend_port:-3000}
  validate_port_value WEB_PORT "$WEB_PORT_VALUE"
  validate_port_value PORT "$PORT_VALUE"

  frontend_url=$(strip_quotes "$(read_env_value FRONTEND_URL)")
  baseurl=$(strip_quotes "$(read_env_value BASEURL)")

  APP_URL=${frontend_url:-http://localhost:$WEB_PORT_VALUE}
  BASEURL_VALUE=${baseurl:-http://localhost:$PORT_VALUE/api}
  HEALTH_URL=$(append_health_path "$BASEURL_VALUE")
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
    fail "Generated $label was invalid. Expected a 64-character hex secret."
  fi

  case $secret in
    *[!0123456789abcdefABCDEF]*)
      fail "Generated $label was invalid. Expected a 64-character hex secret."
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

validate_existing_env_secrets() {
  [ -f "$ENV_FILE" ] || return

  validate_existing_secret MONGO_INITDB_ROOT_PASSWORD change-me-mongo-password-32chars
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
  supertokens_postgres_password=$(generate_secret "SuperTokens Postgres password") || exit 1
  supertokens_key=$(generate_secret "SuperTokens API key") || exit 1
  compass_sync_token=$(generate_secret "Compass sync token") || exit 1
  gcal_notification_token=$(generate_secret "Google Calendar notification token") || exit 1

  umask 077
  TMP_ENV=$COMPASS_HOME/.env.$$
  cat > "$TMP_ENV" <<EOF
# Compose
COMPOSE_PROJECT_NAME=$PROJECT_NAME
COMPASS_REF=$COMPASS_REF

# Local ports
WEB_PORT=9080
PORT=3000

# Runtime
NODE_ENV=production
TZ=Etc/UTC
LOG_LEVEL=info

# Local URLs
FRONTEND_URL=http://localhost:9080
BASEURL=http://localhost:3000/api
CORS=http://localhost:9080,http://localhost:3000

# Compass MongoDB
MONGO_INITDB_ROOT_USERNAME=compass
MONGO_INITDB_ROOT_PASSWORD=$mongo_password
MONGO_URI=mongodb://compass:$mongo_password@mongo:27017/prod_calendar?authSource=admin

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
  info "Google sign-in is temporary placeholder-only until you add your own Google OAuth client ID and secret."
}

download_with_git() {
  target_dir=$1
  INSTALL_SOURCE=git

  rm -rf "$target_dir"
  mkdir -p "$target_dir" || fail "Could not create a temporary git checkout directory."
  git -C "$target_dir" init -q \
    || fail "Could not initialize a git checkout for $COMPASS_REPO_URL."
  git -C "$target_dir" remote add origin "$COMPASS_REPO_URL" \
    || fail "Could not configure git remote $COMPASS_REPO_URL."
  git -C "$target_dir" fetch --depth 1 origin -- "$COMPASS_REF" \
    || fail "Could not fetch $COMPASS_REPO_URL at ref $COMPASS_REF."
  git -C "$target_dir" -c advice.detachedHead=false checkout --quiet --force FETCH_HEAD \
    || fail "Could not check out $COMPASS_REPO_URL at ref $COMPASS_REF."
}

download_with_archive() {
  target_dir=$1
  INSTALL_SOURCE=archive

  require_command tar "tar is required when git is not available. Install tar, then rerun this installer."

  TMP_ARCHIVE_DIR=${TMPDIR:-/tmp}/compass-archive.$$
  archive_file=$TMP_ARCHIVE_DIR/compass.tar.gz
  extract_dir=$TMP_ARCHIVE_DIR/extract

  rm -rf "$TMP_ARCHIVE_DIR"
  mkdir -p "$extract_dir" || fail "Could not create a temporary download directory."

  curl -fsSL "$COMPASS_ARCHIVE_URL" -o "$archive_file" \
    || fail "Could not download $COMPASS_ARCHIVE_URL."
  tar -xzf "$archive_file" -C "$extract_dir" \
    || fail "Could not unpack $COMPASS_ARCHIVE_URL."

  set -- "$extract_dir"/*
  if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then
    fail "Downloaded archive did not contain one Compass source directory."
  fi

  mv "$1" "$target_dir" || fail "Could not prepare Compass app files."
}

replace_app_dir() {
  APP_BACKUP=$COMPASS_HOME/.app-previous.$$

  prepare_install_dir
  rm -rf "$APP_BACKUP"

  if [ -d "$APP_DIR" ]; then
    mv "$APP_DIR" "$APP_BACKUP" \
      || fail "Could not prepare the existing app directory for replacement."
  fi

  if mv "$TMP_APP" "$APP_DIR"; then
    TMP_APP=
    return
  fi

  if [ -d "$APP_BACKUP" ] && [ ! -e "$APP_DIR" ]; then
    mv "$APP_BACKUP" "$APP_DIR" \
      || fail "Could not move new app files into $APP_DIR. The previous app is preserved at $APP_BACKUP."
    APP_BACKUP=
  fi

  fail "Could not move new app files into $APP_DIR. The previous app was preserved."
}

finish_app_replacement() {
  if [ -n "$APP_BACKUP" ] && [ -d "$APP_BACKUP" ]; then
    rm -rf "$APP_BACKUP" || fail "Could not remove old app backup: $APP_BACKUP."
    APP_BACKUP=
  fi
}

finish_file_replacement() {
  finish_app_replacement
  if [ -n "$HELPER_BACKUP" ]; then
    rm -f "$HELPER_BACKUP" || fail "Could not remove old helper backup: $HELPER_BACKUP."
    HELPER_BACKUP=
  fi
  if [ -n "$MARKER_BACKUP" ]; then
    rm -f "$MARKER_BACKUP" || fail "Could not remove old marker backup: $MARKER_BACKUP."
    MARKER_BACKUP=
  fi
}

download_app() {
  TMP_APP=${TMPDIR:-/tmp}/compass-app.$$
  rm -rf "$TMP_APP"

  if command -v git >/dev/null 2>&1; then
    info "Downloading Compass with git from $COMPASS_REPO_URL at $COMPASS_REF."
    download_with_git "$TMP_APP"
  else
    info "git was not found; downloading Compass archive from $COMPASS_ARCHIVE_URL."
    download_with_archive "$TMP_APP"
  fi

  [ -f "$TMP_APP/self-host/docker-compose.yml" ] \
    || fail "Downloaded Compass source is missing self-host/docker-compose.yml."
  [ -f "$TMP_APP/self-host/compass" ] \
    || fail "Downloaded Compass source is missing self-host/compass."
}

install_staged_app() {
  replace_app_dir
}

backup_helper() {
  if [ "$IS_REFRESH" -eq 0 ] || [ -n "$HELPER_BACKUP" ]; then
    return
  fi

  HELPER_BACKUP=$COMPASS_HOME/.compass-helper-previous.$$
  rm -f "$HELPER_BACKUP"
  if [ -e "$HELPER_FILE" ]; then
    cp -p "$HELPER_FILE" "$HELPER_BACKUP" \
      || fail "Could not back up existing helper command: $HELPER_FILE."
  fi
}

copy_helper() {
  backup_helper
  cp "$APP_DIR/self-host/compass" "$HELPER_FILE" \
    || fail "Could not install helper command at $HELPER_FILE."
  chmod +x "$HELPER_FILE" || fail "Could not make $HELPER_FILE executable."
}

backup_marker() {
  if [ "$IS_REFRESH" -eq 0 ] || [ -n "$MARKER_BACKUP" ]; then
    return
  fi

  MARKER_BACKUP=$COMPASS_HOME/.compass-marker-previous.$$
  rm -f "$MARKER_BACKUP"
  if [ -e "$MARKER_FILE" ]; then
    cp -p "$MARKER_FILE" "$MARKER_BACKUP" \
      || fail "Could not back up existing marker file: $MARKER_FILE."
  fi
}

write_marker() {
  backup_marker
  if ! cat > "$MARKER_FILE" <<EOF
Compass self-host install
COMPASS_HOME=$COMPASS_HOME
COMPASS_REPO_URL=$COMPASS_REPO_URL
COMPASS_REF=$COMPASS_REF
EOF
  then
    fail "Could not write marker file: $MARKER_FILE."
  fi
}

save_shell_ref_to_env() {
  if [ "$COMPASS_REF_FROM_SHELL" -ne 1 ] || [ ! -f "$ENV_FILE" ]; then
    return
  fi

  TMP_ENV=$COMPASS_HOME/.env.$$
  found=0

  while IFS= read -r line || [ -n "$line" ]; do
    case $line in
      COMPASS_REF=*)
        printf 'COMPASS_REF=%s\n' "$COMPASS_REF"
        found=1
        ;;
      *)
        printf '%s\n' "$line"
        ;;
    esac
  done < "$ENV_FILE" > "$TMP_ENV" || fail "Could not update $ENV_FILE with COMPASS_REF."

  if [ "$found" -eq 0 ]; then
    printf 'COMPASS_REF=%s\n' "$COMPASS_REF" >> "$TMP_ENV" \
      || fail "Could not update $ENV_FILE with COMPASS_REF."
  fi

  chmod 600 "$TMP_ENV" || fail "Could not secure temporary env file."
  mv "$TMP_ENV" "$ENV_FILE" || fail "Could not update $ENV_FILE with COMPASS_REF."
  TMP_ENV=
}

compose_base() {
  docker compose --project-name "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

start_stack() {
  info "Building and starting Compass. This can take a few minutes the first time."
  if [ "$IS_REFRESH" -eq 1 ]; then
    REFRESH_STACK_TOUCHED=1
  else
    FRESH_STACK_TOUCHED=1
  fi

  compose_base up -d --build || fail "Docker Compose failed. Compass was not started."
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
  Google auth and Google Calendar sync are not configured by the local installer.
  This install is using temporary placeholder Google OAuth values.
  To try Google sign-in or Google connect flows with your own OAuth app, edit:
  $ENV_FILE
  Then rebuild Compass because Google client values are included in the web app build:
  $HELPER_FILE rebuild
  Ongoing Google Calendar watch notifications also require an HTTPS/public backend URL setup outside this local-only installer path.
EOF
  else
    cat <<EOF
  Custom Google OAuth values are present in:
  $ENV_FILE
  The installer does not verify them. If you change Google or client URL values, run:
  $HELPER_FILE rebuild
  Ongoing Google Calendar watch notifications require an HTTPS/public backend URL setup outside this local-only installer path.
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
  ./compass stop
EOF

  if [ "$INSTALL_SOURCE" = git ]; then
    printf '  ./compass update\n'
  else
    cat <<EOF

Update:
  This archive install cannot use the helper update command. Rerun the installer to update Compass.
EOF
  fi

  cat <<EOF
Data volumes:
  ${PROJECT_NAME}_compass_mongo_data
  ${PROJECT_NAME}_compass_supertokens_postgres_data

The installer never deletes Docker volumes or user data.
EOF
}

check_install_dir
require_prerequisites
load_runtime_config
if [ "$IS_REFRESH" -eq 0 ]; then
  check_required_ports
  check_fresh_install_volumes
else
  info "Refreshing an existing Compass install; Docker Compose will reuse configured ports $WEB_PORT_VALUE and $PORT_VALUE."
fi
download_app
prepare_install_dir
write_env_if_missing
load_runtime_config

if [ "$IS_REFRESH" -eq 1 ]; then
  COMPOSE_FILE=$TMP_APP/self-host/docker-compose.yml
  start_stack
  if wait_for_health; then
    install_staged_app
    COMPOSE_FILE=$APP_DIR/self-host/docker-compose.yml
    copy_helper
    write_marker
    save_shell_ref_to_env
    finish_file_replacement
    INSTALL_COMPLETE=1
    open_browser
    print_success
  else
    print_recent_logs
    fail "Compass started, but $HEALTH_URL did not become healthy."
  fi
else
  install_staged_app
  load_runtime_config
  copy_helper
  write_marker
  start_stack
  if wait_for_health; then
    save_shell_ref_to_env
    finish_file_replacement
    INSTALL_COMPLETE=1
    open_browser
    print_success
  else
    print_recent_logs
    fail "Compass started, but $HEALTH_URL did not become healthy."
  fi
fi
