# Server Hosting Guide

This guide describes the recommended first server setup for one person hosting Compass on a small VPS.

Use this when you are comfortable SSHing into a server and checking each step yourself. If you want the lowest-risk path, use [Local Quickstart](./local-quickstart.md) instead.

This server path has not yet been proven as a fully beginner-friendly production runbook. The guide keeps to one setup and calls out what still needs careful testing.

## Recommended Shape

Use one public domain:

- Frontend: `https://compass.example.com`
- Backend API: `https://compass.example.com/api`

Run Compass with Docker Compose on the server, keep the Compass containers bound to `127.0.0.1`, and put Caddy in front of them for HTTPS.

This avoids the extra cookie and browser complexity of a separate API domain such as `https://api.compass.example.com`. That can be supported later, but it is a harder beginner path.

## What You Need

- an Ubuntu VPS
- Docker and Docker Compose on the server
- a domain name pointed at the server
- Caddy for HTTPS reverse proxying
- SSH access to the server

The examples below use `compass.example.com`. Replace it with your real domain.

## Install Compass On The Server

SSH into the server, make sure Docker is running, then install Compass:

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

The installer creates `~/compass`, writes `~/compass/.env`, and starts the local Docker stack.

By default, the stack listens only on the server itself:

- web: `127.0.0.1:9080`
- backend: `127.0.0.1:3000`

That is good for server hosting. Caddy can reach those local ports, but the database containers are not exposed to the public internet.

## Configure Public URLs

Edit the generated env file:

```bash
cd ~/compass
nano .env
```

Set these values:

```bash
FRONTEND_URL=https://compass.example.com
BASEURL=https://compass.example.com/api
CORS=https://compass.example.com
```

Leave `WEB_PORT=9080` and `PORT=3000` unless you know you need different local ports.

After changing `.env`, rebuild Compass so the web app receives the new backend URL:

```bash
./compass rebuild
```

## Configure Caddy

Put Caddy on the same server as Compass and proxy one domain to the two local Compass ports.

Example Caddyfile:

```caddyfile
compass.example.com {
	handle /api/* {
		reverse_proxy 127.0.0.1:3000
	}

	handle {
		reverse_proxy 127.0.0.1:9080
	}
}
```

Reload Caddy after changing its config.

Then check:

```bash
curl https://compass.example.com/api/health
```

A healthy backend returns a JSON response with `"status":"ok"`.

## Sign In And Test The Basics

Open `https://compass.example.com` in your browser.

Test the password-only path first:

1. create an account with email/password
2. sign out
3. sign back in
4. create an event
5. edit the event
6. delete the event
7. restart Compass with `./compass restart`
8. sign in again and confirm events are still there

Do this before adding Google Calendar. It keeps the first server test focused on Compass, auth, and storage.

## Google Calendar

Google Calendar is optional.

If you want Google sign-in or Google Calendar connect, add real Google OAuth values to `~/compass/.env` and rebuild:

```bash
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
TOKEN_GCAL_NOTIFICATION=<long-random-secret>
```

Your Google Cloud OAuth app must allow the public Compass domain. For the one-domain setup, use:

- authorized JavaScript origin: `https://compass.example.com`
- authorized redirect URI: `https://compass.example.com`

Google-to-Compass watch notifications need Google to reach the backend over public HTTPS. With this server guide, that means `https://compass.example.com/api`.

Do not claim continuous Google Calendar sync is working until you have tested Google connect, import, webhook delivery, and watch renewal behavior on your server.

## Backups

Before updating or experimenting with server config, back up:

- `~/compass/.env`
- the Mongo Docker volume
- the SuperTokens Postgres Docker volume

Use [Backups And Restore](./backups-and-restore.md).

Docker backups do not include browser IndexedDB data, including tasks and anonymous or pre-signup local data.

## Updating

From the installed folder:

```bash
cd ~/compass
./compass update
```

Back up first. `./compass update` rebuilds Compass; it is not a rollback tool.

## Limits Of This Guide

This guide gives one coherent server shape, but it is still not a fully verified beginner production runbook.

Known limits:

- HTTPS and Caddy setup are outside the Compass installer.
- Backups are manual.
- Restore is manual.
- Rollback is manual.
- Google Calendar continuous sync still needs server-specific verification.
- A separate API domain is not the recommended first path.

Avoid exposing MongoDB, SuperTokens, or Postgres to the public internet. A safe server setup keeps those services private and exposes only the web app and API through HTTPS.
