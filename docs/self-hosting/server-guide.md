# Run Compass on a server

This guide describes the recommended first server setup for one person hosting Compass on a small VPS. One public domain, Compass on `127.0.0.1`, Caddy in front for HTTPS.

If you only want Compass on your own computer, use the normal Bun-based local setup instead of this self-hosting guide. See [Run Compass without the installer](./advanced-manual.md).

## Before you start

This path assumes you're comfortable with:

- SSH and editing files on a remote Linux machine
- DNS records (pointing a domain at a server's IP)
- installing Docker on Ubuntu
- editing config files like `~/compass/.env` and a Caddyfile

Plan for **30 to 60 minutes** end to end, mostly waiting on DNS propagation, image pulls, and Caddy's first certificate fetch.

The examples use `compass.example.com`. Replace it with your real domain everywhere.

## What to expect

One public domain, two paths:

- Frontend: `https://compass.example.com`
- Backend API: `https://compass.example.com/api`

Compass binds to `127.0.0.1:9080` and `127.0.0.1:3000` on the server. Caddy proxies the public domain to those local ports and handles HTTPS automatically.

A separate API domain like `https://api.compass.example.com` may be possible, but it adds cookie and CORS complexity. This guide uses one domain for the first server install.

### High-level steps

1. Get a VPS with Ubuntu, then install Docker, Docker Compose, and Caddy.
2. Point DNS at the server and confirm the server has Docker, Compose, Caddy, and open `80`/`443`.
3. SSH into the server and install Compass with the self-host installer.
4. Configure Caddy to proxy `compass.example.com` to `127.0.0.1:9080` and `/api/*` to `127.0.0.1:3000`.
5. Verify Caddy can reach the local backend over HTTPS.
6. Edit `~/compass/.env` to use your public URLs, then recreate the backend
   container and rebuild the web container.
7. Sign in over HTTPS and run the basic tests below.
8. (Optional) Add Google Calendar.

## 0. Setup your VPS

If you already have an Ubuntu VPS with Docker, Docker Compose, and Caddy installed, skip to [step 1](#1-point-dns-and-check-the-server).

### Pick a provider

Any provider will do, but here are two simple options.

**[DigitalOcean Droplets](https://docs.digitalocean.com/products/droplets/getting-started/).** Their [Initial Server Setup with Ubuntu](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu) guide walks you through region, size, SSH key upload, and firewall setup. A Droplet at $12/month (1 vCPU, 2 GB RAM) is enough for a personal Compass instance.

**[Hetzner Cloud](https://docs.hetzner.com/cloud/servers/getting-started/creating-a-server/)** is a strong low-cost alternative. Their CX22 starts at around $4/month for 2 vCPU and 2 GB RAM.

### Minimum specs

| Resource | Minimum |
|---|---|
| RAM | 2 GB (4 GB recommended) |
| Storage | 20 GB SSD |
| OS | Ubuntu 22.04 LTS or 24.04 LTS |
| Network | 1 static public IPv4 address |

### Initial server setup

After the server is created, SSH in and run your provider's initial setup steps (create a non-root sudo user, etc.), then open the ports Caddy needs:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Then install Docker Engine, Docker Compose, and Caddy using the official apt packages:

- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Caddy on Ubuntu](https://caddyserver.com/docs/install#debian-ubuntu-raspbian)

Once those are installed, continue to step 1.

## 1. Point DNS and check the server

### Get a domain name

You'll need a domain name to get HTTPS working. If you already have one (me.dev) and are OK with adding a subdomain (calendar.me.dev), you can skip this step.

Two good options for new domains:

**[Namecheap](https://www.namecheap.com)** — straightforward UI, `.com` domains ~$9–11/year, free WHOIS privacy included.

**[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** — sells domains at cost. A good choice if you want fast DNS management in one place.

### Create a DNS record for the subdomain you want to use

```text
Type: A
Name: <subdomain>       # example: 'cal', 'calendar', 'compass', 'app'
Value: <your-vps-ipv4-address>
```

That makes the subdomain point at the server's public IPv4 address. DNS is managed wherever your domain's nameservers point. That may be
your registrar, but it may also be another host such as Cloudflare or Vercel.

Say you have a domain `example.com` and create the A record for the subdomain `compass`. You can confirm the record from your own computer:

```bash
dig +short A compass.example.com
```

It should print your VPS IPv4 address. It might take a few minutes for your DNS record to propagate.

### Sanity-check

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

If the server has been used for other projects, existing web servers, private-network tools,
or firewall rules can block Caddy even when the Compass containers are healthy.

For the recommended setup:

- Caddy should run as a system service.
- Public ports `80` and `443` should be available for Caddy.
- Ports `3000` and `9080` should be unused before the Compass installer runs.
- If UFW or another firewall is enabled, allow inbound TCP `80` and `443`.

Caddy needs port `80` for the first certificate setup and HTTP-to-HTTPS
redirects. It needs port `443` for the final HTTPS site.

## 2. Install Compass on the server

```bash
curl -fsSL https://raw.githubusercontent.com/SwitchbackTech/compass/main/self-host/install.sh | sh
```

The installer creates `~/compass`, writes `~/compass/.env`, and starts the Docker stack on `127.0.0.1:9080` (web) and `127.0.0.1:3000` (backend). The database containers stay on Docker's internal network and aren't exposed publicly.

From this point on, `localhost` means the VPS you are SSH'd into. You won't open `http://localhost:9080` from your own laptop unless you use SSH port forwarding. For normal server use, continue to Caddy and open the public HTTPS URL.

## 3. Configure Caddy

Put Caddy on the same server as Compass. Its config file is usually `/etc/caddy/Caddyfile`.

Open it on the server:

```bash
sudo vi /etc/caddy/Caddyfile
```

Replace the file contents with this Caddyfile, using your real domain instead
of `compass.example.com`:

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

This tells Caddy to serve your public domain over HTTPS, send `/api/*` requests
to the Compass backend on `127.0.0.1:3000`, and send everything else to the web
app on `127.0.0.1:9080`.

If you want to understand the Caddyfile format before editing it, read Caddy's
[Caddyfile tutorial](https://caddyserver.com/docs/caddyfile-tutorial).

Save the file, then validate and reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

If this is the first real HTTPS site on the server, Caddy will fetch a
certificate after the reload. That can take a few seconds.

## 4. Verify Caddy can reach the backend

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

## 5. Switch Compass to your public URLs

> **Warning.** Don't change `BASEURL` until step 4 succeeds. Compass uses
> `BASEURL` for health checks. If `BASEURL` points at an HTTPS URL Caddy can't
> serve yet, the health check fails even if the containers are running.

Edit the env file:

```bash
cd ~/compass
vi .env
```

Set:

```bash
FRONTEND_URL=https://compass.example.com
BASEURL=https://compass.example.com/api
CORS=https://compass.example.com
```

Leave `WEB_PORT=9080` and `PORT=3000` unless you have a specific reason to change them.

Apply the env changes.

```bash
cd ~/compass
docker compose --project-name compass --env-file .env \
  -f app/self-host/docker-compose.yml \
  up -d --no-deps --force-recreate backend

docker compose --project-name compass --env-file .env \
  -f app/self-host/docker-compose.yml \
  up -d --build --no-deps web
```

`./compass rebuild` also works, but it rebuilds every Compass image and can be
slow on a small VPS.

Confirm the public health check still works after applying the env changes:

```bash
curl -f https://compass.example.com/api/health
```

Then tail the backend logs while you open Compass in a browser. This lets you
see successful requests and spot backend errors immediately:

```bash
cd ~/compass
./compass logs backend
```

> **Tip.** If you ever need the helper to check the local backend directly while `BASEURL` stays public, add `COMPASS_HEALTH_URL=http://127.0.0.1:3000/api/health` to `~/compass/.env`. Most one-domain installs don't need this once Caddy is working.

## 6. Sign in and test the basics

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

## 7. Add Google Calendar (optional)

If you want Google sign-in or Google Calendar watch notifications, see [Google Calendar — Public watch notifications](./google-calendar.md#public-watch-notifications). The short version:

- add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `TOKEN_GCAL_NOTIFICATION` to `~/compass/.env`
- in your Google OAuth client, set the authorized JavaScript origin and redirect URI to `https://compass.example.com`
- `./compass rebuild`

Test Google connect, import, and webhook delivery on this install before relying on Google sync. Create or edit one event directly in Google Calendar and confirm it appears in Compass without reconnecting Google. Then restart Compass and confirm the connection still works.

Long-running Google watch renewal is not scheduled by the self-host Docker stack. If you rely on ongoing Google sync, you still need to verify renewal on your server and wire up maintenance separately.

## Updating

> **Warning: back up before every update.** `./compass update` rebuilds with newer code. There is no rollback. Back up `~/compass/.env`, the Mongo volume, and the SuperTokens Postgres volume **together**. See [Backups and restore](./backups-and-restore.md).

Then:

```bash
cd ~/compass
./compass update
```

## What this guide leaves to you

This guide gives one coherent server setup. It doesn't automate everything a production service usually needs.

- Backups, restore, and rollback are manual.
- Google Calendar continuous sync needs server-specific setup and testing.
- A separate API domain (possible, but more complex)

The default compose file keeps MongoDB, SuperTokens, and Postgres off the public
internet. Keep it that way. Don't add public port mappings for those services,
don't open their ports in your firewall, and don't move them to public database
hosts unless you know how you want to secure them. For this guide, only Caddy
should be public, and Caddy should proxy only the web app and `/api`.

## What to read next

Before your first update, read [Backups and restore](./backups-and-restore.md). If you are adding Google, keep [Google Calendar](./google-calendar.md) open while you test it.

Have an idea on how this guide can be improved? Let us know in [this GitHub Discussion](https://github.com/SwitchbackTech/compass/discussions/1694).
