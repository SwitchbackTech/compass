# Usage

Info on how to maintain the production environment
Do everything in `setup.md` before trying these things.

### Making Changes:

Run build scripts locally:

```
yarn build    # builds core and web
yarn deploy   # copies to VM
```

SSH into VM

If updating the web bundle:

```
sudo su

bash /compass-calendar/scripts/deploy.web.sh
```

If updating backend:

```
bash /compass-calendar/scripts/deploy.backend.sh
```

---

Manage processes

```
pm2 restart $name   # if pm2 not in watch mode already
```

### Check logs

```
sudo su
pm2 start $name--watch
pm2 logs $name
```

## Other

### Google sync updates:

Google's Oauth servers call a redirect URI after auth has completed

- Those URIs are specified in GCP > APIs & Services > Credentials > Compass Calendar Backend
- More info in `flow.gcal.sync.md`

---

# Troubleshooting

Commands:

- `ufw -h` or `ufw status` | the nginx firewall setup
- `nginx -t` | checks config files
- `systemctl status nginx`
- `systemctl reload nginx` | keeps running, reads in new configs
- `systemmctl restart nginx` | stops + starts

Files to check

nginx configs: `/etc/nginx/...`

- server block: `/etc/nginx/sites-enabled/...`
  - sets port

nginx logs:

```
tail -f /var/log/nginx/{error|access}.log
```

certbot config: `/etc/letsencrypt/renewal/backend[...].conf`

env: `/compass-calendar/build/../.env`

- check for discrepancies against the `.env` you're using in dev

---

## Specific Issues

### HTTP cert expired error from browser:

- Plan A: Fix the cert issue
- In the meantime: type `thisisunsafe` in chrome window, which should bypass the error

### 502 bad gateway when calling {redirect URI}

- Verify backend code is running
- Review nginx and backend logs

# References:

- Backend repo is based on [this api blog](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1)
- Another [oauth api blog](https://auth0.com/blog/node-js-and-typescript-tutorial-build-a-crud-api/)
