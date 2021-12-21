# How `***REMOVED***` works

# Usage

### SSH into VM and run:

```
sudo su
pm2 start $version --watch
pm2 logs $version
```

### Making changes:

push local changes to `compass-calendar` repo

SSH into cloud VM

```
cd /$version
git fetch

# if using a branch other than main:
git checkout <branch>

cd package/<package>
```

Start: `yarn start` (production, compiled) or `yarn dev`

pm2 [wip]:
```
pm2 restart $version #if pm2 not in watch mode already
```

# Oauth, SSL

**Stack:** nginx, Google Cloud Compute Engine, backend code, certbot+letsencrypt

**Reverse proxy**: set for `localhost:3000` <-> `***REMOVED***`
- configured in `/etc/nginx/sites-enabled/default`

**301 HTTP -> HHTPS redirect**: managed by certbot
- in same `sites-enabled` config

## Renewing cert:
- Certbot needs port 80 open to renew, so don't close it
    - More reasons to keep port 80 open: [letsencrypt](https://letsencrypt.org/docs/allow-port-80/) | [blog](https://scotthelme.co.uk/why-closing-port-80-is-bad-for-security/) 
- certbot should auto-renew. To confirm it'll work, run:
`certbot renew --dry-run` 
- `systemctl list-timers` <-- see when certbot runs

## Other
Helpful commands: `ufw -h` or `ufw status` <-- the nginx firewall setup

### Google sync updates:

Google's Oauth servers call a redirect URI after auth has completed

- Those URIs are specified in GCP > APIs & Services > Credentials > Compass Calendar Backend
- More info in `flow.gcal.sync.md`


# References:

- Backend repo is based on [this api blog](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1)
- Another [oauth api blog](https://auth0.com/blog/node-js-and-typescript-tutorial-build-a-crud-api/)
- nginx location: `/etc/nginx`
  - server block: `/etc/nginx/sites-available/default`
- nginx logs: `/var/log/nginx/{error|access}.log`
- certbot config: `/etc/letsencrypt/renewal/backend[...].conf`





# Troubleshooting
HTTP cert expired error from browser: 
- Plan A: Fix the cert issue
-  In the meantime: type `thisisunsafe` in chrome window, which should bypass the error


502 bad gateway when calling {redirect URI}

- Verify backend code is running
- Review nginx and backend logs

Other troubleshooting ideas:

- Make sure production `.env` matches your dev `.env`

