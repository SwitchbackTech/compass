# Compass Self-Host Runtime

This folder contains the files used by the Compass self-host installer.

If you're installing Compass for the first time, start with [Self-Hosting Compass](../docs/self-hosting/README.md).

This README is a quick reference for what each file in this folder does. For install steps, backups, Google Calendar, and server hosting, see the docs above.

## Install Compass

For install steps, start with [Run Compass on a server](../docs/self-hosting/server-guide.md).
The compose stack binds the web and backend containers to `127.0.0.1`; the server guide puts Caddy in front so users reach Compass through your HTTPS domain.

## Common places to go

- First install: [Run Compass on a server](../docs/self-hosting/server-guide.md)
- Back up before updating: [Backups and restore](../docs/self-hosting/backup-and-restore.md)
- Missing `compass.yaml` with old Docker volumes: [Backups and restore](../docs/self-hosting/backup-and-restore.md#if-compassyaml-is-missing-but-old-volumes-exist)
- Google setup or no-Google mode: [Google Calendar](../docs/self-hosting/google-calendar.md)
- Config key reference: [Configuration](../docs/Config/README.md)

## Files in this folder

- `install.sh` — the installer. Sets up `~/compass`, writes `~/compass/compass.yaml`, and copies the helper scripts.
- `compass` — the helper script template. The installer copies it to `~/compass/compass`. Don't run this copy directly; run `~/compass/compass` after install.
- `config.sh` — shared POSIX helper sourced by `install.sh`, `install-manual.sh`, and `compass`. Parses `compass.yaml` and derives default `COMPOSE_PROFILES` (`selfhosted` when `mongo.uri` points at the bundled `mongo` service; `sync` when `sync.mongoUri` is set). An explicit `COMPOSE_PROFILES` in the environment still wins.
- `compose.yaml` — the Docker Compose stack used by the installed app.
- `compose.selfhosted.yaml` — overlay applied when `COMPOSE_PROFILES` includes `selfhosted` (waits for healthy bundled Mongo before starting backend).
- `Dockerfile.web`, `Dockerfile.backend`, `Dockerfile.mongo`, `Dockerfile.sync` — the images for the web app, backend, local MongoDB, and Sync service.
- `serve-web.ts` — the small web server that serves the built web app inside the web container.
- `compass.example.yaml` — example self-host config values. See [Configuration](../docs/Config/README.md) for the full reference.

In this folder and the docs, `~/compass` means a `compass` folder in your home directory (e.g., `/Users/alex/compass` on macOS, `/home/alex/compass` on Linux). It is not a folder inside this repo.
