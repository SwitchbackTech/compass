# Self-Hosting Compass

Run Compass on your own computer with Docker Desktop, so your calendar data stays on your machine.

This guide has two paths:

- **Installer (recommended):** one command sets everything up in `~/compass`.
- **Manual setup (fallback):** run the pieces yourself if the installer does not fit your needs.

The installer is for **local use only** — it runs Compass on your own computer, not on a server that other people on the internet can reach. For server deployments, see [Running On A Server](#running-on-a-server).

In this guide, `~/compass` means a folder named `compass` in your home directory, for example `/Users/alex/compass` on macOS or `/home/alex/compass` on Linux. The installer creates this folder for you.

## Before You Start

You need:

- A Mac or Linux machine.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running. Docker is what runs Compass and its database. If Docker Desktop is not running, the installer will not work.

No account, key, or Google setup is required to get Compass running locally.

## Quick Install

Once Docker Desktop is running, open a terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

The installer will:

1. Create a folder at `~/compass` for your install.
2. Download the Compass code into `~/compass/app`.
3. Write a configuration file at `~/compass/.env` with sensible defaults.
4. Copy a helper script to `~/compass/compass` that you use to manage the install.
5. Start Compass with Docker Compose and wait until it is ready.
6. Try to open Compass in your browser.

When it finishes, Compass is available at:

- Web app: [http://localhost:9080](http://localhost:9080)
- Backend API: [http://localhost:3000/api](http://localhost:3000/api)

If your browser does not open automatically, open [http://localhost:9080](http://localhost:9080) manually.

The installer does not collect telemetry and does not call Compass-owned services after installation. It fetches code from GitHub to install or update Compass.

### Prefer To Read The Script First?

If you want to inspect the installer before running it:

```bash
curl -fsSLO https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh
less install.sh
sh install.sh
```

## Managing Your Install

After install, you manage Compass from the `~/compass` folder using the `./compass` helper:

```bash
cd ~/compass
./compass status
```

Available commands:

| Command              | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `./compass start`    | Start Compass.                                                               |
| `./compass stop`     | Stop Compass. Your data is not deleted.                                      |
| `./compass restart`  | Stop and start Compass.                                                      |
| `./compass status`   | Show whether Compass is running.                                             |
| `./compass logs`     | Show recent logs from the running containers.                                |
| `./compass rebuild`  | Rebuild the app (needed after certain config changes — see below).           |
| `./compass update`   | Pull the latest Compass code and rebuild.                                    |
| `./compass open`     | Open Compass in your browser.                                                |

### When To Use `rebuild`

A few settings become part of the web app when it is built, so editing them in `~/compass/.env` has no effect until you rebuild. This includes:

- Google OAuth client values (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- `FRONTEND_URL`
- `BASEURL`

After editing any of these, run:

```bash
cd ~/compass
./compass rebuild
```

### When To Use `update`

`./compass update` pulls the latest Compass code and rebuilds the app. It only works if the installer cloned Compass with Git.

If the installer fell back to downloading an archive because `git` was not available on your machine, `./compass update` cannot update you. Install Git, download the installer script, and run `sh install.sh` from your terminal to refresh Compass.

Stopping Compass does not delete your data. Neither does `update` or `rebuild`.

## What The Installer Runs

The installer uses Docker Compose to run a small set of containers:

| Container        | Where it is reachable                                            | What it is for                                   |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Web app          | `http://localhost:9080`                                          | The Compass UI in your browser.                  |
| Backend API      | `http://localhost:3000/api`                                      | Compass's server.                                |
| MongoDB          | Internal Docker network only                                     | Stores signed-in Compass events and user profile data. |
| SuperTokens Core | Internal Docker network only                                     | Handles signup, login, and sessions.             |
| Postgres         | Internal Docker network only                                     | Durable storage used by SuperTokens.             |

Only the web app and backend are reachable from your browser, and only at `localhost` on your own machine. MongoDB, SuperTokens Core, and Postgres stay on an internal Docker network; nothing outside the Compass containers can connect to them.

### Google Calendar Sync

Google auth and Google Calendar sync are **not** configured by the local installer. Because the backend currently requires Google environment variables to start, the installer writes placeholder values so Compass can boot.

You can add your own Google OAuth client values to `~/compass/.env` and run `./compass rebuild` to try Google sign-in and the Google Calendar connect flow. However, keeping Compass continuously in sync with Google Calendar, so new or changed Google events appear automatically, requires an HTTPS backend that is reachable from the public internet. The local installer does not set that up. For that, see [Running On A Server](#running-on-a-server).

## Where Your Data Lives

Compass stores data in a few different places. What ends up where depends on whether you are signed in.

**Before you sign up:** events and tasks are kept in your browser's local storage (IndexedDB). No data is written to MongoDB until you sign up.

**After you sign up:**

- SuperTokens creates your auth account (stored in Postgres).
- Events you had in the browser are copied into MongoDB.
- From then on, event changes go through the backend and are saved in MongoDB.
- Tasks still live in your browser. There is no backend task storage yet.

### Files On Disk

- `~/compass` — your install folder. Contains the helper command, config, and app files.
- `~/compass/.env` — local configuration and generated secrets.
- `~/compass/compass` — the helper script you run as `./compass ...`.
- `~/compass/app` — the Compass source code used to build the containers.

### Docker Volumes

Inside Docker, Compass stores its data in volumes managed by Docker itself. With the default project name, these volumes are called:

- `compass_compass_mongo_data` — MongoDB data (Compass accounts' calendar data).
- `compass_compass_supertokens_postgres_data` — Postgres data (SuperTokens auth).

If you set `COMPOSE_PROJECT_NAME` to something else, the volume names will change to match.

Stopping Compass does **not** delete these volumes. To back up your account data, back up these Docker volumes. Browser-only tasks do not have a backup or export path today.

For more on how data flows in each mode, see [Hosting Modes](./development/hosting-modes.md).

## Manual Setup

Use manual setup only if you want to run the services yourself or customize things the installer does not cover.

### What Manual Setup Needs

Compass is a web app and a backend API. In manual setup, you provide the runtime pieces the backend expects.

**You provide:**

- A machine you can run services on. Your laptop is fine for personal use.
- [Bun](https://bun.sh) to install dependencies and run the backend and web app.
- Node.js 24+ if you plan to make a production build. You can skip this while running in dev mode.
- A **MongoDB** instance for signed-in event data.
- A **SuperTokens** setup for signup, login, and sessions. Managed SuperTokens is an option. If you self-host SuperTokens Core, connect it to Postgres for durable auth storage. (The installer handles this Postgres dependency for you; manual setup does not.)

**Optional:**

- A **Google Cloud project**, only if you want Google auth or to connect Google Calendar.

The backend currently requires Google environment variables to start, even if you do not plan to use Google. Either provide real credentials from a Google Cloud project, or use placeholder strings until you set one up. Ongoing Google Calendar watch notifications need an HTTPS, publicly reachable backend, which manual local setup does not provide.

### Manual Steps

1. **Get the code.**

   ```bash
   git clone https://github.com/SwitchbackTech/compass.git
   cd compass
   ```

2. **Install dependencies.**

   ```bash
   bun install
   ```

3. **Create your backend env file and edit it.**

   ```bash
   cp packages/backend/.env.local.example packages/backend/.env.local
   ```

   Open `packages/backend/.env.local` and fill in:

   - `MONGO_URI` for your MongoDB.
   - SuperTokens values for your managed SuperTokens instance or self-hosted Core. If you self-host Core, connect it to Postgres.
   - Google credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Use real credentials if you have a Google Cloud project, or placeholders until you do.

   For the full list and what each variable does, see [Local Development](./development/local-development.md).

4. **Start the backend.**

   ```bash
   bun run dev:backend
   ```

   The backend listens on `http://localhost:3000` and exposes its API under `/api`.

5. **Start the web app** in another terminal.

   ```bash
   bun run dev:web
   ```

6. **Open Compass** at [http://localhost:9080](http://localhost:9080).

You can check the backend with:

```bash
curl http://localhost:3000/api/health
```

A `200` response means the backend is running and can reach MongoDB.

### Customizing After Setup

- **Point at a different MongoDB** by updating `MONGO_URI`.
- **Use a different SuperTokens instance** by updating the SuperTokens values in your env file.
- **Use Google OAuth locally** by creating a Google Cloud project, adding real credentials to your env file, and restarting the backend. Ongoing Google Calendar watch notifications also need an HTTPS, publicly reachable backend.

### Running On A Server

The local installer does not handle server deployments. For a server, run the same basic pieces yourself: a backend process, a built web app, MongoDB, and either managed SuperTokens or self-hosted SuperTokens Core. If you self-host SuperTokens Core, run Postgres for its auth storage. The web app and backend need public URLs; MongoDB, SuperTokens Core, and Postgres only need to be reachable from the backend or each other.

Here's what differs from a laptop setup:

- **A domain and public URLs.** Your web app and backend API need to be reachable from your users' browsers. Point a domain or subdomains at your server so you have stable URLs.
- **HTTPS.** Required in practice, especially if you want Google Calendar sync. Google OAuth only accepts HTTPS redirect URLs, except for `localhost`. A reverse proxy like Caddy, nginx, or Cloudflare is the common pattern.
- **Public URLs in your env file.** Update `FRONTEND_URL`, `BASEURL`, and `CORS` to match your real public URLs. `BASEURL` is baked into the web app at build time, so rebuild the web app after changing it.
- **Build the web app for production.** In dev mode (`bun run dev:web`) the web app is served live. For a server, build it once from the repo root with `bun run build:web` and serve the built files through your reverse proxy or any static web server.
- **Keep the backend process running.** `bun run dev:backend` is fine for a laptop but is not meant for long-running use. On a server, run the backend under systemd, a container, pm2, or another process manager.
- **Google Cloud configuration.** If you configure Google Calendar sync, set up your Google Cloud project with your public web origin and backend HTTPS URL so Google can reach the backend for watch notifications.
- **Backend-only data services.** MongoDB, SuperTokens Core, and Postgres should not be exposed to the public internet unless you intentionally secure that access.

#### Server Deployment Checklist

1. Choose the public URLs you want for the web app and backend API.
2. Set `FRONTEND_URL`, `BASEURL`, and `CORS` in `packages/backend/.env.local` to match those URLs.
3. Build the web app from the repo root with `bun run build:web`.
4. Run the backend under a process manager so it restarts on crashes and reboots.
5. Put a reverse proxy in front of the web app and backend, and terminate HTTPS there.
6. Verify `/api/health` returns `200` when hit through your public backend URL.
7. Create an account through your public web URL to confirm signup end-to-end.
8. Optional: configure your Google Cloud project, then connect Google Calendar from inside Compass.

See [Local Development](./development/local-development.md) for the full list of environment variables the backend and web build expect.

## Next Steps

- **Back up account data** by backing up the Docker volumes above (or your manually managed MongoDB/Postgres storage).
- **Try Google auth/connect flows locally** by adding your own Google OAuth credentials to `~/compass/.env`, then running `./compass rebuild`.
- **Deploy on a server** by following the [Server Deployment Checklist](#server-deployment-checklist).

If something is not working or you want to dig deeper:

- [Self-host runtime README](../self-host/README.md) — quick troubleshooting for the local installer, helper commands, Docker volumes, and `.env` issues.
- [Local Development](./development/local-development.md) — full environment variable reference and troubleshooting tips.
- [Hosting Modes](./development/hosting-modes.md) — how data flows in each mode.
