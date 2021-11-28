## Stack

ajv: dynamic type validation [ref](https://blog.logrocket.com/dynamic-type-validation-in-typescript/)

## How `***REMOVED***` works

### Oauth, SSL:

nginx, Google Cloud Compute Engine, backend code

certificate installed with certbot+letsencrypt

- certbot supposedly will auto-renew, but verify this works.
- previously, the VM's nginx firewall was set to block HTTP. certbot renews the cert using the HTTP endpoint, so allowing HTTP requests allowed certbot to auto-renew
- tip if running into HTTP cert expired error: type `thisisunsafe` in chrome window, which should bypass the error

server must run on 3000 so nginx proxy works

Google's Oauth servers call a redirect URI after auth has completed

- Those URIs are specified in GCP > APIs & Services > Credentials > Compass Calendar Backend

### References:

- Backend repo is based on [this blog](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1)
- Another [reference](https://auth0.com/blog/node-js-and-typescript-tutorial-build-a-crud-api/)
- nginx location: `/etc/nginx`
- nginx logs: `/var/log/nginx/{error|access}.log`

## Usage

### SSH into VM and run:

```
sudo su
pm2 start $version --watch
pm2 logs $version
```

### Making changes:

push local changes to `compass-backend` repo

sign into cloud VM and run:

```
cd /$version
git pull  # or `get pull origin <branch>` if not using `main`
pm2 restart $version #if pm2 not in watch mode already
)
or: `node dist/app.js`
```

## Troubleshooting

502 bad gateway when calling {redirect URI}

- Verify backend code is running
- Review nginx and backend logs

Other troubleshooting ideas:

- Make sure production `.env` matches your dev `.env`
