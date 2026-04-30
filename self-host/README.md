# Compass Self-Host Runtime

This folder contains the files used by the local Compass self-host installer.

If you're installing Compass for the first time, **start with [Local quickstart](../docs/self-hosting/local-quickstart.md)**. The [Self-Hosting Compass](../docs/self-hosting/README.md) page helps you choose the right guide and explains what runs where.

This README is a quick reference for what each file in this folder does. For install steps, troubleshooting, backups, Google Calendar, and server hosting, see the docs above.

## Install Compass

For install steps, start with [Local quickstart](../docs/self-hosting/local-quickstart.md).
Compass will be available at `http://localhost:9080` (web) and
`http://localhost:3000/api` (backend). The compose stack binds those ports to
`127.0.0.1` and is not a public-server installer.

## Files in this folder

- `install.sh` — the installer. Sets up `~/compass`, writes `~/compass/.env`, copies the helper script, and places app files under `~/compass/app`.
- `compass` — the helper script template. The installer copies it to `~/compass/compass`. Don't run this copy directly; run `~/compass/compass` after install.
- `docker-compose.yml` — the Docker Compose stack used by the installed app.
- `Dockerfile.web`, `Dockerfile.backend`, `Dockerfile.mongo` — the images for the web app, backend, and local MongoDB.
- `serve-web.ts` — the small web server that serves the built web app inside the web container.
- `.env.example` — example environment values that mirror what the installer writes to `~/compass/.env`.

In this folder and the docs, `~/compass` means a `compass` folder in your home directory (e.g., `/Users/alex/compass` on macOS, `/home/alex/compass` on Linux). It is not a folder inside this repo.
