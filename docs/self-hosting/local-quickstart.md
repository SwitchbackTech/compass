# Local Quickstart

This is the recommended self-host path for one person running Compass on their own computer.

It is local-only Docker self-hosting. It does not publish Compass to the internet and it does not require Google Calendar.

## Before You Start

You need:

- a Mac or Linux machine
- Docker Desktop or Docker Engine with Docker Compose
- a terminal
- internet access to download Compass from GitHub

Make sure Docker is running before you start.

## Install

Run:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

If you want to inspect the installer first:

```bash
curl -fsSLO https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh
less install.sh
sh install.sh
```

The installer will:

1. create `~/compass`
2. download the Compass app into `~/compass/app`
3. write `~/compass/.env` with local defaults and generated secrets
4. copy the helper command to `~/compass/compass`
5. build and start Compass with Docker Compose
6. wait for the backend health check
7. try to open Compass in your browser

When it finishes, open:

- Web app: [http://localhost:9080](http://localhost:9080)
- Backend API: [http://localhost:3000/api](http://localhost:3000/api)

The backend health check is:

```bash
curl http://localhost:3000/api/health
```

## What Runs

The Docker Compose stack runs:

| Service | Reachable from your computer? | Purpose |
| --- | --- | --- |
| web | Yes, `http://localhost:9080` | Compass in your browser |
| backend | Yes, `http://localhost:3000/api` | Compass API |
| mongo | No, Docker network only | Signed-in Compass event data |
| supertokens | No, Docker network only | Signup, login, and sessions |
| supertokens-db | No, Docker network only | SuperTokens Postgres data |

The compose file binds the web and backend ports to `127.0.0.1`, so this path is for local use on the same computer.

## Sign In Without Google

Google is optional.

The local installer writes placeholder Google OAuth values so Compass can start without a Google Cloud setup. Use email/password signup for the normal local self-host path.

After signup, event data is stored in the Mongo Docker volume. Tasks still live in your browser's IndexedDB.

## Manage Compass

Run helper commands from `~/compass`:

```bash
cd ~/compass
./compass status
```

Commands:

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

## Keep `~/compass/.env`

Do not delete `~/compass/.env` unless you are intentionally starting over.

It contains generated database passwords and tokens that match the existing Docker volumes. If the volumes remain but the `.env` file is gone, a new install can create different credentials and fail to read the old data.

Before `./compass update`, follow [Backups And Restore](./backups-and-restore.md).

`./compass update` is not a rollback tool.

## Common Problems

### Docker Is Not Running

Start Docker, wait until it is ready, then rerun the installer or helper command.

### Port `9080` Or `3000` Is Already In Use

Compass needs:

- `9080` for the web app
- `3000` for the backend API

Stop the other process using that port, then rerun the installer.

### Compass Is Already Installed

Use the installed helper:

```bash
cd ~/compass
./compass status
./compass restart
```

Do not run `self-host/compass` directly from the repo. That file is only the template copied into `~/compass`.

### Docker Volumes Exist But `~/compass/.env` Is Missing

The installer stops in this case to protect old data.

Choose one path:

- restore the matching `~/compass/.env`, then rerun the installer
- start a separate install with a different `COMPASS_HOME` and `COMPOSE_PROJECT_NAME`
- delete the old Docker volumes only after confirming you do not need them

Example separate install:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | env COMPASS_HOME="$HOME/compass-new" COMPOSE_PROJECT_NAME=compass_new sh
```

### Google Does Not Appear

That is expected in the default local install. Google Calendar is an optional add-on. See [Google Calendar](./google-calendar.md).

## What This Path Does Not Do

The local installer does not set up:

- a public server
- HTTPS certificates
- a reverse proxy
- automatic backups
- restore automation
- update rollback
- continuous Google Calendar watch notifications
