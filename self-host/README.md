# Compass Self-Host Runtime

This folder holds the files the local self-host installer uses to run Compass on your own machine with Docker Compose.

If you just want to install Compass, follow the full guide in [docs/self-hosting.md](../docs/self-hosting.md). This README is a short command reference for the files in this folder.

## What's in this folder

- `install.sh` — the installer. Sets up `~/compass`, writes `~/compass/.env`, copies the helper script, and places the app files under `~/compass/app`.
- `compass` — a template of the helper script. The installer copies this to `~/compass/compass`. Don't run it directly from the repo; run the installed copy in `~/compass`.
- `docker-compose.yml` — the Docker Compose stack used by the installed app.
- `Dockerfile.web`, `Dockerfile.backend` — images for the web and backend services.
- `serve-web.ts` — the tiny web server that serves the built web app inside the web container.
- `.env.example` — example environment values that mirror what the installer writes to `~/compass/.env`.

## Install

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) first and make sure it is running.

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

This creates `~/compass` and starts Compass there.

## After install: the helper script

Once the installer finishes, manage Compass using the helper that lives at `~/compass/compass`:

```bash
cd ~/compass
./compass start     # start the stack
./compass stop      # stop the stack (data is kept)
./compass restart   # stop then start
./compass rebuild   # rebuild images, then start
./compass logs      # tail container logs
./compass status    # show container status
./compass update    # pull the latest Compass (Git installs only)
./compass open      # open Compass in your browser
```

Run `./compass rebuild` after changing values in `~/compass/.env` that are baked into the web build, such as Google OAuth client values, `FRONTEND_URL`, or `BASEURL`. A plain `restart` is not enough for those.

`./compass update` only works for Git-based installs. If your install came from a downloaded archive (because `git` was not available at install time), rerun the installer from an interactive shell to refresh Compass.

## Repo helper vs installed helper

There are two copies of the `compass` helper script, and they are not the same thing:

- `self-host/compass` in this repo is a template. The installer copies it into `~/compass/compass`.
- `~/compass/compass` is the one you actually use day to day.

Don't run `self-host/compass` directly from the repo.

## Ports and services

The stack runs with Docker Compose. Only the web and backend are exposed on your machine:

- Web app: http://localhost:9080
- Backend API: http://localhost:3000/api

MongoDB, SuperTokens, and Postgres run inside Docker and are not exposed on localhost.

## Where your data lives

- **MongoDB** stores Compass app and event data.
- **Postgres** stores SuperTokens auth data (accounts, sessions).
- Browser-only task data lives in your browser and is not stored in Docker volumes.

By default the Docker volumes are named:

- `compass_compass_mongo_data`
- `compass_compass_supertokens_postgres_data`

These names change if you set `COMPOSE_PROJECT_NAME` to something other than the default.

Stopping Compass does not delete these volumes. Your data stays on disk until you remove the volumes yourself.

## Limitations

This local-only installer is not a full production setup. In particular, it does not configure Google Calendar watch notifications end to end, because ongoing Google watch callbacks require an HTTPS, publicly reachable backend. After adding your own Google OAuth values and running `./compass rebuild`, you can try Google sign-in or Google connect flows locally, but live push sync from Google Calendar needs the server setup described in [docs/self-hosting.md](../docs/self-hosting.md).
