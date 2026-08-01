#!/bin/sh

# Shared config parsing for every self-host entry point. Keep this POSIX-only:
# install.sh is commonly piped to `sh`, while install-manual.sh also runs under
# Bash. Callers set CONFIG_FILE before sourcing it.

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

read_config_value() {
  path=$1

  [ -f "$CONFIG_FILE" ] || return 0

  awk -v path="$path" '
    BEGIN { count = split(path, parts, ".") }
    /^[[:space:]]*#/ || /^[[:space:]]*$/ { next }
    {
      line = $0
      sub(/[[:space:]]+#.*/, "", line)
      indent = match(line, /[^ ]/) - 1
      level = int(indent / 2) + 1
      key = line
      sub(/:.*/, "", key)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", key)
      value = line
      sub(/^[^:]+:[[:space:]]*/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      gsub(/^'\''|'\''$/, "", value)
      stack[level] = key
      for (i = level + 1; i <= 8; i++) stack[i] = ""
      if (level != count || key != parts[count] || value == "") next
      for (i = 1; i < count; i++) {
        if (stack[i] != parts[i]) next
      }
      print value
    }
  ' "$CONFIG_FILE" | tail -n 1
}

# The profiles this install actually needs, read from its own config. An
# explicit COMPOSE_PROFILES still wins in the caller's environment.
default_profiles() {
  profiles=

  mongo_uri=$(strip_quotes "$(read_config_value mongo.uri)")
  case "$mongo_uri" in
    "" | *//mongo:* | *@mongo:*) profiles=selfhosted ;;
  esac

  if [ -n "$(strip_quotes "$(read_config_value sync.mongoUri)")" ]; then
    profiles="${profiles:+$profiles,}sync"
  fi

  printf '%s\n' "$profiles"
}
