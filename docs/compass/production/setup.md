# First-Time Setup

Install http server to server static (bundled frontend) files:

- `npm install http-server`

Set up certbot/SSL (more below)

## Oauth, SSL, HTTPS

**Stack:** nginx, Google Cloud Compute Engine, backend code, certbot+letsencrypt

**Reverse proxy**: set for `localhost:3000` <-> `***REMOVED***`

- configured in `/etc/nginx/sites-enabled/default`
  - don't get confused with the `sites-available` dir

**HTTP -> HHTPS 301 redirect**: managed by certbot

- in same `sites-enabled` config

## Auto-renewing cert

- Certbot needs port 80 open to renew, so don't close it
  - More reasons to keep port 80 open: [letsencrypt](https://letsencrypt.org/docs/allow-port-80/) | [blog](https://scotthelme.co.uk/why-closing-port-80-is-bad-for-security/)
- certbot should auto-renew. To confirm it'll work, run:
  `certbot renew --dry-run`
- `systemctl list-timers` <-- see when certbot runs

## ... more steps (WIP)

# Troubleshooting

Commands:

- `systemctl status nginx`

Files to check

- nginx location: `/etc/nginx`
  - server block: `/etc/nginx/sites-available/default`
    - sets port
- nginx logs: `/var/log/nginx/{error|access}.log`
- certbot config: `/etc/letsencrypt/renewal/backend[...].conf`
- Make sure production `.env` matches your dev `.env`

## Specific Issues

### HTTP cert expired error from browser:

- Plan A: Fix the cert issue
- In the meantime: type `thisisunsafe` in chrome window, which should bypass the error

### 502 bad gateway when calling {redirect URI}

- Verify backend code is running
- Review nginx and backend logs
