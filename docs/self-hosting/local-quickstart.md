# Run Compass on your computer

This is the recommended self-host path for one person running Compass on their own computer.

## What to expect

About 5 to 10 minutes, mostly waiting for Docker to download images. The installer creates a single folder at `~/compass`, generates secrets, and starts a Docker Compose stack. Outside Docker, the installer only creates `~/compass`. Docker will also create the containers, images, network, and volumes Compass needs to run.

When it finishes, you'll have:

- the Compass web app at [http://localhost:9080](http://localhost:9080)
- the Compass API at [http://localhost:3000/api](http://localhost:3000/api)
- five Docker containers running locally (web, backend, Mongo, SuperTokens, Postgres)
- a `~/compass` folder with your `.env`, the `./compass` helper script, and the app source

The install is reversible. To uninstall, stop the stack, delete the Docker volumes, and delete `~/compass`.

## Before you start

You need:

- a Mac or Linux machine
- Docker Desktop or Docker Engine with Docker Compose, **running**
- a terminal
- internet access to pull Compass from GitHub

## Install

Run the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

If you'd rather inspect it first:

```bash
curl -fsSLO https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh
less install.sh
sh install.sh
```

The installer:

1. creates `~/compass`
2. downloads the Compass app into `~/compass/app`
3. writes `~/compass/.env` with local defaults and generated secrets
4. copies the helper command to `~/compass/compass`
5. builds and starts Compass with Docker Compose
6. waits for the backend health check
7. tries to open Compass in your browser

When it's done, open [http://localhost:9080](http://localhost:9080).

If you want to confirm the backend is up:

```bash
curl http://localhost:3000/api/health
```

## What runs

| Service | Reachable from your computer? | Purpose |
| --- | --- | --- |
| web | Yes, `http://localhost:9080` | Compass in your browser |
| backend | Yes, `http://localhost:3000/api` | Compass API |
| mongo | No, Docker network only | Signed-in event data |
| supertokens | No, Docker network only | Signup, login, sessions |
| supertokens-db | No, Docker network only | SuperTokens Postgres data |

The compose file binds the web and backend ports to `127.0.0.1`. This path is for the same computer only.

## Sign in without Google

Google is optional. The installer writes placeholder Google OAuth values so Compass can start without a Google Cloud project, and Compass treats those placeholders as "not configured" — Google sign-in and connect actions stay hidden.

Use email and password. After signup, your events live in the Mongo Docker volume. Tasks live in your browser's IndexedDB.

If you want to add Google later, see [Google Calendar](./google-calendar.md).

## Manage Compass

Run helper commands from `~/compass`:

```bash
cd ~/compass
./compass status
```

| Command | What it does |
| --- | --- |
| `./compass start` | Start Compass. |
| `./compass stop` | Stop Compass without deleting data. |
| `./compass restart` | Stop and start Compass. |
| `./compass rebuild` | Rebuild images, then start Compass. |
| `./compass logs` | Follow container logs. |
| `./compass status` | Show container status. |
| `./compass update` | Pull newer Compass code, rebuild, and restart. |
| `./compass open` | Open Compass in your browser. |

`./compass logs` is usually the fastest way to find out why something isn't behaving.

## Day-to-day lifecycle

**Do I need to leave my computer on?** Yes. Compass runs locally. If your machine sleeps or shuts down, Compass pauses or stops with it. When your machine wakes up, Docker may bring the containers back. If Compass is not running, use `./compass start`.

**Does Compass start when I reboot?** Only if Docker is set to start at login (the default for Docker Desktop) and Docker has restarted the containers. If not, run `./compass start`.

**Where is my data?** Events are in the Mongo Docker volume (`compass_compass_mongo_data`). Auth is in the Postgres volume (`compass_compass_supertokens_postgres_data`). Tasks are in your browser's IndexedDB.

**How do I update?** Back up first (see below), then `./compass update`. There's no rollback.

**How do I uninstall?** `./compass stop`, then `docker volume rm compass_compass_mongo_data compass_compass_supertokens_postgres_data`, then `rm -rf ~/compass`. This wipes your data. Make a backup first if you want to keep it.

## Before updating

`./compass update` rebuilds Compass with newer code. It is not a rollback tool, and it does not back up your data. Back up `~/compass/.env`, the Mongo volume, and the SuperTokens Postgres volume **together** before you run it. See [Backups and restore](./backups-and-restore.md).

The `.env` warning matters: see [Keep `.env` with your data](./README.md#keep-env-with-your-data) if you haven't already.

## Troubleshooting

### Docker is not running

Start Docker, wait until it reports ready, then rerun the installer or helper command.

### Port `9080` or `3000` is already in use

Compass needs `9080` for the web app and `3000` for the backend API. Stop the other process using that port, then rerun the installer.

### Compass is already installed

Use the installed helper, not the repo template:

```bash
cd ~/compass
./compass status
./compass restart
```

There are two `compass` helper scripts. `self-host/compass` in this repo is the template the installer copies. `~/compass/compass` is the one you run day to day. Don't run the repo copy directly.

### Docker volumes exist but `~/compass/.env` is missing

The installer stops in this case to protect old data. A fresh `.env` would have new generated credentials that don't match the old volumes.

Choose one path:

- restore the matching `~/compass/.env`, then rerun the installer
- start a separate install with a different `COMPASS_HOME` and `COMPOSE_PROJECT_NAME`
- delete the old Docker volumes only after confirming you don't need them

Example separate install:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | env COMPASS_HOME="$HOME/compass-new" COMPOSE_PROJECT_NAME=compass_new sh
```

### `./compass update` does not work

`./compass update` only works when the installer used Git to download Compass. If Git wasn't available at install time, the installer fell back to a downloaded archive. Install Git, download the installer, and run `sh install.sh` again to refresh.

### Changes to `~/compass/.env` aren't showing up

Some values are baked into the web app at build time. After changing any of these, run `./compass rebuild` (a plain `./compass restart` won't pick them up):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FRONTEND_URL`
- `BASEURL`

### Compass starts but the browser doesn't open

Open [http://localhost:9080](http://localhost:9080) yourself, or run:

```bash
cd ~/compass
./compass open
```

### Google sign-in or Google Calendar doesn't work locally

Expected on the default install. The placeholder OAuth values are treated as "not configured." See [Google Calendar](./google-calendar.md) for how to add real credentials and what limits the local install has.

## What to read next

Before your first update, read [Backups and restore](./backups-and-restore.md). If you want Google later, read [Google Calendar](./google-calendar.md).
