# Self-Hosting Compass

Run Compass on your own machine and keep your calendar data on your own infrastructure.

This guide walks through the manual setup path: what you need to provide, what Compass expects to be running, and what to expect once everything is up. You don't need to be a systems expert, but you should be comfortable running a few commands and editing a config file.

> **Note:** A one-command installer is planned. Until it ships, use the manual steps below.

## What Compass Needs

Compass is a web app plus a backend API. It doesn't bundle a database or an auth server — it expects both to exist and to be reachable from the backend.

**You provide:**

- A machine you can run services on. Your laptop is fine for personal use.
- [Bun](https://bun.sh) for installing dependencies and running the backend and web app.
- Node.js 24+ if you plan to make a production build. You can skip this while running in dev mode.
- A **MongoDB** instance. Stores your events once you sign up. The simplest path is a managed service like MongoDB Atlas (the free tier is plenty for personal use). You can also run MongoDB in Docker or install it directly on your machine.
- A **SuperTokens** instance. Handles signup, login, and sessions. The simplest path is the managed SuperTokens SaaS (free tier is plenty for personal use). You can also run the SuperTokens core in Docker.

**Optional:**

- A **Google Cloud project**, only if you want Compass to sync with Google Calendar.

> **Heads up:** Google Calendar sync is optional, but the backend currently still requires Google env values to start. Until that's fixed, provide real or placeholder Google values in your env file even if you don't plan to connect Google Calendar.

**Compass provides:**

- The web app and backend, plus all the logic that reads and writes your events.
- Local-first storage in the browser before you sign up — you can use Compass immediately without configuring anything else.
- Migration of your browser-local events into your MongoDB when you create an account.
- Google Calendar sync once you connect a Google Cloud project.

## Setup Steps

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

   - `MONGO_URI` — connection string for your MongoDB.
   - SuperTokens values — the URI and key for your SuperTokens instance.
   - Google credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) — required for the backend to start even if you aren't planning to use Google Calendar. Paste in real credentials if you have a Google Cloud project, or keep the placeholder values from the example file until you do.

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

   You can start using it immediately — no account required.

## What To Expect

Once both commands are running, here's where everything lives by default:

| Piece                | Where it is                                            |
| -------------------- | ------------------------------------------------------ |
| Web app              | [http://localhost:9080](http://localhost:9080)         |
| Backend API          | [http://localhost:3000/api](http://localhost:3000/api) |
| MongoDB              | Whatever you set `MONGO_URI` to                        |
| SuperTokens          | Whatever SuperTokens instance you configured           |
| Google Calendar sync | Off until you configure Google credentials             |

If the web app loads but signup fails, check that your backend is running and that MongoDB and SuperTokens are reachable from it. The backend has a health endpoint for a quick check:

```bash
curl http://localhost:3000/api/health
```

A `200` response means the backend is running and can reach MongoDB.

## Accounts And Where Your Data Lives

Compass stores data in different places depending on whether you're signed in.

- **Before you sign up:** your events and tasks live in your browser's local storage (IndexedDB). Calendar and task data are not sent to MongoDB.
- **When you sign up:** SuperTokens creates your account, and any events you already had in the browser are copied into your MongoDB. From then on, event changes go through the backend.
- **Tasks stay in your browser** before and after signup. Backend task storage is not available yet.

**Backing up your data:**

- **Back up your MongoDB regularly.** Account events are stored there, so any MongoDB backup approach works — `mongodump` for self-hosted Mongo, or the built-in snapshot feature of a managed service like Atlas.
- **Tasks only live in the browser's IndexedDB** and don't have a backup or export path today. If browser storage is cleared or you move to a new device, those tasks are gone. A proper task export story is still to come.

For a fuller picture of how data flows in each mode, see [Hosting Modes](./development/hosting-modes.md).

## Customizing After Setup

You don't have to change anything past the first run. When you're ready:

- **Point at a different MongoDB** by updating `MONGO_URI`. A managed MongoDB service, a container on your machine, or a remote server all work.
- **Use a different SuperTokens instance** by updating the SuperTokens values in `.env.local`.
- **Enable Google Calendar** by creating a Google Cloud project, adding real credentials to `.env.local`, and restarting the backend.

## Running On A Server

Running Compass on a server is the same shape as running it on your laptop. The pieces don't change — a backend process, a built web app, a MongoDB, and a SuperTokens instance. What changes is the wiring: the web app and backend need public URLs, and everything has to be configured with those real URLs instead of `localhost`. MongoDB and SuperTokens only need to be reachable from the backend; they don't have to be public.

Here's what differs from a laptop setup:

- **A domain and public URLs.** Your web app and backend API need to be reachable from your users' browsers. Point a domain (or two subdomains) at your server so you have stable URLs to use.
- **HTTPS.** Required in practice, especially if you want Google Calendar sync — Google OAuth only accepts HTTPS redirect URLs (except for `localhost`). Putting a reverse proxy like Caddy, nginx, or Cloudflare in front of Compass is the common pattern, and it handles HTTPS termination for you.
- **Public URLs in your env file.** Update `FRONTEND_URL`, `BASEURL`, and `CORS` to match your real public URLs. `BASEURL` is baked into the web app at build time, so rebuild the web app after changing it.
- **Build the web app for production.** In dev mode (`bun run dev:web`) the web app is served live. For a server, build it once from the repo root with `bun run build:web` (this loads the backend env file so `BASEURL` is injected into the bundle correctly) and serve the built files through your reverse proxy or any static web server.
- **Keep the backend process running.** `bun run dev:backend` is fine for a laptop but isn't meant for long-running use. On a server, run the backend under systemd, a container, pm2, or whatever process manager you're comfortable with, so it restarts on crashes and reboots.
- **Google Cloud configuration.** If you enable Google Calendar sync, configure your Google Cloud project with your public web origin for OAuth, and make sure your backend API has a public HTTPS URL so Google can deliver Calendar notifications to it.
- **MongoDB and SuperTokens as backend-only services.** A managed MongoDB service and a managed SuperTokens deployment are the simplest path. If you self-host them, they need to be reachable from the backend — same server, private network, or public internet with access controls — but they don't need to be exposed to the outside world.

### Server Deployment Checklist

A short, ordered pass for taking a laptop setup to a server:

1. Choose the public URLs you want for the web app and backend API.
2. Set `FRONTEND_URL`, `BASEURL`, and `CORS` in `packages/backend/.env.local` to match those URLs.
3. Build the web app from the repo root with `bun run build:web`.
4. Run the backend under a process manager (systemd, a container, pm2, etc.) so it restarts on crashes and reboots.
5. Put a reverse proxy (Caddy, nginx, Cloudflare) in front of both and terminate HTTPS there.
6. Verify `/api/health` returns `200` when hit through your public backend URL.
7. Create an account through your public web URL to confirm signup end-to-end.
8. (Optional) Configure your Google Cloud project with your public web origin and backend HTTPS URL, then connect Google Calendar from inside Compass.

A dedicated server deployment guide is still to be written. Until then, [Local Development](./development/local-development.md) has the full list of environment variables the backend and web build expect.

## Next Steps

You don't need a dedicated guide for most follow-up work — each one is a small change against your existing setup:

- **Swap MongoDB, SuperTokens, or enable Google sync** — follow the [Customizing After Setup](#customizing-after-setup) section above. Each change is an env-file edit plus a backend restart.
- **Back up account events** — run `mongodump` against your `MONGO_URI` on a schedule, or turn on your managed MongoDB's built-in backups.
- **Deploy on a server** — follow the [Server Deployment Checklist](#server-deployment-checklist) above.

If something isn't working or you need to dig deeper:

- [Local Development](./development/local-development.md) — full environment variable contract and troubleshooting tips
- [Hosting Modes](./development/hosting-modes.md) — how data flows in each mode

Dedicated guides for Google Cloud setup, self-hosted MongoDB, self-hosted SuperTokens, and a full backup playbook are on the roadmap.
