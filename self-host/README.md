# Compass Self-Host Runtime

## What This Folder Is

This folder contains the files used by the local Compass self-host installer.

If you are installing Compass for the first time, start with the full guide in
[Self-Hosting Compass](../docs/self-hosting.md). This README is the quick
reference for the installer files in this folder and the place to start when a
local install gets confusing.

In this README, `~/compass` means a `compass` folder in your home folder, such
as `/Users/alex/compass` on macOS or `/home/alex/compass` on Linux. It is not a
folder inside this repo.

## Install Compass

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) first
and make sure it is running. Docker is what runs Compass and its local
databases.

Then run:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

The installer creates `~/compass`, writes `~/compass/.env`, copies the helper
script to `~/compass/compass`, starts Compass, and tries to open the app in your
browser.

When the install finishes, Compass should be available at:

- Web app: http://localhost:9080
- Backend API: http://localhost:3000/api

## Manage Compass After Install

After install, use the helper script from the installed folder:

```bash
cd ~/compass
./compass status
```

Common commands:

```bash
./compass start     # start Compass
./compass stop      # stop Compass without deleting data
./compass restart   # stop then start
./compass rebuild   # rebuild images, then start
./compass logs      # follow container logs
./compass status    # show container status
./compass update    # pull the latest Compass, then rebuild
./compass open      # open Compass in your browser
```

Use `./compass logs` when something starts but does not behave correctly. It is
usually the fastest way to see what Docker is unhappy about.

## Troubleshooting

### Docker is not running

Start Docker Desktop, wait until it says Docker is running, then rerun the
installer or helper command.

### Port `9080` or `3000` is already in use

Compass uses `9080` for the web app and `3000` for the backend API. If another
app is already using one of those ports, stop that app and rerun the installer.

### Compass is already installed

If `~/compass` already exists, use the installed helper instead of running the
repo copy:

```bash
cd ~/compass
./compass status
./compass restart
```

There are two `compass` helper scripts:

- `self-host/compass` in this repo is a template.
- `~/compass/compass` is the installed helper you should run day to day.

Do not run `self-host/compass` directly from the repo.

### Docker volumes exist but `~/compass/.env` is missing

Docker volumes can remain on your machine even after `~/compass` is deleted.
Those volumes may contain old Compass data.

If the installer finds those volumes but cannot find `~/compass/.env`, it stops
before creating a new install. This protects you from creating new database
passwords that could lock you out of the old data.

Choose one path:

- Keep the old data: restore the matching `~/compass/.env`, then rerun the
  installer.
- Start a separate fresh install: use a different `COMPASS_HOME` and
  `COMPOSE_PROJECT_NAME`.
- Start over completely: remove the old Docker volumes yourself after confirming
  you do not need that data.

Example second install:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | env COMPASS_HOME="$HOME/compass-new" COMPOSE_PROJECT_NAME=compass_new sh
```

### `./compass update` does not work

`./compass update` only works when the installer used Git to download Compass.

If Git was not available during install, the installer used a downloaded archive
instead. In that case, install Git, download the installer script, and run
`sh install.sh` from your terminal to refresh Compass.

### Changes to `~/compass/.env` are not showing up

Some settings are baked into the web app when it is built. After changing any of
these values, run `./compass rebuild`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`
- `BASEURL`

A plain `./compass restart` is not enough for those values.

### Compass starts but the browser does not open

Open http://localhost:9080 manually. You can also run:

```bash
cd ~/compass
./compass open
```

### Google login or Google Calendar sync does not work locally

The local installer writes placeholder Google OAuth values so Compass can start
without a Google Cloud setup. See
[Google Calendar Limitations](#google-calendar-limitations) for what works
locally and what needs a public server.

## Where Your Data Lives

Compass data can live in a few places:

- MongoDB stores signed-in Compass event data.
- Postgres stores SuperTokens auth data, such as accounts and sessions.
- Browser-only task data lives in your browser and is not stored in Docker
  volumes.

By default, Docker creates these volumes:

- `compass_compass_mongo_data`
- `compass_compass_supertokens_postgres_data`

These names change if you set `COMPOSE_PROJECT_NAME` to something other than the
default.

Stopping Compass does not delete these volumes. Your data stays on disk until
you remove the volumes yourself.

## Google Calendar Limitations

Google auth and Google Calendar sync are not fully configured by the local
installer. The installer writes placeholder Google OAuth values so Compass can
start without a Google Cloud setup.

You can add your own Google OAuth values to `~/compass/.env` and run
`./compass rebuild` to try Google sign-in or the Google Calendar connect flow.
Continuous Google Calendar sync needs an HTTPS backend that Google can reach
from the public internet. The local installer does not set that up.

For the server setup, see [Self-Hosting Compass](../docs/self-hosting.md).

## Ports and Services

The stack runs with Docker Compose. Only the web app and backend API are exposed
on your machine:

- Web app: http://localhost:9080
- Backend API: http://localhost:3000/api

MongoDB, SuperTokens Core, and Postgres run inside Docker and are not exposed on
localhost.

## Files In This Folder

- `install.sh` is the installer. It sets up `~/compass`, writes
  `~/compass/.env`, copies the helper script, and places app files under
  `~/compass/app`.
- `compass` is the helper script template. The installer copies it to
  `~/compass/compass`.
- `docker-compose.yml` is the Docker Compose stack used by the installed app.
- `Dockerfile.web`, `Dockerfile.backend`, and `Dockerfile.mongo` build the web,
  backend, and local MongoDB images.
- `serve-web.ts` is the small web server that serves the built web app inside
  the web container.
- `.env.example` shows example environment values that mirror what the
  installer writes to `~/compass/.env`.
