# First-Time Setup

_Things to do during a production VM setup_

## SSH (optional)

Setup SSH keys with the VM, which makes logging in and copying build files easier

## Code & git

- Install GitHub CLI for easier authentication | [Linux docs](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
- Use the GH CLI to cache credentials | [doc](https://docs.github.com/en/get-started/getting-started-with-git/caching-your-github-credentials-in-git)

## Backend

### Setup

Populate `.env` file on server

- needed for the backend variables

installs dependencies: `yarn dev`

### Run

Set up `pm2` processes for backend ([quickstart](https://pm2.keymetrics.io/docs/usage/quick-start/))

```
pm2 install pm2-logrotate  # enable log rotation, using defaults

# init pm2 process called `backend`, which runs the `yarn start:backend` script
pm2 start yarn --name backend -- start:backend

pm2 save    # save to synchronize
pm2 startup # run it on boot
pm2 logs    # confirm it's working
            # PS these logs are saved in /root/.pm2/logs
```

- may need to be updated if installed on something other than Ubuntu | [reference](https://stackoverflow.com/questions/59046837/what-is-the-pm2-for-command-yarn-run-start)

- reminder: the frontend code/bundle is served statically by nginx, so you don't need to create a `pm2` process for it

  - I think (?). The `http-server` is also relevant, but I can't remember why. Might just be a separate way of serving the bundle

Set up certbot/SSL (more below)

## Web Server

Oauth, HTTPS, etc

`systemctl enable nginx` | ensure nginx loads on boot

- verify it worked by seeing if `nginx.service` is listed in this cmd output: `systemctl list-unit-files --type=service --state=enabled --all`

**Stack:** nginx, Google Cloud Compute Engine, backend code, certbot+letsencrypt

**Reverse proxy**: set for `localhost:<port>` <-> `***REMOVED***`

- configured in `/etc/nginx/sites-enabled/default`
  - don't get confused with the `sites-available` dir
- reference the `nginx` files in this `/docs` directory for working examples

**HTTP -> HHTPS 301 redirect**: managed by certbot

- in same `sites-enabled` config

### Auto-renewing cert (WIP)

- Certbot needs port 80 open to renew, so don't close it
  - More reasons to keep port 80 open: [letsencrypt](https://letsencrypt.org/docs/allow-port-80/) | [blog](https://scotthelme.co.uk/why-closing-port-80-is-bad-for-security/)
- certbot should auto-renew. To confirm it'll work, run:
  `certbot renew --dry-run`
- `systemctl list-timers` <-- see when certbot runs

# Scripts

Make deploy scripts executable for quicker future updates:

```
chmod +x path/to/web.deploy.sh
chmod +x path/to/backend.deploy.sh
```

# References

Interactive Nginx config setup | [DigitalOcean](https://www.digitalocean.com/community/tools/nginx)
