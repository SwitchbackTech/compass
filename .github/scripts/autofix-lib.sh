#!/usr/bin/env bash
# Shared helpers for the error-autofix scripts. Source, don't execute:
#   SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
#   source "$SCRIPT_DIR/autofix-lib.sh"
REPO=${GH_REPO:-$GITHUB_REPOSITORY}
AUTOFIX_SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

notify() {
  "$AUTOFIX_SCRIPT_DIR/discord-notify.sh" "$1" || true
}
