# Self-Hosting Compass

Run Compass locally with Docker Desktop and keep your Compass data on your own machine.

The recommended path is the one-command local installer. It installs Compass into `~/compass`, starts the app with Docker Compose, and exposes fixed local ports by default:

- Web app: [http://localhost:9080](http://localhost:9080)
- Backend API: [http://localhost:3000/api](http://localhost:3000/api)

The v1 installer is for local self-hosting only. For server deployments, use the guidance in [Running On A Server](#running-on-a-server).

## Quick Install

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and start it.
2. Run the installer:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
   ```

The installer creates `~/compass`, starts Compass, waits for the backend health check to pass, and tries to open Compass in your browser automatically. If your browser does not open, go to [http://localhost:9080](http://localhost:9080).

If you want to inspect the installer before running it:

```bash
curl -fsSLO https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh
less install.sh
sh install.sh
```

## After Install

Run local management commands from `~/compass`:

```bash
cd ~/compass
./compass status
./compass logs
./compass stop
./compass start
./compass update
```

`./compass update` works for Git-based installs. If Compass was installed from an archive because `git` was not available, rerun the installer from an interactive shell to refresh Compass.

The installer preserves `~/compass/.env` when you refresh an install. It also does not delete Docker volumes when Compass is stopped, refreshed, or updated.

## What The Installer Runs

The installer uses Docker Desktop / Docker Compose to run:

| Container        | Network access                                                   |
| ---------------- | ---------------------------------------------------------------- |
| Web app          | Exposed on `127.0.0.1:9080`                                      |
| Backend API      | Exposed on `127.0.0.1:3000`                                      |
| MongoDB          | Internal Docker network only                                     |
| SuperTokens Core | Internal Docker network only                                     |
| Postgres         | Internal Docker network only, used only for SuperTokens auth data |

MongoDB stores signed-in Compass events. SuperTokens handles accounts and sessions. Postgres is internal durable storage for SuperTokens auth data; you do not configure it directly when using the installer.

Google Calendar sync is not configured by the v1 installer. The installer writes temporary Google values because the backend currently requires Google environment variables to start. To enable Google sign-in or calendar sync later, edit `~/compass/.env` with your own Google OAuth values and restart Compass.

## Data And Config Locations

- `~/compass` stores the local install, helper command, and app source.
- `~/compass/.env` stores local configuration and generated secrets.
- `compass_compass_mongo_data` stores MongoDB data for signed-in Compass events by default.
- `compass_compass_supertokens_postgres_data` stores internal SuperTokens auth data in Postgres by default.
- Anonymous events and tasks live in your browser's IndexedDB until you sign up. Tasks remain browser-local today.

Docker volume names change if you change `COMPOSE_PROJECT_NAME`.

The installer does not collect telemetry and does not call Compass-owned services after installation. It fetches code from GitHub to install or update Compass.

## Accounts And Where Your Data Lives

Compass stores data in different places depending on whether you're signed in.

- **Before you sign up:** your events and tasks live in your browser's IndexedDB. Calendar and task data are not sent to MongoDB.
- **When you sign up:** SuperTokens creates your account, and any events you already had in the browser are copied into MongoDB. From then on, event changes go through the backend.
- **Tasks stay in your browser** before and after signup. Backend task storage is not available yet.

Back up the default Docker volumes listed above if you want to preserve account events and auth data. Browser-only tasks do not have a backup or export path today.

For a fuller picture of how data flows in each mode, see [Hosting Modes](./development/hosting-modes.md).

## Manual Setup

Use the manual path only if you want to run the services yourself, customize the runtime setup, or deploy in an environment the local installer does not cover.

### What Manual Setup Needs

Compass is a web app plus a backend API. In manual setup, you provide the runtime pieces the backend expects.

**You provide:**

- A machine you can run services on. Your laptop is fine for personal use.
- [Bun](https://bun.sh) for installing dependencies and running the backend and web app.
- Node.js 24+ if you plan to make a production build. You can skip this while running in dev mode.
- A **MongoDB** instance for signed-in event data.
- A **SuperTokens** setup for signup, login, and sessions. Managed SuperTokens is still an option. If you run SuperTokens Core yourself, connect it to Postgres for durable auth storage. The installer manages this Postgres dependency for you; manual setup does not.

**Optional:**

- A **Google Cloud project**, only if you want Compass to sync with Google Calendar.

Google Calendar sync is optional, but the backend currently still requires Google env values to start. Provide real or placeholder Google values in your env file even if you do not plan to connect Google Calendar.

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
   - SuperTokens values for your managed SuperTokens instance or self-hosted Core. If you self-host Core, make sure it is connected to Postgres.
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

You do not have to change anything after the first run. When you're ready:

- **Point at a different MongoDB** by updating `MONGO_URI`.
- **Use a different SuperTokens instance** by updating the SuperTokens values in your env file.
- **Enable Google Calendar** by creating a Google Cloud project, adding real credentials to your env file, and restarting the backend.

### Running On A Server

The v1 local installer does not handle server deployment. For a server, run the same basic pieces yourself: a backend process, a built web app, MongoDB, and either managed SuperTokens or self-hosted SuperTokens Core. If you self-host SuperTokens Core, run Postgres for its auth storage. The web app and backend need public URLs, while MongoDB, SuperTokens Core, and Postgres only need to be reachable from the backend or each other.

Here's what differs from a laptop setup:

- **A domain and public URLs.** Your web app and backend API need to be reachable from your users' browsers. Point a domain or subdomains at your server so you have stable URLs to use.
- **HTTPS.** Required in practice, especially if you want Google Calendar sync. Google OAuth only accepts HTTPS redirect URLs, except for `localhost`. A reverse proxy like Caddy, nginx, or Cloudflare is the common pattern.
- **Public URLs in your env file.** Update `FRONTEND_URL`, `BASEURL`, and `CORS` to match your real public URLs. `BASEURL` is baked into the web app at build time, so rebuild the web app after changing it.
- **Build the web app for production.** In dev mode (`bun run dev:web`) the web app is served live. For a server, build it once from the repo root with `bun run build:web` and serve the built files through your reverse proxy or any static web server.
- **Keep the backend process running.** `bun run dev:backend` is fine for a laptop but is not meant for long-running use. On a server, run the backend under systemd, a container, pm2, or another process manager.
- **Google Cloud configuration.** If you enable Google Calendar sync, configure your Google Cloud project with your public web origin and backend HTTPS URL.
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

A dedicated server deployment guide is still to be written. Until then, [Local Development](./development/local-development.md) has the full list of environment variables the backend and web build expect.

## Next Steps

- **Back up account events and auth data** by backing up the Docker volumes or your manually managed MongoDB/Postgres storage.
- **Enable Google sync** by adding your own Google OAuth credentials to your env file.
- **Deploy on a server** by following the [Server Deployment Checklist](#server-deployment-checklist).

If something is not working or you need to dig deeper:

- [Local Development](./development/local-development.md): full environment variable contract and troubleshooting tips
- [Hosting Modes](./development/hosting-modes.md): how data flows in each mode

Dedicated guides for Google Cloud setup, self-hosted MongoDB, self-hosted SuperTokens, and a full backup playbook are on the roadmap.
