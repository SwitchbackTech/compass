# Run Compass on a server

This guide describes the recommended first server setup for one person hosting Compass on a small VPS. One public domain, Compass on `127.0.0.1`, Caddy in front for HTTPS.

If you only want Compass on your own computer, use [Local quickstart](./local-quickstart.md) instead.

## Before you start

This path assumes you're comfortable with:

- SSH and editing files on a remote Linux machine
- DNS records (pointing a domain at a server's IP)
- installing Docker on Ubuntu
- editing config files like `~/compass/.env` and a Caddyfile

Plan for **30 to 60 minutes** end to end, mostly waiting on DNS propagation, image pulls, and Caddy's first certificate fetch.

You'll need:

- an Ubuntu VPS with Docker and Docker Compose installed
- a domain name pointed at the server's public IP
- Caddy installed on the same server
- SSH access

The examples use `compass.example.com`. Replace it with your real domain everywhere.

## The shape

One public domain, two paths:

- Frontend: `https://compass.example.com`
- Backend API: `https://compass.example.com/api`

Compass binds to `127.0.0.1:9080` and `127.0.0.1:3000` on the server. Caddy proxies the public domain to those local ports and handles HTTPS automatically.

A separate API domain like `https://api.compass.example.com` may be possible, but it adds cookie and CORS complexity. This guide uses one domain for the first server install.

## Steps in order

Order matters. The helper script's health check uses `BASEURL`, so set up Caddy **before** changing `BASEURL` to your public URL. Otherwise the rebuild fails its health check against an HTTPS URL that isn't routed yet.

1. SSH into the server and install Compass with the local installer.
2. Configure Caddy to proxy `compass.example.com` to `127.0.0.1:9080` and `/api/*` to `127.0.0.1:3000`.
3. Verify Caddy can reach the local backend over HTTPS.
4. Edit `~/compass/.env` to use your public URLs, then `./compass rebuild`.
5. Sign in over HTTPS and run the basic tests below.
6. (Optional) Add Google Calendar.

## 1. Install Compass on the server

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

The installer creates `~/compass`, writes `~/compass/.env`, and starts the local Docker stack on `127.0.0.1:9080` (web) and `127.0.0.1:3000` (backend). The database containers stay on Docker's internal network and aren't exposed publicly.

## 2. Configure Caddy

Put Caddy on the same server as Compass. Example Caddyfile:

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

Reload Caddy after saving.

## 3. Verify Caddy can reach the backend

```bash
curl -f https://compass.example.com/api/health
```

A healthy backend returns JSON with `"status":"ok"`. If this fails, Caddy isn't routing to the backend yet. Fix that before moving on.

## 4. Switch Compass to your public URLs

> **Warning.** Don't change `BASEURL` until step 3 succeeds. The helper script uses `BASEURL` for its own health check during rebuild. If `BASEURL` points at an HTTPS URL Caddy can't serve yet, the rebuild fails.

Edit the env file:

```bash
cd ~/compass
nano .env
```

Set:

```bash
FRONTEND_URL=https://compass.example.com
BASEURL=https://compass.example.com/api
CORS=https://compass.example.com
```

Leave `WEB_PORT=9080` and `PORT=3000` unless you have a specific reason to change them.

Rebuild so the web app receives the new backend URL:

```bash
cd ~/compass
./compass rebuild
```

> **Tip.** If you ever need the helper to check the local backend directly while `BASEURL` stays public, add `COMPASS_HEALTH_URL=http://127.0.0.1:3000/api/health` to `~/compass/.env`. Most one-domain installs don't need this once Caddy is working.

## 5. Sign in and test the basics

Open `https://compass.example.com` in a browser. Run the password-only path first, before adding Google:

1. create an account with email and password
2. sign out
3. sign back in
4. create an event
5. edit the event
6. delete the event
7. `./compass restart`
8. sign in again and confirm the events are still there

Doing this before Google keeps the first server test focused on Compass, auth, and storage.

## 6. Add Google Calendar (optional)

If you want Google sign-in or Google Calendar watch notifications, see [Google Calendar — Public watch notifications](./google-calendar.md#public-watch-notifications). The short version:

- add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `TOKEN_GCAL_NOTIFICATION` to `~/compass/.env`
- in your Google OAuth client, set the authorized JavaScript origin and redirect URI to `https://compass.example.com`
- `./compass rebuild`

Test Google connect, import, webhook delivery, and watch renewal on this install before relying on continuous sync.

## Updating

> **Warning: back up before every update.** `./compass update` rebuilds with newer code. There is no rollback. Back up `~/compass/.env`, the Mongo volume, and the SuperTokens Postgres volume **together**. See [Backups and restore](./backups-and-restore.md).

Then:

```bash
cd ~/compass
./compass update
```

## What this guide leaves to you

This guide gives one coherent server shape. It doesn't automate everything a production service usually needs.

- HTTPS and Caddy setup are outside the Compass installer.
- Backups, restore, and rollback are manual.
- Google Calendar continuous sync needs server-specific setup and testing.
- A separate API domain is not the recommended first path.

> **Warning.** Don't expose MongoDB, SuperTokens, or Postgres to the public internet. A safe server keeps those private and exposes only the web app and API through HTTPS.
