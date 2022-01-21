# Usage

Info on how to maintain the production environment
Do everything in `setup.md` before trying these things.

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

## Other

Helpful commands: `ufw -h` or `ufw status` <-- the nginx firewall setup

### Google sync updates:

Google's Oauth servers call a redirect URI after auth has completed

- Those URIs are specified in GCP > APIs & Services > Credentials > Compass Calendar Backend
- More info in `flow.gcal.sync.md`

# References:

- Backend repo is based on [this api blog](https://www.toptal.com/express-js/nodejs-typescript-rest-api-pt-1)
- Another [oauth api blog](https://auth0.com/blog/node-js-and-typescript-tutorial-build-a-crud-api/)
