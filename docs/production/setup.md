# First-Time Setup

_Things to do during a production VM setup_

## Code & git (WIP)

- Install GitHub CLI for easier authentication | [Linux docs](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
- Use the GH CLI to cache credentials | [doc](https://docs.github.com/en/get-started/getting-started-with-git/caching-your-github-credentials-in-git)

If still running backend from `ts-node`: `sudo yarn dev`

- installs all dependencies required

Install http server to server static (bundled frontend) files:

- `npm install http-server`

Set up `pm2` processes ([quickstart](https://pm2.keymetrics.io/docs/usage/quick-start/))

- run it on boot: `pm2 startup && pm2 save`

Populate `.env` file on server

Set up certbot/SSL (more below)

## Web Server

Oauth, HTTPS, etc

`systemctl enable nginx` | ensure nginx loads on boot

- verify it worked by seeing if `nginx.service` is listed in this cmd output: `systemctl list-unit-files --type=service --state=enabled --all`

**Stack:** nginx, Google Cloud Compute Engine, backend code, certbot+letsencrypt

**Reverse proxy**: set for `localhost:<port>` <-> `***REMOVED***`

- configured in `/etc/nginx/sites-enabled/default`
  - don't get confused with the `sites-available` dir

**HTTP -> HHTPS 301 redirect**: managed by certbot

- in same `sites-enabled` config

### Auto-renewing cert (WIP)

- Certbot needs port 80 open to renew, so don't close it
  - More reasons to keep port 80 open: [letsencrypt](https://letsencrypt.org/docs/allow-port-80/) | [blog](https://scotthelme.co.uk/why-closing-port-80-is-bad-for-security/)
- certbot should auto-renew. To confirm it'll work, run:
  `certbot renew --dry-run`
- `systemctl list-timers` <-- see when certbot runs

# References

Interactive Nginx config setup | [DigitalOcean](https://www.digitalocean.com/community/tools/nginx)
