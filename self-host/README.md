# Compass Self-Host Runtime

This folder contains the files used by the Compass self-host installer.

If you're installing Compass for the first time, start with [Self-Hosting Compass](../docs/self-hosting/README.md).

This README is a quick reference for what each file in this folder does. For install steps, backups, Google Calendar, and server hosting, see the docs above.

## Install Compass

For install steps, start with [Run Compass on a server](../docs/self-hosting/server-guide.md).
The compose stack binds the web and backend containers to `127.0.0.1`; the server guide puts Caddy in front so users reach Compass through your HTTPS domain.

## Common places to go

- First install: [Run Compass on a server](../docs/self-hosting/server-guide.md)
- Back up before updating: [Backups and restore](../docs/self-hosting/backups-and-restore.md)
- Missing `.env` with old Docker volumes: [Backups and restore](../docs/self-hosting/backups-and-restore.md#if-env-is-missing-but-old-volumes-exist)
- Google setup or no-Google mode: [Google Calendar](../docs/self-hosting/google-calendar.md)
- Manual Bun setup: [Run Compass without the installer](../docs/self-hosting/advanced-manual.md)

## Files in this folder

- `install.sh` — the installer. Sets up `~/compass`, writes `~/compass/.env`, copies the helper script, and places app files under `~/compass/app`.
- `compass` — the helper script template. The installer copies it to `~/compass/compass`. Don't run this copy directly; run `~/compass/compass` after install.
- `docker-compose.yml` — the Docker Compose stack used by the installed app.
- `Dockerfile.web`, `Dockerfile.backend`, `Dockerfile.mongo` — the images for the web app, backend, and local MongoDB.
- `serve-web.ts` — the small web server that serves the built web app inside the web container.
- `packages/backend/.env.local.example` (in the repo root) — example environment values. See [Environment Variables](../docs/self-hosting/environment-variables.md) for the full reference.

In this folder and the docs, `~/compass` means a `compass` folder in your home directory (e.g., `/Users/alex/compass` on macOS, `/home/alex/compass` on Linux). It is not a folder inside this repo.
