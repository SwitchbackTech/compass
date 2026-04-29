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

If you're starting from a fresh VPS, install Docker Engine, Docker Compose, and
Caddy before continuing. Prefer the official apt packages over Snap packages:

- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Caddy on Debian, Ubuntu, Raspbian](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

If the server has been used for other projects, do the checks in the next
section before you install Compass. Existing web servers, private-network tools,
or firewall rules can block Caddy even when the Compass containers are healthy.

## The shape

One public domain, two paths:

- Frontend: `https://compass.example.com`
- Backend API: `https://compass.example.com/api`

Compass binds to `127.0.0.1:9080` and `127.0.0.1:3000` on the server. Caddy proxies the public domain to those local ports and handles HTTPS automatically.

A separate API domain like `https://api.compass.example.com` may be possible, but it adds cookie and CORS complexity. This guide uses one domain for the first server install.

## 0. Point DNS and check the server

Create a DNS record for the subdomain you want to use:

```text
Type: A
Name: compass
Value: <your-vps-ipv4-address>
```

That example makes `compass.example.com` point at the server's public IPv4
address. DNS is managed wherever your domain's nameservers point. That may be
your registrar, but it may also be another host such as Cloudflare or Vercel.

You can confirm the record from your own computer:

```bash
dig +short A compass.example.com
```

It should print your VPS IPv4 address. Don't add an `AAAA` record unless the
server's IPv6 is configured and reachable.

On the server, confirm the basic tools and ports:

```bash
lsb_release -a
docker --version
docker compose version
caddy version
sudo systemctl status caddy --no-pager
sudo ss -tulpn | grep -E ':(80|443|3000|9080)\b' || true
sudo ufw status verbose || true
```

For the recommended setup:

- Caddy should run as a system service.
- Public ports `80` and `443` should be available for Caddy.
- Ports `3000` and `9080` should be unused before the Compass installer runs.
- If UFW or another firewall is enabled, allow inbound TCP `80` and `443`.

Caddy needs port `80` for the first certificate setup and HTTP-to-HTTPS
redirects. It needs port `443` for the final HTTPS site.

## Steps in order

Order matters. The helper script's health check uses `BASEURL`, so set up Caddy **before** changing `BASEURL` to your public URL. Otherwise the rebuild fails its health check against an HTTPS URL that isn't routed yet.

1. Point DNS at the server and confirm the server has Docker, Compose, Caddy, and open `80`/`443`.
2. SSH into the server and install Compass with the local installer.
3. Configure Caddy to proxy `compass.example.com` to `127.0.0.1:9080` and `/api/*` to `127.0.0.1:3000`.
4. Verify Caddy can reach the local backend over HTTPS.
5. Edit `~/compass/.env` to use your public URLs, then `./compass rebuild`.
6. Sign in over HTTPS and run the basic tests below.
7. (Optional) Add Google Calendar.

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

Validate and reload Caddy after saving:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

If this is the first real HTTPS site on the server, Caddy will fetch a
certificate after the reload. That can take a few seconds.

## 3. Verify Caddy can reach the backend

```bash
curl -f https://compass.example.com/api/health
```

A healthy backend returns JSON with `"status":"ok"`. If this fails, Caddy isn't routing to the backend yet. Fix that before moving on.

If `curl` cannot connect to port `443`, check that Caddy is listening there:

```bash
sudo ss -tulpn | grep -E ':(80|443)\b' || true
sudo systemctl status caddy --no-pager -l
sudo journalctl -u caddy --since '10 minutes ago' --no-pager -l
```

If another process already owns `443`, Caddy cannot serve HTTPS. Common examples
are another web server, an old Caddy process, or a private-network HTTPS feature
such as Tailscale Serve. Stop or move the conflicting service, then restart
Caddy:

```bash
sudo systemctl reset-failed caddy
sudo systemctl restart caddy
```

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

Confirm the public health check still works after the rebuild:

```bash
curl -f https://compass.example.com/api/health
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

For a final server-side check, run:

```bash
cd ~/compass
./compass status
sudo ss -tulpn | grep -E ':(80|443|3000|9080)\b' || true
curl -f https://compass.example.com/api/health
```

You want the Compass containers healthy, Caddy listening on public `80` and
`443`, and the Compass backend/web containers still bound only to `127.0.0.1`.

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

The default compose file keeps MongoDB, SuperTokens, and Postgres off the public
internet. Keep it that way. Don't add public port mappings for those services,
don't open their ports in your firewall, and don't move them to public database
hosts unless you know how you want to secure them. For this guide, only Caddy
should be public, and Caddy should proxy only the web app and `/api`.
